require('dotenv').config();

const express = require("express");
const cron = require("node-cron");
const app = express();

const nyscRoutes = require("./routes/nyscRoutes");
const githubRoutes = require("./routes/githubRoutes");
const jobSiteRoutes = require("./routes/jobSiteRoutes");

const { checkNYSCRegistrationPage } = require("./controllers/nyscController");
const { checkGitHubRepos } = require("./controllers/githubController");
const { checkJobSites } = require("./controllers/jobSiteController");


app.use(express.json());
app.use("/", nyscRoutes);
app.use("/", githubRoutes);
app.use("/", jobSiteRoutes);

// Schedule to check the NYSC registration page every 10 minutes
cron.schedule("*/10 * * * *", () => {
  checkNYSCRegistrationPage();
});

// Schedule to check the GitHub repositories every hour
cron.schedule("0 * * * *", () => {
  checkGitHubRepos();
});

// Schedule the job site check every 24 hours
cron.schedule("0 0 * * *", () => {
  checkJobSites();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});