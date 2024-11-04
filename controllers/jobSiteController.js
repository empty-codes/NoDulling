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
  const { email, siteUrl, ownerId } = req.body;

  try {
    const client = await pool.connect();
    await insertJobSiteTracking(client, email, siteUrl, ownerId);
    client.release();
    res.status(200).json({ message: "Subscribed to job site updates successfully." });
  } catch (error) {
    console.error("Error subscribing to job site:", error);
    res.status(500).json({ error: "Failed to subscribe to job site." });
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
    } else if (siteUrl.includes("myworkdayjobs.com")) {
        // For MyWorkdayJobs, look for job count inside a <p> element
        jobCount = parseInt($("p[data-automation-id='jobFoundText']").text().match(/\d+/)[0]);
    } else if (siteUrl.includes("smartrecruiters.com")) {
        // For SmartRecruiters, ensure 'opening-job' is in an <li> element
        jobCount = $("li.opening-job").length;
    } else if (siteUrl.includes("zohorecruit.com")) {
        // For ZohoRecruit, ensure class with 'cw-' and '-title' is inside an <a> element
        jobCount = $("a[class^='cw-'][class*='-title']").length;
    } else if (siteUrl.includes("bamboohr.com")) {
        jobCount = $("a[class^='jss-f']").length;
    } else if (siteUrl.includes("seamlesshiring.com")) {
        // For SeamlessHiring, ensure 'jobs-display' is in a <div> element
        jobCount = $("div.jobs-display").length;
    }
    

      if (jobCount !== lastJobCount) {
        await exports.notifyUser(email, siteUrl, jobCount - lastJobCount);
        await updateJobSiteTracking(client, _id, jobCount);
      }
    } catch (error) {
      console.error(`Error checking jobs on ${siteUrl}:`, error);
    }
  }

  client.release();
};

// Send notification email to user
exports.notifyUser = async (email, siteUrl, jobDifference) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Job Site Update Notification",
    text: `There are ${jobDifference} new job postings on ${siteUrl}. Check it out!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Notification sent to ${email} for ${siteUrl}`);
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
};


