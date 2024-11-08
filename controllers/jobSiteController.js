const { Pool } = require("pg");
const axios = require("axios");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");
const { insertJobSiteTracking, selectJobSiteTracking, updateJobSiteTracking, pool } = require("../db");

// Set up nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Subscribe to job site
exports.subscribeJobSite = async (req, res) => {
  const client = await pool.connect();
  const { email, siteUrl, ownerId } = req.body;
  let initialJobCount = 0;

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    const response = await axios.get(siteUrl);
    const $ = cheerio.load(response.data);

    if (siteUrl.includes("greenhouse.io")) {
      // For Greenhouse, check for 'opening' in <div> or 'job-post' in <tr>
      initialJobCount = $("div.opening").length || $("tr.job-post").length;
  } else if (siteUrl.includes("smartrecruiters.com")) {
      // For SmartRecruiters, ensure 'opening-job' is in an <li> element
      initialJobCount = $("li.opening-job").length;
  } else if (siteUrl.includes("zohorecruit.com")) {
    // For ZohoRecruit, check for job count in specific formats
    const jobCountText = $("span.job-count").text().match(/(\d+)\s+Jobs/);
    if (jobCountText && jobCountText[1]) {
        // Get job count from the '20 Jobs' text format
        initialJobCount = parseInt(jobCountText[1], 10);
    } else {
        // Fallback: count <td> elements containing <a> with class 'jobdetail'
        initialJobCount = $("tr.jobDetailRow td:has(a.jobdetail)").length;
    }
  } else if (siteUrl.includes("seamlesshiring.com")) {
    // For SeamlessHiring, parse job count from button text
    const jobCountText = $("#dropdownMenuButton").text().match(/of\s+(\d+)/);
    if (jobCountText && jobCountText[1]) {
        // Extract job count from 'Showing 1 to blah of num' format
        initialJobCount = parseInt(jobCountText[1], 10);
    }
  } else {
    return res.status(400).json({ error: "Unsupported site" });
  }
  
    await insertJobSiteTracking(client, email, siteUrl, ownerId, initialJobCount);

    // Send email notification after successful subscription
    const subMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOT_EMAIL, 
      subject: 'New Job Site Subscription',
      text: `A new user has subscribed to Job Site tracking.}.`,
    };

    // Send email without affecting subscription logic
    transporter.sendMail(subMailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email: ", error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.status(200).json({ message: "Subscribed to job site updates successfully." });
  }  catch (error) {
    console.error("Error subscribing to job site:", error);
    res.status(500).json({ error: "Failed to subscribe to job site." });
  } finally {
    client.release();
  }
};


// Check job postings for each subscribed site
exports.checkJobSites = async () => {
  const client = await pool.connect();
  const jobSites = await selectJobSiteTracking(client);

  for (const jobSite of jobSites) {
    const { _id, site_url: siteUrl, email, last_job_count: lastJobCount } = jobSite;
    let jobCount = 0;

    try {
      const response = await axios.get(siteUrl);
      const $ = cheerio.load(response.data);

      if (siteUrl.includes("greenhouse.io")) {
        // For Greenhouse, check for 'opening' in <div> or 'job-post' in <tr>
        jobCount = $("div.opening").length || $("tr.job-post").length;
    } else if (siteUrl.includes("smartrecruiters.com")) {
        // For SmartRecruiters, ensure 'opening-job' is in an <li> element
        jobCount = $("li.opening-job").length;
    } else if (siteUrl.includes("zohorecruit.com")) {
      // For ZohoRecruit, check for job count in specific formats
      const jobCountText = $("span.job-count").text().match(/(\d+)\s+Jobs/);
      if (jobCountText && jobCountText[1]) {
          // Get job count from the '20 Jobs' text format
          jobCount = parseInt(jobCountText[1], 10);
      } else {
          // Fallback: count <td> elements containing <a> with class 'jobdetail'
          jobCount = $("tr.jobDetailRow td:has(a.jobdetail)").length;
      }
    } else if (siteUrl.includes("seamlesshiring.com")) {
      // For SeamlessHiring, parse job count from button text
      const jobCountText = $("#dropdownMenuButton").text().match(/of\s+(\d+)/);
      if (jobCountText && jobCountText[1]) {
          // Extract job count from 'Showing 1 to blah of num' format
          jobCount = parseInt(jobCountText[1], 10);
      }
    } else {
      console.error(`Unsupported site URL: ${siteUrl}`);
      continue; 
    }
    
    if (jobCount < lastJobCount) {
        // Update the job count without notification if job count decreased
        await updateJobSiteTracking(client, _id, jobCount);
      } else if (jobCount > lastJobCount) {
        // Send notification and update job count if there are new job postings
        await exports.notifyUser(email, siteUrl, jobCount - lastJobCount);
        await updateJobSiteTracking(client, _id, jobCount);
      }
    } catch (error) {
      console.error(`Error checking jobs on ${siteUrl}:`, error);
    }
  }
  client.release();
};

// Send notification email to job site user
exports.notifyUser = async (email, siteUrl, jobDifference) => {
  const unsubscribeLink = `https://emptycodes.wixstudio.io/nodulling/unsubscribe?type=job_site&email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Job Site Update Notification",
    text: `There are ${jobDifference} new job postings on ${siteUrl}. Check it out!\n\nIf you wish to unsubscribe, click here: ${unsubscribeLink}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Job Site Update Notification sent to ${email} for ${siteUrl}`);
  } catch (error) {
    console.error("Error sending job site update notification email:", error);
  }
};