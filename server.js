require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Node 18+ has global.fetch. If your runtime is older, fall back to node-fetch.
const fetch = global.fetch || require("node-fetch");

const app = express();

// CORS for your frontend (keep tight, but allow localhost for dev too)
app.use(cors({
  origin: [
    "https://theinternetisdead.org",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

app.use(express.json());
app.use(express.static(__dirname));

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.2";

/**
 * POST /chat
 * Body: { messages: [{role, content}, ...] }
 * Returns: { content: string, request_id?: string }
 */
app.post("/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        content: "Server misconfigured: OPENAI_API_KEY is missing on the server."
      });
    }

    let messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    messages = messages.slice(-30);

    // Send structured chat messages to the Responses API (no prompt-flattening needed).
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        input: messages
      })
    });

    const requestId =
      upstream.headers.get("x-request-id") ||
      upstream.headers.get("request-id") ||
      null;

    const data = await upstream.json();

    // Log status + request id so you can prove the call happened in Render logs
    console.log("OPENAI STATUS:", upstream.status, "REQ_ID:", requestId);
    // Keep the full payload available when debugging, but not too spammy by default.
    if (process.env.DEBUG_OPENAI === "1") {
      console.log("RAW API RESPONSE:", JSON.stringify(data, null, 2));
    }

    if (!upstream.ok) {
      // Surface the upstream error clearly in the UI
      const msg =
        data?.error?.message ||
        data?.message ||
        `OpenAI error (HTTP ${upstream.status})`;
      return res.status(502).json({ content: msg, request_id: requestId });
    }

    const content =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output_text ||
      "(No text returned by model)";

    res.json({ content, request_id: requestId });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ content: "Server exploded." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
