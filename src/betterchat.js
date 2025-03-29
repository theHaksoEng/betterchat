require("dotenv").config();
const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const axios = require("axios");
const OpenAI = require("openai");
const { ElevenLabsClient } = require("elevenlabs");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const upload = multer({ dest: "uploads/" });
const port = 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
let chatHistory = [];

app.use(express.json());

// Endpoint to handle audio upload, transcription, and response
app.post("/chat", upload.single("audio"), async (req, res) => {
  try {
    const audioPath = req.file.path;

    // Transcribe audio with OpenAI Whisper
    const formData = new FormData();
    formData.append("file", fs.createReadStream(audioPath));
    formData.append("model", "whisper-1");
    const transcriptionResponse = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...formData.getHeaders() } }
    );
    const transcribedText = transcriptionResponse.data.text;

    // Generate chat response
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
    chatHistory.push({ role: "user", content: transcribedText }, { role: "assistant", content: chatResponseText });

    // Generate audio with ElevenLabs
    const audioStream = await elevenlabs.generate({
      voice: "YOUR_CLONED_VOICE_ID", // Replace with your cloned voice ID
      text: chatResponseText,
      model_id: "eleven_monolingual_v1",
    });

    // Log to Chatbase (optional)
    await axios.post(
      "https://api.chatbase.co/v1/chat",
      {
        chatbotId: "YOUR_CHATBASE_ID",
        message: { role: "user", content: transcribedText },
        response: { role: "assistant", content: chatResponseText },
      },
      { headers: { Authorization: `Bearer ${process.env.CHATBASE_API_KEY}` } }
    );

    // Send response back to client
    res.set("Content-Type", "audio/mpeg");
    audioStream.pipe(res);

    // Clean up uploaded file
    fs.unlinkSync(audioPath);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3000; // Use environment variable or default to port 3000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
