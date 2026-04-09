// ================== SERVER (Render Requirement) ==================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ================== BOT SETUP ==================
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const csv = require('csv-parser');
const fs = require('fs');

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// ================== GLOBAL DATA ==================
let questions = [];
let responses = [];
let userScores = {};

// ================== CSV SOURCE ==================
const CSV_URL = "https://raw.githubusercontent.com/vasanthzone1/arivu-koodam-bot/main/questions.csv";

// ================== LOAD QUESTIONS ==================
function loadQuestions() {
  console.log("🔄 Loading questions...");

  https.get(CSV_URL, (res) => {
    let temp = [];

    res.pipe(csv())
      .on('data', (row) => temp.push(row))
      .on('end', () => {
        questions = temp;
        console.log("✅ Questions Loaded:", questions.length);
      })
      .on('error', (err) => console.log("CSV Error:", err));

  }).on('error', (err) => {
    console.log("🌐 Network Error:", err.message);
    setTimeout(loadQuestions, 30000);
  });
}

setTimeout(loadQuestions, 3000);
setInterval(loadQuestions, 10 * 60 * 1000);

// ================== START ==================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "🤖 Vanakkam Makkale!\n\n𝗔𝗥𝗜𝗩𝗨 𝗞𝗢𝗢𝗗𝗔𝗠 📚\n\nUse /quiz to start!"
  );
});

// ================== QUIZ COMMAND ==================
bot.onText(/\/quiz/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Choose slot:", {
    reply_markup: {
      keyboard: [["Morning"], ["Evening"]],
      one_time_keyboard: true
    }
  });

  bot.once('message', (msg) => {
    const slot = msg.text;
    runQuiz(chatId, slot);
  });
});

// ================== RUN QUIZ ==================
function runQuiz(chatId, slot) {
  const today = new Date().toISOString().split('T')[0];

  const quizSet = questions.filter(q =>
    q.Date === today && q.Slot === slot
  );

  if (quizSet.length === 0) {
    bot.sendMessage(chatId, `❌ No quiz available for ${slot}`);
    return;
  }

  sendQuestion(chatId, quizSet, 0, slot);
}

// ================== SEND QUESTION (POLLS) ==================
function sendQuestion(chatId, quizSet, index, slot) {

  if (index >= quizSet.length) {
    bot.sendMessage(chatId, "✅ Quiz Completed!");

    // Show simple result
    const topUsers = Object.entries(userScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let leaderboard = "🏆 *Leaderboard*\n\n";

    topUsers.forEach(([user, score], i) => {
      leaderboard += `${i + 1}. ${user} - ${score} pts\n`;
    });

    bot.sendMessage(chatId, leaderboard, { parse_mode: "Markdown" });
    return;
  }

  const q = quizSet[index];

  const options = [
    q.Option1,
    q.Option2,
    q.Option3,
    q.Option4,
    q.Option5
  ].filter(opt => opt && opt.trim() !== '');

  const correctIndex = parseInt(q.CorrectOption) - 1;

  bot.sendPoll(
    chatId,
    `📘 ${q.Topic}\n\nQ${index + 1}: ${q.Question}`,
    options,
    {
      type: 'quiz',
      correct_option_id: correctIndex,
      is_anonymous: false
    }
  ).then(() => {

    setTimeout(() => {
      sendQuestion(chatId, quizSet, index + 1, slot);
    }, 15000);

  }).catch(err => console.log("Poll Error:", err));
}

// ================== POLL ANSWER TRACKING ==================
bot.on('poll_answer', (answer) => {

  const userId = answer.user.id;
  const name = answer.user.first_name;
  const selected = answer.option_ids[0];

  if (!userScores[userId]) {
    userScores[userId] = 0;
  }

  responses.push({
    name: name,
    userId: userId,
    selected: selected
  });

  console.log(`📊 ${name} answered option ${selected}`);
});

// ================== REPORT DOWNLOAD ==================
bot.onText(/\/report/, (msg) => {

  if (responses.length === 0) {
    bot.sendMessage(msg.chat.id, "❌ No data available");
    return;
  }

  let csvData = "Name,UserID,SelectedOption\n";

  responses.forEach(r => {
    csvData += `"${r.name}","${r.userId}","${r.selected}"\n`;
  });

  const fileName = "report.csv";
  fs.writeFileSync(fileName, csvData);

  bot.sendDocument(msg.chat.id, fileName);
});

// ================== SCHEDULER ==================
setInterval(() => {

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour === 8 && minute === 0) {
    runAuto("Morning");
  }

  if (hour === 16 && minute === 0) {
    runAuto("Evening");
  }

}, 60000);

// ================== AUTO QUIZ ==================
function runAuto(slot) {
  const today = new Date().toISOString().split('T')[0];

  const quizSet = questions.filter(q =>
    q.Date === today && q.Slot === slot
  );

  const chatIds = [...new Set(responses.map(r => r.userId))];

  chatIds.forEach(id => {
    runQuiz(id, slot);
  });
}
