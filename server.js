import express from "express";
import axios from "axios";
import TelegramBot from "node-telegram-bot-api";

const app = express();
app.use(express.json());

// === Environment Variables ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SHEETS_WEBHOOK = "https://script.google.com/macros/s/AKfycbwCMIcWUOP_BYQYr3fpSIVxDwEq8KY3LvUldpDDc12b69wi70Yet2-x8X9wpDd-0AJpNA/exec";

// === Helper: log to Google Sheets via Apps Script ===
async function logToSheets(step, details) {
  try {
    const payload = { type: "log", step, details };
    await axios.post(SHEETS_WEBHOOK, payload);
    console.log(`📘 [LOG to Sheets] ${step}: ${details}`);
  } catch (err) {
    console.error("❌ Failed to log to Sheets:", err.message);
  }
}

// === Initialize Telegram Bot ===
let bot;
try {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  logToSheets("Bot Started", "Telegram bot initialized successfully");
  console.log("✅ Telegram bot polling started.");
} catch (err) {
  console.error("❌ Failed to start Telegram bot:", err);
  logToSheets("Bot Init Error", err.message || "Unknown bot error");
}

// === Handle incoming messages ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  try {
    console.log(`💬 New message from ${msg.from?.username || msg.from?.first_name}: ${text}`);

    // Forward the message text to Google Sheets
    await axios.post(SHEETS_WEBHOOK, {
      type: "telegram_message",
      chatId,
      username: msg.from?.username || msg.from?.first_name || "Unknown",
      text,
      date: new Date().toISOString(),
    });

    await logToSheets("New Telegram Message", `${msg.from?.username}: ${text}`);
  } catch (err) {
    console.error("❌ Failed to forward message to Sheets:", err.message);
    await logToSheets("Message Forward Error", err.message || "unknown");
  }
});

// === Healthcheck Endpoint ===
app.get("/health", async (req, res) => {
  try {
    await logToSheets("Healthcheck", "Ping received from /health");
    res.status(200).json({ ok: true, message: "Bot and Sheets logging are operational ✅" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === Error handler ===
app.use(async (err, req, res, next) => {
  console.error("❌ Server Error:", err);
  await logToSheets("Server Error", err.message || "Unknown server error");
  res.status(500).json({ error: "Internal Server Error" });
});

// === Start Express ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  logToSheets("Server Started", `Server listening on port ${PORT}`);
});
