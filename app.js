require('dotenv').config();

const express = require("express");
const cron = require("node-cron");
const cors = require("cors");
const app = express();

const nyscRoutes = require("./routes/nyscRoutes");
const githubRoutes = require("./routes/githubRoutes");
const jobSiteRoutes = require("./routes/jobSiteRoutes");
const unsubscribeRoutes = require('./routes/unsubscribeRoutes');

const { checkNYSCRegistrationPage } = require("./controllers/nyscController");
const { checkGitHubRepos } = require("./controllers/githubController");
const { checkJobSites } = require("./controllers/jobSiteController");

module.exports = app;

app.use(cors());
app.use(express.json());
//app.use(express.static(__dirname + '/public'));
app.use("/subscribe/nysc", nyscRoutes);
app.use("/subscribe/github", githubRoutes);
app.use("/subscribe/jobs", jobSiteRoutes);
app.use("/unsubscribe", unsubscribeRoutes);
app.use(express.static('routes'));

// GET / route to serve HTML instructions
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Documentation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            h1 { color: #333; }
            code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>Welcome to the NoDulling API</h1>
        <p>This API supports the following endpoints:</p>
        <ul>
            <li>
                <strong>NYSC Registration Endpoint</strong> - <strong>POST /subscribe/nysc</strong><br>
                Accepts an <code>email</code> and adds the user to a list of subscribers for the NYSC portal registration page.
                The system checks every 9 minutes and notifies users if the registration status changes.
                <br>Request Body: <code>{"email": "user@example.com"}</code>
            </li>
            <li>
                <strong>GitHub Repository Issues Endpoint</strong> - <strong>POST /subscribe/github</strong><br>
                Accepts a <code>repoUrl</code> and <code>email</code>. The system monitors the repository for new issues every hour and notifies the subscribed user if new issues are detected.
                <br>Request Body: <code>{"repoUrl": "https://github.com/user/repo", "email": "user@example.com"}</code>
            </li>
            <li>
                <strong>Job Listings Endpoint</strong> - <strong>POST /subscribe/jobs</strong><br>
                Accepts a <code>siteUrl</code> and <code>email</code>. The system performs a daily check for job postings on the specified site and notifies the user when new listings are available.
                <br>Request Body: <code>{"siteUrl": "https://jobsite.com", "email": "user@example.com"}</code>
            </li>
        </ul>
        <p>For more information or assistance, please email nodullingnotifications@gmail.com.</p>
    </body>
    </html>
  `);
});



let isJobRunning = false;

// Helper function to introduce a random delay
const delay = () => new Promise(resolve => setTimeout(resolve, Math.random() * 10000));

// Schedule to check the NYSC registration page every 9 minutes
cron.schedule("*/9 * * * *", async () => {
  if (isJobRunning) return; // Exit if another job is already running
  isJobRunning = true;
  
  try {
    await delay();
    await checkNYSCRegistrationPage();
  } finally {
    isJobRunning = false; 
  }
});

// Schedule to check the GitHub repositories every hour
cron.schedule("*/7 * * * *", async () => {
  if (isJobRunning) return; 
  isJobRunning = true;
  
  try {
    await delay();
    await checkGitHubRepos();
  } finally {
    isJobRunning = false; 
  }
});

// Schedule the job site check every 23.7 hours (1422 mins)
cron.schedule("*/11 * * * *", async () => {
  if (isJobRunning) return; 
  isJobRunning = true;
  
  try {
    await delay();
    await checkJobSites();
  } finally {
    isJobRunning = false; 
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});