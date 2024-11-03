const nodemailer = require("nodemailer");
const axios = require("axios");
const cheerio = require('cheerio');
const { retryTxn, insertGitHubRepoTracking, selectGitHubRepoTracking, updateGitHubRepoTracking, deleteGitHubRepoTracking } = require("../db");
const pool = require("../db").pool; // Ensure to import the pool from your db.js

// Transporter for sending email notifications
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Subscribe to a GitHub repository
exports.createGitHubRepoTracking = async (req, res) => {
  const { email, repoUrl, ownerId } = req.body;

  if (!email || !repoUrl || !ownerId) {
    return res.status(400).json({ error: "Email, repository URL, and owner are required." });
  }

  try {
    await retryTxn(async (client) => {
      // Check if the repo URL already exists
      const existingRepos = await selectGitHubRepoTracking(client);
      const repoExists = existingRepos.some(repo => repo.repo_url === repoUrl && repo.email === email);

      if (repoExists) {
        return res.status(409).json({ error: "You are already subscribed to this repository." });
      }

      // Insert new subscription
      await insertGitHubRepoTracking(client, email, repoUrl, ownerId);
      res.status(201).json({ message: "Successfully subscribed to GitHub repository." });
    });
  } catch (error) {
    console.error("Error subscribing to GitHub repo:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Retrieve all GitHub repo tracking subscriptions
exports.getGitHubRepoTracking = async (req, res) => {
  try {
    const data = await retryTxn(async (client) => selectGitHubRepoTracking(client));
    res.status(200).json(data);
  } catch (error) {
    console.error("Error retrieving GitHub repo tracking:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Update GitHub repo tracking
exports.updateGitHubRepoTracking = async (req, res) => {
    const { id } = req.params;
    const { newIssueCount, newClosedCount } = req.body;
  
    if (newIssueCount === undefined || newClosedCount === undefined) {
      return res.status(400).json({ error: "New issue and closed count are required." });
    }
  
    try {
      await retryTxn(async (client) => updateGitHubRepoTracking(client, id, newIssueCount, newClosedCount));
      res.status(200).json({ message: "GitHub repo tracking updated." });
    } catch (error) {
      console.error("Error updating GitHub repo tracking:", error);
      res.status(500).json({ error: "Error updating GitHub repo tracking." });
    }
  };


// Delete GitHub repo tracking
exports.deleteGitHubRepoTracking = async (req, res) => {
  const { id } = req.params;

  try {
    await retryTxn(async (client) => deleteGitHubRepoTracking(client, id));
    res.status(200).json({ message: "GitHub repo tracking updated." });
  } catch (error) {
    console.error("Error deleting GitHub repo tracking:", error);
    res.status(500).json({ error: "Error deleting GitHub repo tracking." });
  }
};

// Function to check GitHub repositories for new issues
exports.checkGitHubRepos = async () => {
  const repos = await retryTxn(async (client) => selectGitHubRepoTracking(client));

  for (const repo of repos) {
    try {
      // Fetch the issues page HTML
      const response = await axios.get(repo.repo_url);
      const html = response.data;
      const $ = cheerio.load(html);

      // Extract the number of open and closed issues
      const openIssuesText = $('.table-list-header-toggle.states.flex-auto a.btn-link.selected').text().trim();
      const closedIssuesText = $('.table-list-header-toggle.states.flex-auto a.btn-link').not('.selected').text().trim();

      const openIssueCount = parseInt(openIssuesText.split(' ')[0].replace(',', ''), 10);
      const closedIssueCount = parseInt(closedIssuesText.split(' ')[0].replace(',', ''), 10);

      // Compare with last counts
      if (openIssueCount > repo.last_issue_count) {
        // New open issue has been added
        await notifySubscribers(repo.email, openIssueCount - repo.last_issue_count);
      } else if (openIssueCount < repo.last_issue_count && closedIssueCount > repo.last_closed_count) {
        // An issue has been closed
        const closedDifference = closedIssueCount - repo.last_closed_count;
        const openDifference = repo.last_issue_count - openIssueCount;

        // Check if the decrease in open issues matches the increase in closed issues
        if (openDifference === closedDifference) {
          // Update the counts in the database
          await retryTxn(async (client) => 
            updateGitHubRepoTracking(client, repo._id, openIssueCount, closedIssueCount)
          );
        }
      }

      // Update the counts in the database
      await retryTxn(async (client) => updateGitHubRepoTracking(client, repo._id, openIssueCount, closedIssueCount));
      
    } catch (error) {
      console.error(`Error checking repository ${repo.repo_url}:`, error.message);
    }
  }
};

async function notifySubscribers(email, newIssues) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "New GitHub Issues Alert",
      text: `There are ${newIssues} new issues in your subscribed GitHub repository.`,
    };
  
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await transporter.sendMail(mailOptions);
        console.log("Notification sent to subscriber:", email);
        break; // Exit loop on success
      } catch (error) {
        console.error("Error sending email notifications:", error);
        if (attempt === 2) {
          // Log final failure after last attempt
          console.error(`Failed to send notification to ${email} after 3 attempts.`);
        }
      }
    }
  }
