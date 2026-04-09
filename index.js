// ================== SERVER ==================
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

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// ================== GLOBAL DATA ==================
let questions = [];
let userScores = {};
let pollMap = {}; // pollId -> correctIndex

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
      });

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

// ================== QUIZ ==================
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

  sendQuestion(chatId, quizSet, 0);
}

// ================== SEND QUESTION ==================
function sendQuestion(chatId, quizSet, index) {

  if (index >= quizSet.length) {

    bot.sendMessage(chatId, "✅ Quiz Completed!");

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
  ).then((sent) => {

    // Store correct answer
    pollMap[sent.poll.id] = correctIndex;

    // Timer (40 seconds)
    let timeLeft = 40;

    bot.sendMessage(chatId, `⏳ Time Left: ${timeLeft}s`).then((msg) => {

      const interval = setInterval(() => {
        timeLeft--;

        if (timeLeft > 0) {
          bot.editMessageText(`⏳ Time Left: ${timeLeft}s`, {
            chat_id: chatId,
            message_id: msg.message_id
          });
        } else {
          clearInterval(interval);

          bot.editMessageText(`⏰ Time's up!`, {
            chat_id: chatId,
            message_id: msg.message_id
          });

          sendQuestion(chatId, quizSet, index + 1);
        }

      }, 1000);

    });

  }).catch(err => console.log("Poll Error:", err));
}

// ================== ANSWER HANDLING ==================
bot.on('poll_answer', (answer) => {

  const userId = answer.user.id;
  const name = answer.user.first_name;
  const selected = answer.option_ids[0];
  const pollId = answer.poll_id;

  const correctIndex = pollMap[pollId];

  if (correctIndex === undefined) return;

  if (!userScores[userId]) {
    userScores[userId] = 0;
  }

  if (selected === correctIndex) {
    userScores[userId] += 1;
    console.log(`✅ ${name} got correct answer`);
  } else {
    console.log(`❌ ${name} got wrong answer`);
  }

});
