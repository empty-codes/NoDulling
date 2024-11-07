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

// // In deployment cron jobs don't run
// const jobQueue = [];

// // Add a new job to the queue
// const enqueueJob = (job) => {
//   jobQueue.push(job);
//   if (jobQueue.length === 1) {
//     runNextJob();
//   }
// };

// const runNextJob = async () => {
//   if (jobQueue.length === 0) return;

//   const job = jobQueue[0];
//   try {
//     await job();
//   } finally {
//     jobQueue.shift(); // Remove the job from the queue
//     if (jobQueue.length > 0) {
//       runNextJob(); // Run the next job if there is one
//     }
//   }
// };

// // Use enqueueJob to add jobs
// cron.schedule("*/9 * * * *", () => enqueueJob(checkNYSCRegistrationPage));
// cron.schedule("11 */1 * * *", () => enqueueJob(checkGitHubRepos));
// cron.schedule("*/1422 * * * *", () => enqueueJob(checkJobSites));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});