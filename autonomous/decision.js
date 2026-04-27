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

  // All feedback informs the next game design. Pass full items so director can act on specifics.
  const themes = {};
  for (const item of feedbackItems) {
    const words = (item.message || '').toLowerCase().split(/\W+/).filter(w => w.length > 4);
    for (const w of words) { themes[w] = (themes[w] || 0) + 1; }
  }
  const recurring = Object.entries(themes)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  return {
    action: 'new_game',
    context: 'See feedbackItems for specific instructions — read each one carefully before proceeding.',
    target: null,
    recurringThemes: recurring,
    feedbackItems: feedbackItems.map(i => ({
      game:         i.game || 'general',
      message:      i.message || '',
      fixRequested: i.fixRequested || false,
    })),
  };
}

module.exports = { classifyAndDecide };
