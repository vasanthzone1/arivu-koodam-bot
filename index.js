const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const csv = require('csv-parser');
const fs = require('fs');

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let questions = [];
let responses = [];

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1O-GSnLawMNg71o4x8kLYzsgZF9zuU67PHOlqupcfjFI/export?format=csv";

function loadQuestions() {
  questions = [];

  https.get(SHEET_URL, (res) => {
    res.pipe(csv())
      .on('data', (row) => questions.push(row))
      .on('end', () => console.log("Loaded:", questions.length));
  });
}

loadQuestions();
setInterval(loadQuestions, 10 * 60 * 1000);

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Vanakkam Makkale!\n𝗔𝗥𝗜𝗩𝗨 𝗞𝗢𝗢𝗗𝗔𝗠 📚 is Live 🎯");
});

function runQuiz(chatId, slot) {
  const today = new Date().toISOString().split('T')[0];

  const quizSet = questions.filter(q =>
    q.Date === today && q.Slot === slot
  );

  if (quizSet.length === 0) {
    bot.sendMessage(chatId, `No quiz for ${slot}`);
    return;
  }

  sendQuestion(chatId, quizSet, 0, slot);
}

function sendQuestion(chatId, quizSet, index, slot) {
  if (index >= quizSet.length) {
    bot.sendMessage(chatId, "Quiz Completed!");
    return;
  }

  const q = quizSet[index];

  bot.sendMessage(chatId,
    `📘 ${q.Topic}\n\nQ${index + 1}: ${q.Question}`,
    {
      reply_markup: {
        keyboard: [
          [q.Option1],
          [q.Option2],
          [q.Option3],
          [q.Option4],
          [q.Option5]
        ],
        one_time_keyboard: true
      }
    }
  );

  bot.once('message', (msg) => {
    const answer = msg.text;
    const correct = q[`Option${q.CorrectOption}`];

    responses.push({
      name: msg.from.first_name,
      userId: msg.from.id,
      question: q.Question,
      selected: answer,
      status: answer === correct ? "Correct" : "Wrong"
    });

    sendQuestion(chatId, quizSet, index + 1, slot);
  });
}

// AUTO SCHEDULER
setInterval(() => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour === 8 && minute === 0) {
    broadcast("Morning");
  }

  if (hour === 16 && minute === 0) {
    broadcast("Evening");
  }

}, 60000);

function broadcast(slot) {
  bot.getUpdates().then(updates => {
    const users = [...new Set(updates.map(u => u.message?.chat.id).filter(Boolean))];

    users.forEach(chatId => {
      runQuiz(chatId, slot);
    });
  });
}
