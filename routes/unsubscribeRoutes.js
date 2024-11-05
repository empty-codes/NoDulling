const express = require('express');
const router = express.Router();
const unsubscribeController = require('../controllers/unsubscribeController');

// Define the route for unsubscribing
router.post('/', unsubscribeController.unsubscribeUser);

module.exports = router;
