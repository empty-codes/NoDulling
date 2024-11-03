const express = require("express");
const router = express.Router();
const nyscController = require("../controllers/nyscController");

router.post("/subscribe/nysc", nyscController.createNYSCTracking);
//router.get("/", nyscController.getNYSCTracking);
//router.put("/:id", nyscController.updateNYSCTracking);
//router.delete("/:id", nyscController.deleteNYSCTracking);

module.exports = router;