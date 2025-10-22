import express from "express";
import axios from "axios";
import TelegramBot from "node-telegram-bot-api";

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SHEETS_WEBHOOK = "https://script.google.com/macros/s/AKfycbwCMIcWUOP_BYQYr3fpSIVxDwEq8KY3LvUldpDDc12b69wi70Yet2-x8X9wpDd-0AJpNA/exec";
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://your-local-url.ngrok.io";

// === Helper: Log to Google Sheets ===
async function logToSheets(step, details) {
  try {
    await axios.post(SHEETS_WEBHOOK, { type: "log", step, details });
    console.log(`📘 [LOG] ${step}: ${details}`);
  } catch (err) {
    console.error("❌ Failed to log to Sheets:", err.message);
  }
}

// === Initialize Bot (Webhook Mode) ===
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
const webhookPath = `/webhook/${TELEGRAM_BOT_TOKEN}`;
const webhookUrl = `${BASE_URL}${webhookPath}`;

(async () => {
  try {
    await bot.setWebHook(webhookUrl);
    console.log(`✅ Webhook set to ${webhookUrl}`);
    await logToSheets("Bot Webhook", `Webhook set to ${webhookUrl}`);
  } catch (err) {
    console.error("❌ Failed to set webhook:", err.message);
    await logToSheets("Webhook Error", err.message);
  }
})();

// === Express endpoint to receive Telegram updates ===
app.post(webhookPath, async (req, res) => {
  try {
    await bot.processUpdate(req.body);

    const msg = req.body.message;
    if (msg) {
      console.log("💬 New message:", msg.text);

      // Send to Google Sheets
      await axios.post(SHEETS_WEBHOOK, {
        type: "telegram_message",
        chatId: msg.chat.id,
        username: msg.from?.username || msg.from?.first_name || "Unknown",
        text: msg.text,
        date: new Date().toISOString(),
      });

      await logToSheets("New Telegram Message", `${msg.from?.username}: ${msg.text}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error processing update:", err.message);
    await logToSheets("Processing Error", err.message);
    res.sendStatus(500);
  }
});

// === Healthcheck ===
app.get("/health", async (req, res) => {
  await logToSheets("Healthcheck", "Ping received");
  res.json({ ok: true, message: "Webhook bot operational ✅" });
});

// === Start server (for local dev) ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
