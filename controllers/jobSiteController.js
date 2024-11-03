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
        jobCount = $(".opening").length;
      } else if (siteUrl.includes("myworkdayjobs.com")) {
        jobCount = parseInt($("[data-automation-id='jobFoundText']").text().match(/\d+/)[0]);
      } else if (siteUrl.includes("smartrecruiters.com")) {
        jobCount = $(".opening-job").length;
      } else if (siteUrl.includes("zohorecruit.com")) {
        jobCount = $("[class^='cw-'][class*='-title']").length;
      } else if (siteUrl.includes("bamboohr.com")) {
        jobCount = $("a[class^='jss-f']").length;
      } else if (siteUrl.includes("seamlesshiring.com")) {
        jobCount = $(".jobs-display").length;
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


