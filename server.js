 require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = global.fetch;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const API_KEY = process.env.OPENAI_API_KEY;

app.post("/chat", async (req, res) => {
  try {
    let messages = req.body.messages || [];
    messages = messages.slice(-30);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    const data = await response.json();

    const content =
      data?.output?.[0]?.content?.[0]?.text ||
      "(no response)";

    res.json({ content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ content: "Server error" });
  }
});

// FIX: Use Render's dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
