// Import the necessary modules
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
const fs = require("fs");

const app = express();
const port = 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let chatHistory = [];

app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to BetterChat! The chatbot that improves conversations.");
});

// Additional routes
app.get("/about", (req, res) => {
  res.send("BetterChat is a chatbot application designed to enhance communication.");
});

app.get("/contact", (req, res) => {
  res.send("Reach out to us at contact@betterchat.com.");
});

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Serve static files (optional, if you have a 'public' folder)
app.use(express.static("public"));

// Chat endpoint to handle text input
app.post("/chat", async (req, res) => {
  try {
    const transcribedText = req.body.text; // Get text from frontend

    // Generate chat response with OpenAI
    const messages = [
      { role: "system", content: "You are a helpful assistant providing concise responses in at most two sentences." },
      ...chatHistory,
      { role: "user", content: transcribedText },
    ];
    const chatResponse = await openai.chat.completions.create({
      messages,
      model: "gpt-3.5-turbo",
    });
    const chatResponseText = chatResponse.choices[0].message.content;

    // Update chat history
    chatHistory.push(
      { role: "user", content: transcribedText },
      { role: "assistant", content: chatResponseText }
    );

    // Send text response back to client
    res.json({ text: chatResponseText });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Start the server
const PORT = process.env.PORT || 3000; // Use environment variable for Render compatibility
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).send("This route does not exist.");
});