const express = require("express");
const cors = require("cors");
const chatRoutes = require("./src/routes/chatroute");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/chat", chatRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

module.exports = app;