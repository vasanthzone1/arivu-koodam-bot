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

let questions = [];
let responses = [];

// ✅ GitHub CSV
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
    console.log("⏳ Retrying in 30 sec...");
    setTimeout(loadQuestions, 30000);
  });
}

// Initial + periodic load
setTimeout(loadQuestions, 3000);
setInterval(loadQuestions, 10 * 60 * 1000);

// ================== BOT COMMANDS ==================

// Start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "🤖 Vanakkam Makkale!\n\n𝗔𝗥𝗜𝗩𝗨 𝗞𝗢𝗢𝗗𝗔𝗠 📚 Live 🎯\n\nUse /quiz to start!"
  );
});

// Quiz command
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

// ================== QUIZ LOGIC ==================

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

function sendQuestion(chatId, quizSet, index, slot) {

  if (index >= quizSet.length) {
    bot.sendMessage(chatId, "✅ Quiz Completed!");
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

    // ✅ Store response
    responses.push({
      name: msg.from.first_name,
      userId: msg.from.id,
      question: q.Question,
      selected: answer,
      correctAnswer: correct,
      status: answer === correct ? "Correct" : "Wrong",
      date: new Date().toISOString().split('T')[0],
      slot: slot
    });

    sendQuestion(chatId, quizSet, index + 1, slot);
  });
}

// ================== REPORT DOWNLOAD ==================

bot.onText(/\/report/, (msg) => {

  const chatId = msg.chat.id;

  if (responses.length === 0) {
    bot.sendMessage(chatId, "❌ No data available yet");
    return;
  }

  let csvData = "Name,UserID,Question,Selected,CorrectAnswer,Status,Date,Slot\n";

  responses.forEach(r => {
    csvData += `"${r.name}","${r.userId}","${r.question}","${r.selected}","${r.correctAnswer}","${r.status}","${r.date}","${r.slot}"\n`;
  });

  const fileName = "quiz_report.csv";

  fs.writeFileSync(fileName, csvData);

  bot.sendDocument(chatId, fileName).then(() => {
    console.log("📊 Report sent");
  });
});

// ================== AUTO SCHEDULER ==================

setInterval(() => {

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour === 8 && minute === 0) {
    broadcastQuiz("Morning");
  }

  if (hour === 16 && minute === 0) {
    broadcastQuiz("Evening");
  }

}, 60000);

// Broadcast quiz
function broadcastQuiz(slot) {

  bot.getUpdates().then(updates => {

    const users = [...new Set(
      updates.map(u => u.message?.chat.id).filter(Boolean)
    )];

    console.log(`🚀 Starting ${slot} quiz for ${users.length} users`);

    users.forEach(chatId => {
      runQuiz(chatId, slot);
    });

  }).catch(err => console.log("Broadcast Error:", err));
}
