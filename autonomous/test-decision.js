const { classifyAndDecide } = require('./decision');

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else { console.log('PASS:', msg); passed++; }
}

// Test 1: low-rating complaint → fix
const feedback1 = [
  { id: 1, game: "Gone Fishin'", rating: 2, feedback: 'fish are too slow to bite', score: 120 },
  { id: 2, game: 'Outlaw Run', rating: 4, feedback: 'sheriff should be faster', score: 850 },
  { id: 3, game: 'Outlaw Run', rating: 5, feedback: 'love it!', score: 1200 },
];
const state = { gamesBuilt: 5, lastGameTitle: 'Outlaw Run' };
const d1 = classifyAndDecide(feedback1, state);
assert(d1.action === 'fix', 'low-rating feedback → fix action');
assert(d1.target === "Gone Fishin'", 'fix targets lowest-rated game');
assert(d1.context.includes('fish are too slow'), 'context includes complaint text');

// Test 2: all positive → new_game
const feedback2 = [
  { id: 4, game: 'Outlaw Run', rating: 5, feedback: 'amazing escape game', score: 900 },
  { id: 5, game: 'Outlaw Run', rating: 4, feedback: 'great escape route mechanic', score: 750 },
];
const d2 = classifyAndDecide(feedback2, state);
assert(d2.action === 'new_game', 'all positive feedback → new_game');
assert(d2.recurringThemes.includes('escape'), 'recurring theme "escape" detected');

// Test 3: empty feedback → new_game
const d3 = classifyAndDecide([], state);
assert(d3.action === 'new_game', 'empty feedback → new_game');
assert(d3.recurringThemes.length === 0, 'no themes on empty feedback');

// Test 4: multiple low-rated games → fix worst one
const feedback4 = [
  { id: 6, game: 'Lasso Loop', rating: 1, feedback: 'broken on mobile', score: 0 },
  { id: 7, game: "Gone Fishin'", rating: 2, feedback: 'fish never bite', score: 50 },
];
const d4 = classifyAndDecide(feedback4, state);
assert(d4.action === 'fix', 'multiple low-rated → fix');
assert(d4.target === 'Lasso Loop', 'fixes worst-rated game first');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
