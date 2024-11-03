const express = require("express");
const router = express.Router();
const githubController = require("../controllers/githubController");

router.post("/", githubController.subscribeToGitHubRepo);

module.exports = router;
