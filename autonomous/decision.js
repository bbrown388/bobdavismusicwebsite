function classifyAndDecide(feedbackItems, state) {
  if (!feedbackItems.length) {
    return {
      action: 'new_game',
      context: 'No feedback; continuing game series',
      target: null,
      recurringThemes: [],
    };
  }

  // Only fix an existing game if feedback explicitly requests it.
  // App-specific feedback that doesn't request a fix is treated as general context.
  const fixRequests = feedbackItems.filter(i => i.fixRequested && i.game && i.game !== 'general');

  if (fixRequests.length) {
    // Pick the game with the most fix requests
    const byGame = {};
    for (const item of fixRequests) {
      byGame[item.game] = byGame[item.game] || [];
      byGame[item.game].push(item);
    }
    const fixTarget = Object.entries(byGame)
      .sort((a, b) => b[1].length - a[1].length)[0][0];
    const context = byGame[fixTarget].map(c => c.message).filter(Boolean).join(' | ');
    return {
      action: 'fix',
      target: fixTarget,
      context,
      feedbackSummary: byGame[fixTarget],
    };
  }

  // All feedback (game-specific or general) informs the next game design.
  const themes = {};
  for (const item of feedbackItems) {
    const words = (item.message || '').toLowerCase().split(/\W+/).filter(w => w.length > 4);
    for (const w of words) { themes[w] = (themes[w] || 0) + 1; }
  }
  const recurring = Object.entries(themes)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  // Collect all messages as context
  const allMessages = feedbackItems.map(i => i.message).filter(Boolean);

  return {
    action: 'new_game',
    context: [
      recurring.length ? `Recurring themes: ${recurring.join(', ')}` : null,
      allMessages.length ? `Player feedback: ${allMessages.join(' | ')}` : null,
    ].filter(Boolean).join('. ') || 'Positive feedback — raise the bar on next game',
    target: null,
    recurringThemes: recurring,
  };
}

module.exports = { classifyAndDecide };
