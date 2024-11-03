const express = require("express");
const cron = require("node-cron");
const app = express();

const nyscRoutes = require("./routes/nyscRoutes");
const githubRoutes = require("./routes/githubRoutes");
const jobSiteRoutes = require("./routes/jobSiteRoutes");
const { checkNYSCRegistrationPage } = require("./controllers/nyscController");

app.use(express.json());
app.use("/subscribe/nysc", nyscRoutes);
app.use("/subscribe/github", githubRoutes);
app.use("/subscribe/jobs", jobSiteRoutes);

// Schedule to check the NYSC registration page every 10 minutes
cron.schedule("*/10 * * * *", () => {
  checkNYSCRegistrationPage();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});