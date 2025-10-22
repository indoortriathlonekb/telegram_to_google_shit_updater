import express from "express";
import axios from "axios";
import TelegramBot from "node-telegram-bot-api";

const app = express();
app.use(express.json());

// === CONFIG ===
const TELEGRAM_BOT_TOKEN = "8329496321:AAF3dF2dAc2yu1x3nFja_XyF0Y0VS0Dsi5k";
const TELEGRAM_CHAT_ID = "@IndoorTriathlonRegistrations";
const SHEETS_WEBHOOK =
  "https://script.google.com/macros/s/AKfycbwCMIcWUOP_BYQYr3fpSIVxDwEq8KY3LvUldpDDc12b69wi70Yet2-x8X9wpDd-0AJpNA/exec";

// Determine public base URL (Vercel sets this env automatically)
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

// === Telegram Bot Setup ===
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { webHook: true });
const webhookPath = `/api/server/webhook/${TELEGRAM_BOT_TOKEN}`;
const webhookUrl = `${BASE_URL}${webhookPath}`;

(async () => {
  try {
    await bot.setWebHook(webhookUrl);
    console.log(`🤖 Telegram bot webhook set to: ${webhookUrl}`);
    await logToSheets("Bot Startup", `Webhook set: ${webhookUrl}`);
  } catch (err) {
    console.error("❌ Failed to set webhook:", err.message);
    await logToSheets("Startup Error", err.message);
  }
})();

// === Helper: Log to Google Sheets ===
async function logToSheets(step, details) {
  try {
    await axios.post(SHEETS_WEBHOOK, {
      lastName: "Bot",
      firstName: "Logger",
      email: "bot@system.local",
      paymentId: `log-${Date.now()}`,
      status: step,
      about: details
    });
    console.log(`🧾 Logged to Sheets → ${step}: ${details}`);
  } catch (err) {
    console.error("❌ logToSheets error:", err.message);
  }
}

// === Telegram Webhook Endpoint ===
app.post(`/api/server/webhook/${TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    console.log("📥 Telegram message:", msg.text);

    // Only track messages from your group
    if (
      msg.chat.username !== "IndoorTriathlonRegistrations" &&
      msg.chat.title !== "IndoorTriathlonRegistrations"
    ) {
      console.log("📭 Ignored (not target group)");
      return res.sendStatus(200);
    }

    const payload = {
      lastName: "Telegram",
      firstName: "User",
      email: "from.telegram@bot",
      paymentId: "tg-" + msg.message_id,
      amount: "",
      status: "Message Logged",
      about: msg.text
    };

    const resp = await axios.post(SHEETS_WEBHOOK, payload);
    console.log("📤 Sent to Sheets:", resp.data);
    await logToSheets("Telegram → Sheets", `Message ID: ${msg.message_id}`);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    await logToSheets("Webhook Error", err.message);
    res.sendStatus(500);
  }
});

// === Healthcheck Route ===
app.get("/api/server/health", async (req, res) => {
  try {
    const ping = await axios.get(`${SHEETS_WEBHOOK}?healthcheck=true`);
    console.log("✅ Healthcheck OK");
    await logToSheets("Healthcheck", "Bot + Sheets OK");
    res.json({ ok: true, ping: ping.data, time: new Date().toISOString() });
  } catch (err) {
    console.error("❌ Healthcheck failed:", err.message);
    await logToSheets("Healthcheck Error", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === Mock Registration (for testing) ===
app.get("/api/server/mock-register", async (req, res) => {
  const mock = {
    lastName: "Иванов",
    firstName: "Иван",
    club: "Fast Swim",
    city: "Москва",
    phone: "79261234567",
    gender: "мужской",
    email: "ivan@example.com",
    stages: ["Этап 1 — Indoor triathlon 23.11.25"],
    amount: "100.00",
    paymentId: "testpay" + Math.floor(Math.random() * 10000),
    status: "Ожидает оплату",
    about: "Тестовая регистрация через mock API"
  };

  try {
    const resp = await axios.post(SHEETS_WEBHOOK, mock);
    console.log("📤 Mock sent:", resp.data);
    await logToSheets("Mock Registration", JSON.stringify(mock));
    res.json({ ok: true, data: resp.data });
  } catch (err) {
    console.error("❌ Mock error:", err.message);
    await logToSheets("Mock Error", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Export for Vercel
export default app;
