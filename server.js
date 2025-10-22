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

let bot;

// === Initialize Telegram bot ===
try {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log("🤖 Telegram bot started successfully.");
} catch (err) {
  console.error("❌ Failed to initialize bot:", err.message);
}

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

// === Telegram message observer ===
if (bot) {
  bot.on("message", async (msg) => {
    try {
      if (!msg.chat || !msg.text) return;
      if (msg.chat.username !== "IndoorTriathlonRegistrations" && msg.chat.title !== "IndoorTriathlonRegistrations") {
        console.log("📭 Message ignored (not target group)");
        return;
      }

      const messageText = msg.text.trim();
      console.log(`📥 New group message: ${messageText}`);

      // Send to Google Sheets webhook
      const payload = {
        lastName: "Telegram",
        firstName: "User",
        email: "from.telegram@bot",
        paymentId: "tg-" + msg.message_id,
        amount: "",
        status: "Message Logged",
        about: messageText
      };

      const resp = await axios.post(SHEETS_WEBHOOK, payload);
      console.log("📤 Sent to Sheets:", resp.data);
      await logToSheets("Telegram → Sheets", `Message ID: ${msg.message_id}`);

    } catch (err) {
      console.error("❌ Telegram message error:", err.message);
      await logToSheets("Telegram Error", err.message);
    }
  });
}

// === /health endpoint ===
app.get("/health", async (req, res) => {
  try {
    const ping = await axios.get(`${SHEETS_WEBHOOK}?healthcheck=true`);
    console.log("✅ Healthcheck successful:", ping.data);
    await logToSheets("Healthcheck", "Bot and Sheets are reachable");
    res.json({ ok: true, sheets: ping.data });
  } catch (err) {
    console.error("❌ Healthcheck failed:", err.message);
    await logToSheets("Healthcheck Error", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === /mock-register endpoint ===
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
    about: "Тестовая регистрация через mock API"
  };

  try {
    const resp = await axios.post(SHEETS_WEBHOOK, mock);
    console.log("📤 Mock sent:", resp.data);
    await logToSheets("Mock Registration Sent", JSON.stringify(mock));
    res.json({ ok: true, data: resp.data });
  } catch (err) {
    console.error("❌ Mock error:", err.message);
    await logToSheets("Mock Error", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === Error handler ===
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  logToSheets("Server Error", err.message);
  res.status(500).json({ ok: false, error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
