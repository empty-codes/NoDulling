const nodemailer = require("nodemailer");
const axios = require("axios");
const cheerio = require('cheerio');
const { insertGitHubRepoTracking, selectGitHubRepoTracking, updateGitHubRepoTracking, deleteGitHubRepoTracking, pool } = require("../db");

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

  if (!email || !repoUrl) {
    return res.status(400).json({ error: "Email and repository URL are required." });
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  const client = await pool.connect();
  try {
    // Check if the repo URL already exists
    const existingRepos = await selectGitHubRepoTracking(client);
    const repoExists = existingRepos.some(repo => repo.repo_url === repoUrl && repo.email === email);

    if (repoExists) {
      return res.status(409).json({ error: "You are already subscribed to this repository." });
    }

    // Insert new subscription
    const newId = await insertGitHubRepoTracking(client, email, repoUrl, ownerId);

    // Send email notification after successful subscription
    const subMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOT_EMAIL, 
      subject: 'New Github Subscription',
      text: `A new user has subscribed to Github Issue tracking.}.`,
    };

    // Send email without affecting subscription logic
    transporter.sendMail(subMailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email: ", error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    // Fetch the current issue counts
    const issuesUrl = `${repoUrl}/issues`;
    const response = await axios.get(issuesUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract open and closed issues count
    const openIssuesText = $('a[data-ga-click="Issues, Table state, Open"]').text().trim();
    const closedIssuesText = $('a[data-ga-click="Issues, Table state, Closed"]').text().trim();

    const openIssueCount = parseInt(openIssuesText.split(' ')[0].replace(',', ''), 10);
    const closedIssueCount = parseInt(closedIssuesText.split(' ')[0].replace(',', ''), 10);

    // Update the record with the fetched counts
    await updateGitHubRepoTracking(client, newId, openIssueCount, closedIssueCount);

    res.status(201).json({ message: "Successfully subscribed to GitHub repository." });
  } catch (error) {
    console.error("Error subscribing to GitHub repo:", error);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    client.release();
  }
};

// Retrieve all GitHub repo tracking subscriptions
exports.getGitHubRepoTracking = async (req, res) => {
    const client = await pool.connect();
    try {
      const data = await selectGitHubRepoTracking(client);
      res.status(200).json(data);
    } catch (error) {
      console.error("Error retrieving GitHub repo tracking:", error);
      res.status(500).json({ error: "Internal server error." });
    } finally {
      client.release();
    }
  };

// Update GitHub repo tracking
exports.updateGitHubRepoTracking = async (req, res) => {
    const { id } = req.params;
    const { newIssueCount, newClosedCount } = req.body;
  
    if (newIssueCount === undefined || newClosedCount === undefined) {
      return res.status(400).json({ error: "New issue and closed count are required." });
    }
  
    const client = await pool.connect();
    try {
      await updateGitHubRepoTracking(client, id, newIssueCount, newClosedCount);
      res.status(200).json({ message: "GitHub repo tracking updated." });
    } catch (error) {
      console.error("Error updating GitHub repo tracking:", error);
      res.status(500).json({ error: "Error updating GitHub repo tracking." });
    } finally {
      client.release();
    }
  };


// Delete GitHub repo tracking
exports.deleteGitHubRepoTracking = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await deleteGitHubRepoTracking(client, id);
    res.status(200).json({ message: "GitHub repo tracking deleted." });
  } catch (error) {
    console.error("Error deleting GitHub repo tracking:", error);
    res.status(500).json({ error: "Error deleting GitHub repo tracking." });
  } finally {
    client.release();
  }
};

// Function to check GitHub repositories for new issues
exports.checkGitHubRepos = async () => {
  const client = await pool.connect();
  try {
    const repos = await selectGitHubRepoTracking(client);

    for (const repo of repos) {
        try {
        const issuesUrl = `${repo.repo_url}/issues`;
        
        // Fetch the issues page HTML
        const response = await axios.get(issuesUrl);
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
            await notifySubscribers(repo.email, openIssueCount - repo.last_issue_count, issuesUrl);
        } else if (openIssueCount < repo.last_issue_count && closedIssueCount > repo.last_closed_count) {
            // An issue has been closed
            const closedDifference = closedIssueCount - repo.last_closed_count;
            const openDifference = repo.last_issue_count - openIssueCount;

            // Check if the decrease in open issues matches the increase in closed issues
            if (openDifference === closedDifference) {
            // Update the counts in the database
            await updateGitHubRepoTracking(client, repo._id, openIssueCount, closedIssueCount);
            }
        }

        // Update the counts in the database
        await updateGitHubRepoTracking(client, repo._id, openIssueCount, closedIssueCount);
        } catch (error) {
            console.error(`Error checking repository ${repo.repo_url}:`, error.message);
        }
      } 
    } catch (error) {
        console.error("Error retrieving GitHub repos for checking:", error);
    } finally {
        client.release();
    }
};

// Send email notifications to GitHub issue subscribers
async function notifySubscribers(email, newIssues, issuesUrl) {
  const unsubscribeLink = `https://emptycodes.wixstudio.io/nodulling/unsubscribe?type=github&email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "New GitHub Issues Alert",
    text: `There are ${newIssues} new issues in your subscribed GitHub repository: ${issuesUrl}.\n\nIf you wish to unsubscribe, click here: ${unsubscribeLink}`,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      console.log("GitHub Issue Notification sent to subscriber:", email);
      break;
    } catch (error) {
      console.error("Error sending GitHub issue email notification:", error);
      if (attempt === 2) {
        console.error(`Failed to send GitHub issue notification to ${email} after 3 attempts.`);
      }
    }
  }
}


