async function sendQuestion(chatId, quizSet, index, slot) {

  if (index >= quizSet.length) {
    bot.sendMessage(chatId, "✅ Quiz Completed!");
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

  try {
    const pollMsg = await bot.sendPoll(
      chatId,
      `📘 ${q.Topic}\n\nQ${index + 1}: ${q.Question}`,
      options,
      {
        type: 'quiz',
        correct_option_id: correctIndex,
        is_anonymous: false
      }
    );

    // Track poll
    bot.once('poll_answer', (answer) => {
      responses.push({
        userId: answer.user.id,
        question: q.Question,
        selected: answer.option_ids[0],
        correct: correctIndex,
        date: new Date().toISOString().split('T')[0],
        slot: slot
      });
    });

    setTimeout(() => {
      sendQuestion(chatId, quizSet, index + 1, slot);
    }, 15000); // 15 sec per question

  } catch (err) {
    console.log("Poll Error:", err);
  }
}
