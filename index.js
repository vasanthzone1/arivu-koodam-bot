const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const csv = require('csv-parser');

try {

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let questions = [];

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1O-GSnLawMNg71o4x8kLYzsgZF9zuU67PHOlqupcfjFI/export?format=csv";

function loadQuestions() {
  questions = [];

  https.get(SHEET_URL, (res) => {
    res.pipe(csv())
      .on('data', (row) => questions.push(row))
      .on('end', () => console.log("Loaded:", questions.length))
      .on('error', (err) => console.log("CSV Error:", err));
  }).on('error', (err) => console.log("HTTP Error:", err));
}

loadQuestions();

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Bot is Live ✅");
});

console.log("Bot started successfully");

} catch (err) {
  console.log("CRASH ERROR:", err);
}
