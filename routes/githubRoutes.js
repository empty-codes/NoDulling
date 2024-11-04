const express = require("express");
const router = express.Router();
const githubController = require("../controllers/githubController");

router.post("/", githubController.createGitHubRepoTracking );

module.exports = router;
