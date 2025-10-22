import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// === 🔹 BOT CONFIG ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// === 🔹 Telegram sender ===
async function sendTelegramMessage(text) {
  try {
    console.log("📨 Sending Telegram message...");
    const res = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
    });
    console.log("✅ Message sent successfully:", res.data.result.message_id);
    return { ok: true, data: res.data };
  } catch (error) {
    console.error("❌ Telegram send error:", error.response?.data || error.message);
    return { ok: false, error: error.response?.data || error.message };
  }
}

// === 🔹 Health Check ===
app.get("/api/health", async (req, res) => {
  console.log("🏥 Health check ping received.");

  try {
    const response = await axios.get(`${TELEGRAM_API}/getMe`);
    const botInfo = response.data.result;

    res.json({
      ok: true,
      message: "Bot is healthy 💪",
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        name: botInfo.first_name,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("⚠️ Bot health check failed:", err.response?.data || err.message);
    res.status(500).json({
      ok: false,
      message: "Bot health check failed",
      error: err.response?.data || err.message,
    });
  }
});

// === 🔹 Test Send Endpoint ===
app.post("/api/test-send", async (req, res) => {
  console.log("📬 /api/test-send request received");

  const testMessage = `------------------------
📋 Новая регистрация
👤 Иван Иванов
🏙️ Город: Москва
🏢 Клуб: Fast Swim
📞 Телефон: 79261234567
✉️ Email: ivan@example.com
⚧ Пол: мужской
🏁 Этапы:
Этап 1
💰 Сумма: 100 ₽
🆔 Платеж: testpay123
📌 Статус: Ожидает оплату
📝 О себе: Тестовая регистрация
🔢 Строка: 2
------------------------`;

  const result = await sendTelegramMessage(testMessage);
  if (result.ok) {
    res.json({ ok: true, message: "Test message sent ✅", result: result.data });
  } else {
    res.status(500).json({ ok: false, error: result.error });
  }
});

// === 🔹 Root ===
app.get("/", (req, res) => {
  res.json({
    service: "IndoorTriathlon Bot API",
    status: "running",
    endpoints: ["/api/health", "/api/test-send"],
    time: new Date().toISOString(),
  });
});

// === 🔹 Start Server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
