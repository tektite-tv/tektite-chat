require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = global.fetch;

const app = express();

// CORS for your frontend
app.use(cors({
  origin: "https://theinternetisdead.org",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

app.use(express.json());
app.use(express.static(__dirname));

const API_KEY = process.env.OPENAI_API_KEY;

app.post("/chat", async (req, res) => {
  try {
    let messages = req.body.messages || [];
    messages = messages.slice(-30);

    // FIX: flatten messages into a single prompt
    const prompt = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt
      })
    });

    const data = await response.json();

    // DEBUG LOG
    console.log("RAW API RESPONSE:", JSON.stringify(data, null, 2));

    const content =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      "(still no response 😐)";

    res.json({ content });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ content: "Server exploded." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
