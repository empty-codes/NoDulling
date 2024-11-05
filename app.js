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
cron.schedule("0 * * * *", async () => {
  if (isJobRunning) return; 
  isJobRunning = true;
  
  try {
    await delay();
    await checkGitHubRepos();
  } finally {
    isJobRunning = false; 
  }
});

// Schedule the job site check every 23.7 hours
cron.schedule("*/1422 * * * *", async () => {
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