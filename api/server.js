import express from "express";
import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// === CONFIG ===
const TELEGRAM_BOT_TOKEN = "8329496321:AAF3dF2dAc2yu1x3nFja_XyF0Y0VS0Dsi5k";
const TELEGRAM_CHAT_ID = "@IndoorTriathlonRegistrations";
const SHEETS_WEBHOOK =
  "https://script.google.com/macros/s/AKfycbwCMIcWUOP_BYQYr3fpSIVxDwEq8KY3LvUldpDDc12b69wi70Yet2-x8X9wpDd-0AJpNA/exec";

const BASE_URL = "https://telegram-to-google-shit-updater.vercel.app";
const webhookUrl = `${BASE_URL}/webhook/${TELEGRAM_BOT_TOKEN}`;

// === Telegram Bot Setup ===
let bot;
try {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { webHook: true });
  await bot.setWebHook(webhookUrl);
  console.log(`🤖 Telegram bot webhook set to: ${webhookUrl}`);
} catch (err) {
  console.error("❌ Failed to initialize Telegram bot:", err.message);
}

// === Helper: Log to Sheets via /logStatus ===
async function logToSheets(step, details) {
  try {
    await axios.get(`${SHEETS_WEBHOOK}?logStatus=${encodeURIComponent(step)}&details=${encodeURIComponent(details)}`);
    console.log(`🧾 Logged to Sheets → ${step}: ${details}`);
  } catch (err) {
    console.error("❌ logToSheets error:", err.message);
  }
}

// === Telegram Webhook Endpoint ===
app.post(`/webhook/${TELEGRAM_BOT_TOKEN}`, async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    console.log("📥 Message from Telegram:", msg.text);

    if (
      msg.chat.username !== "IndoorTriathlonRegistrations" &&
      msg.chat.title !== "IndoorTriathlonRegistrations"
    ) {
      console.log("📭 Ignored message (not target group).");
      return res.sendStatus(200);
    }

    const payload = {
      lastName: "Telegram",
      firstName: "User",
      email: "from.telegram@bot",
      paymentId: "tg-" + msg.message_id,
      status: "Message Logged",
      about: msg.text
    };

    const resp = await axios.post(SHEETS_WEBHOOK, payload);
    console.log("📤 Message sent to Sheets:", resp.data);
    await logToSheets("Telegram → Sheets", `Message ID: ${msg.message_id}`);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    await logToSheets("Webhook Error", err.message);
    res.sendStatus(500);
  }
});

// === Health Check ===
app.get("/health", async (req, res) => {
  try {
    const ping = await axios.get(`${SHEETS_WEBHOOK}?healthcheck=true`);
    console.log("✅ Healthcheck OK");
    await logToSheets("Healthcheck", "Bot + Sheets OK");
    res.json({ ok: true, ping: ping.data });
  } catch (err) {
    console.error("❌ Healthcheck failed:", err.message);
    await logToSheets("Healthcheck Error", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === Mock Register ===
app.get("/mock-register", async (req, res) => {
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
    about: "Тестовая регистрация"
  };

  try {
    const resp = await axios.post(SHEETS_WEBHOOK, mock);
    console.log("📤 Mock registration sent:", resp.data);
    await logToSheets("Mock Registration", JSON.stringify(mock));
    res.json({ ok: true, data: resp.data });
  } catch (err) {
    console.error("❌ Mock error:", err.message);
    await logToSheets("Mock Error", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
