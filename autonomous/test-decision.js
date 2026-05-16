const { classifyAndDecide } = require('./decision');

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else { console.log('PASS:', msg); passed++; }
}

// Test 1: explicit fixRequested → fix action
const feedback1 = [
  { id: 1, game: "Gone Fishin'", fixRequested: true, message: 'fish are too slow to bite' },
  { id: 2, game: 'Outlaw Run',   fixRequested: false, message: 'sheriff should be faster' },
];
const state = { gamesBuilt: 54, lastGameTitle: 'Smoke Signal' };
const d1 = classifyAndDecide(feedback1, state);
assert(d1.action === 'fix', 'fixRequested:true → fix action');
assert(d1.target === "Gone Fishin'", 'fix targets the game with fixRequested');
assert(d1.context.includes('fish are too slow'), 'context includes complaint text');

// Test 2: low rating alone (no fixRequested) → new_game, not fix
const feedback2 = [
  { id: 3, game: 'Outlaw Run', fixRequested: false, message: 'sheriff too easy', rating: 2 },
  { id: 4, game: 'Outlaw Run', fixRequested: false, message: 'great escape route mechanic', rating: 5 },
];
const d2 = classifyAndDecide(feedback2, state);
assert(d2.action === 'new_game', 'low rating without fixRequested → new_game (not fix)');

// Test 3: recurring themes extracted from feedback
const feedback3 = [
  { id: 5, game: 'general', fixRequested: false, message: 'more puzzle mechanics please' },
  { id: 6, game: 'general', fixRequested: false, message: 'puzzle games are great' },
];
const d3 = classifyAndDecide(feedback3, state);
assert(d3.action === 'new_game', 'general feedback → new_game');
assert(d3.recurringThemes.includes('puzzle'), 'recurring theme "puzzle" detected from two messages');

// Test 4: empty feedback → new_game
const d4 = classifyAndDecide([], state);
assert(d4.action === 'new_game', 'empty feedback → new_game');
assert(d4.recurringThemes.length === 0, 'no themes on empty feedback');

// Test 5: multiple fixRequested games → pick the one with most requests
const feedback5 = [
  { id: 7, game: 'Lasso Loop', fixRequested: true, message: 'broken on mobile' },
  { id: 8, game: 'Lasso Loop', fixRequested: true, message: 'controls not working' },
  { id: 9, game: "Gone Fishin'", fixRequested: true, message: 'fish never bite' },
];
const d5 = classifyAndDecide(feedback5, state);
assert(d5.action === 'fix', 'multiple fixRequested games → fix');
assert(d5.target === 'Lasso Loop', 'fixes game with most fix requests (Lasso Loop has 2)');

// Test 6: fixRequested for 'general' target does not trigger a fix
const feedback6 = [
  { id: 10, game: 'general', fixRequested: true, message: 'something general' },
];
const d6 = classifyAndDecide(feedback6, state);
assert(d6.action === 'new_game', 'fixRequested on "general" game → new_game (not a game slug)');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
