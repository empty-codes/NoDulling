const express = require("express");
const router = express.Router();
const jobSiteController = require("../controllers/jobSiteController");

router.post("/", jobSiteController.subscribeJobSite);

module.exports = router;
