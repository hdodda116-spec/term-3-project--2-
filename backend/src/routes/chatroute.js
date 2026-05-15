const express = require("express");
const router = express.Router();
const { getMessages } = require("../controllers/chatcontroller");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Example API route
router.get("/", getMessages);

// AI Correction route
router.post("/fix", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `You are a helpful AI assistant that corrects spelling and grammar, and improves sentence formation.
Please rewrite the following message to be clear, grammatically correct, and professional, while keeping its original meaning. Do not add any extra commentary, just return the corrected text.
Original message: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const correctedText = response.text().trim();

    // Sometimes the model returns quotes around the text, we can remove them if they exist
    let cleanedText = correctedText;
    if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
      cleanedText = cleanedText.substring(1, cleanedText.length - 1);
    }

    res.json({ correctedText: cleanedText });
  } catch (error) {
    console.error("Error with AI correction:", error);
    res.status(500).json({ error: "Failed to correct text" });
  }
});

module.exports = router;