function classifyAndDecide(feedbackItems, state) {
  if (!feedbackItems.length) {
    return {
      action: 'new_game',
      context: 'No feedback; continuing game series',
      target: null,
      recurringThemes: [],
    };
  }

  const byGame = {};
  for (const item of feedbackItems) {
    if (!byGame[item.game]) byGame[item.game] = [];
    byGame[item.game].push(item);
  }

  // Fix priority: game with lowest avg rating that has at least one low-rating complaint
  let fixTarget = null, lowestAvg = Infinity;
  for (const [game, items] of Object.entries(byGame)) {
    const complaints = items.filter(i => i.rating <= 2);
    if (!complaints.length) continue;
    const avg = items.reduce((s, i) => s + i.rating, 0) / items.length;
    if (avg < lowestAvg) { lowestAvg = avg; fixTarget = game; }
  }

  if (fixTarget) {
    const complaints = byGame[fixTarget].filter(i => i.rating <= 2);
    return {
      action: 'fix',
      target: fixTarget,
      context: complaints.map(c => c.feedback).filter(Boolean).join(' | '),
      feedbackSummary: byGame[fixTarget],
    };
  }

  // Recurring themes (2+ mentions of same word) across all feedback → inform next game
  const themes = {};
  for (const item of feedbackItems) {
    const words = (item.feedback || '').toLowerCase().split(/\W+/).filter(w => w.length > 4);
    for (const w of words) { themes[w] = (themes[w] || 0) + 1; }
  }
  const recurring = Object.entries(themes)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  return {
    action: 'new_game',
    context: recurring.length
      ? `Player themes from feedback: ${recurring.join(', ')}`
      : 'Positive feedback — raise the bar on next game',
    target: null,
    recurringThemes: recurring,
  };
}

module.exports = { classifyAndDecide };
