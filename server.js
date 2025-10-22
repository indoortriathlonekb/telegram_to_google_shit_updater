// server.js
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GOOGLE_SHEET_WEBHOOK = process.env.GOOGLE_SCRIPT_URL

// Initialize bot (polling mode)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 Telegram bot started...');
console.log(`📡 Watching chat: ${TELEGRAM_CHAT_ID}`);

// Helper to send logs to console and Google Sheet
async function forwardToSheet(message) {
  try {
    const payload = {
      telegramMessageId: message.message_id,
      chatId: message.chat?.id,
      chatTitle: message.chat?.title || message.chat?.username,
      from: message.from?.username || `${message.from?.first_name || ''} ${message.from?.last_name || ''}`.trim(),
      text: message.text || '(no text)',
      date: new Date(message.date * 1000).toISOString(),
      source: 'telegram'
    };

    console.log('📨 Forwarding message to Google Sheets:', payload);

    await axios.post(GOOGLE_SHEET_WEBHOOK, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`✅ Message from @${payload.from} saved to Sheets`);
  } catch (err) {
    console.error('❌ Error forwarding message to Sheets:', err.message);
  }
}

// Listen for all messages
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.username ? `@${msg.chat.username}` : msg.chat.id;

    // Only handle messages from the configured chat
    if (chatId === TELEGRAM_CHAT_ID) {
      console.log(`💬 New message from ${chatId}:`, msg.text);
      await forwardToSheet(msg);
    } else {
      console.log(`⚠️ Ignored message from other chat: ${chatId}`);
    }
  } catch (error) {
    console.error('❌ Message handling error:', error.message);
  }
});

// Error handling
bot.on('polling_error', (err) => {
  console.error('🚨 Polling error:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('🔥 Unhandled rejection:', err);
});
