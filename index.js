const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const csv = require('csv-parser');

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let questions = [];

// ✅ GitHub RAW CSV
const CSV_URL = "https://raw.githubusercontent.com/vasanthzone1/arivu-koodam-bot/main/questions.csv";

// 🔄 Load Questions (SAFE)
function loadQuestions() {
  console.log("🔄 Loading questions...");

  https.get(CSV_URL, (res) => {
    let temp = [];

    res.pipe(csv())
      .on('data', (row) => temp.push(row))
      .on('end', () => {
        questions = temp;
        console.log("✅ Loaded:", questions.length);
      })
      .on('error', (err) => console.log("CSV Error:", err));

  }).on('error', (err) => {
    console.log("🌐 Network Error:", err.message);
    setTimeout(loadQuestions, 30000); // retry
  });
}

// Initial load
setTimeout(loadQuestions, 3000);

// Reload every 10 mins
setInterval(loadQuestions, 10 * 60 * 1000);

// START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 Vanakkam Makkale!\n𝗔𝗥𝗜𝗩𝗨 𝗞𝗢𝗢𝗗𝗔𝗠 📚 Live 🎯");
});

// QUIZ COMMAND
bot.onText(/\/quiz/, (msg) => {
  runQuiz(msg.chat.id, "Morning");
});

// MAIN QUIZ LOGIC
function runQuiz(chatId, slot) {
  const today = new Date().toISOString().split('T')[0];

  const quizSet = questions.filter(q =>
    q.Date === today && q.Slot === slot
  );

  if (quizSet.length === 0) {
    bot.sendMessage(chatId, `❌ No quiz for ${slot}`);
    return;
  }

  sendQuestion(chatId, quizSet, 0, slot);
}

// QUESTION FLOW
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

    sendQuestion(chatId, quizSet, index + 1, slot);
  });
}
