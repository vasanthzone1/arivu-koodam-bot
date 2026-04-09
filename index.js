function sendQuestion(chatId, quizSet, index, slot) {

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
  ).then(() => {

    // ⏳ TIMER MESSAGE (40 seconds)
    let timeLeft = 40;

    const timerMsg = bot.sendMessage(chatId, `⏳ Time Left: ${timeLeft} seconds`);

    const interval = setInterval(() => {
      timeLeft--;

      if (timeLeft > 0) {
        bot.editMessageText(`⏳ Time Left: ${timeLeft} seconds`, {
          chat_id: chatId,
          message_id: timerMsg.message_id
        });
      } else {
        clearInterval(interval);

        bot.editMessageText(`⏰ Time's up! Moving to next question...`, {
          chat_id: chatId,
          message_id: timerMsg.message_id
        });

        // Move to next question after timer ends
        sendQuestion(chatId, quizSet, index + 1, slot);
      }

    }, 1000);

  }).catch(err => console.log("Poll Error:", err));
}
