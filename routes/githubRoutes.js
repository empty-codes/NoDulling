const express = require("express");
const router = express.Router();
const githubController = require("../controllers/githubController");

router.post("/subscribe/github", githubController.createGitHubRepoTracking );

module.exports = router;
