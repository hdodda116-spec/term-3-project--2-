const express = require("express");
const router = express.Router();
const { getMessages } = require("../controllers/chatController");

// Example API route
router.get("/", getMessages);

module.exports = router;