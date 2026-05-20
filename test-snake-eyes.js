// test-snake-eyes.js -- Playwright tests for Game 61: Snake Eyes
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'snake-eyes.html').replace(/\\/g, '/');
let browser, page;
const consoleErrors = [];

async function setup() {
  browser = await chromium.launch();
  page    = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}

async function teardown() { await browser.close(); }

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Suite 1: DOM & Canvas ─────────────────────────────────────────────────────
test('canvas element exists', async () => {
  const c = await page.$('canvas#c');
  assert.ok(c, 'canvas#c not found');
});

test('canvas is 360x640', async () => {
  const d = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert.strictEqual(d.w, 360);
  assert.strictEqual(d.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__run.getState());
  assert.strictEqual(s, 'title');
});

test('window.__run API exists', async () => {
  const ok = await page.evaluate(() => typeof window.__run === 'object' && window.__run !== null);
  assert.ok(ok, 'window.__run not found');
});

// ── Suite 2: startGame / startRound ──────────────────────────────────────────
test('startGame transitions to playing state', async () => {
  await page.evaluate(() => window.__run.startGame());
  const s = await page.evaluate(() => window.__run.getState());
  assert.strictEqual(s, 'playing');
});

test('startGame sets round to 0', async () => {
  const r = await page.evaluate(() => window.__run.getRound());
  assert.strictEqual(r, 0);
});

test('startGame sets playerScore to 0', async () => {
  const s = await page.evaluate(() => window.__run.getPlayerScore());
  assert.strictEqual(s, 0);
});

test('startRound deals 5 player dice', async () => {
  const d = await page.evaluate(() => window.__run.getPlayerDice());
  assert.strictEqual(d.length, 5);
});

test('startRound deals 5 sheriff dice', async () => {
  const d = await page.evaluate(() => window.__run.getSheriffDice());
  assert.strictEqual(d.length, 5);
});

test('startRound player dice are all 1-6', async () => {
  const d = await page.evaluate(() => window.__run.getPlayerDice());
  assert.ok(d.every(v => v >= 1 && v <= 6), 'all player dice must be 1-6');
});

test('startRound sheriff dice are all 1-6', async () => {
  const d = await page.evaluate(() => window.__run.getSheriffDice());
  assert.ok(d.every(v => v >= 1 && v <= 6), 'all sheriff dice must be 1-6');
});

test('startRound clears current bid', async () => {
  const b = await page.evaluate(() => window.__run.getCurrentBid());
  assert.strictEqual(b.qty, 0);
  assert.strictEqual(b.face, 0);
});

test('startRound sets turn to player', async () => {
  const t = await page.evaluate(() => window.__run.getTurn());
  assert.strictEqual(t, 'player');
});

test('startGame picks a valid personality 0-3', async () => {
  const p = await page.evaluate(() => window.__run.getPersonality());
  assert.ok(p >= 0 && p <= 3, 'personality must be 0-3');
});

test('PERSONALITIES array has 4 entries', async () => {
  const n = await page.evaluate(() => window.__run.PERSONALITIES.length);
  assert.strictEqual(n, 4);
});

test('ROUNDS array has 5 entries', async () => {
  const n = await page.evaluate(() => window.__run.ROUNDS.length);
  assert.strictEqual(n, 5);
});

// ── Suite 3: Dice helpers ─────────────────────────────────────────────────────
test('rollDice(5) returns array of 5 values in 1-6', async () => {
  const d = await page.evaluate(() => window.__run.rollDice(5));
  assert.strictEqual(d.length, 5);
  assert.ok(d.every(v => v >= 1 && v <= 6));
});

test('rollDice(10) returns array of 10', async () => {
  const d = await page.evaluate(() => window.__run.rollDice(10));
  assert.strictEqual(d.length, 10);
});

test('countFace counts correctly', async () => {
  const n = await page.evaluate(() => window.__run.countFace([1, 3, 3, 5, 3], 3));
  assert.strictEqual(n, 3);
});

test('countFace returns 0 when face absent', async () => {
  const n = await page.evaluate(() => window.__run.countFace([1, 2, 4, 5, 6], 3));
  assert.strictEqual(n, 0);
});

// ── Suite 4: Probability ──────────────────────────────────────────────────────
test('binomialGTE(10,0) = 1', async () => {
  const p = await page.evaluate(() => window.__run.binomialGTE(10, 0));
  assert.strictEqual(p, 1);
});

test('binomialGTE(0,1) = 0', async () => {
  const p = await page.evaluate(() => window.__run.binomialGTE(0, 1));
  assert.strictEqual(p, 0);
});

test('binomialGTE(6,1) is between 0.5 and 0.75 (roughly 1-5/6^6)', async () => {
  const p = await page.evaluate(() => window.__run.binomialGTE(6, 1));
  assert.ok(p > 0.5 && p < 0.75, `got ${p}`);
});

test('bidProbability: certain bid (player has all needed) = 1', async () => {
  const p = await page.evaluate(() =>
    window.__run.bidProbability({ qty: 3, face: 4 }, [4, 4, 4, 2, 1], 10)
  );
  assert.strictEqual(p, 1);
});

test('bidProbability: impossible bid = 0', async () => {
  const p = await page.evaluate(() =>
    window.__run.bidProbability({ qty: 11, face: 2 }, [1, 1, 1, 1, 1], 10)
  );
  assert.strictEqual(p, 0);
});

// ── Suite 5: Bid Validation ───────────────────────────────────────────────────
test('isValidBid: first bid qty>=1 face>=1 is valid', async () => {
  const ok = await page.evaluate(() =>
    window.__run.isValidBid({ qty: 1, face: 1 }, { qty: 0, face: 0 })
  );
  assert.ok(ok);
});

test('isValidBid: same qty higher face is valid', async () => {
  const ok = await page.evaluate(() =>
    window.__run.isValidBid({ qty: 2, face: 4 }, { qty: 2, face: 3 })
  );
  assert.ok(ok);
});

test('isValidBid: higher qty any face is valid', async () => {
  const ok = await page.evaluate(() =>
    window.__run.isValidBid({ qty: 3, face: 1 }, { qty: 2, face: 6 })
  );
  assert.ok(ok);
});

test('isValidBid: same qty same face is invalid', async () => {
  const ok = await page.evaluate(() =>
    window.__run.isValidBid({ qty: 2, face: 3 }, { qty: 2, face: 3 })
  );
  assert.ok(!ok);
});

test('isValidBid: same qty lower face is invalid', async () => {
  const ok = await page.evaluate(() =>
    window.__run.isValidBid({ qty: 2, face: 2 }, { qty: 2, face: 4 })
  );
  assert.ok(!ok);
});

test('isValidBid: lower qty is invalid', async () => {
  const ok = await page.evaluate(() =>
    window.__run.isValidBid({ qty: 1, face: 6 }, { qty: 3, face: 2 })
  );
  assert.ok(!ok);
});

// ── Suite 6: Sheriff AI ───────────────────────────────────────────────────────
test('sheriffMakeBid returns bid or call', async () => {
  const action = await page.evaluate(() =>
    window.__run.sheriffMakeBid([1, 2, 3, 4, 5], { qty: 0, face: 0 }, 0, 10, 5)
  );
  assert.ok(action.type === 'bid' || action.type === 'call', `got ${action.type}`);
});

test('sheriffMakeBid first bid has qty>=1 and face 1-6', async () => {
  const action = await page.evaluate(() =>
    window.__run.sheriffMakeBid([3, 3, 3, 1, 2], { qty: 0, face: 0 }, 0, 10, 5)
  );
  if (action.type === 'bid') {
    assert.ok(action.qty >= 1, 'qty must be >= 1');
    assert.ok(action.face >= 1 && action.face <= 6, 'face must be 1-6');
  }
});

test('sheriffMakeBid bid must beat current bid', async () => {
  const action = await page.evaluate(() =>
    window.__run.sheriffMakeBid([1, 1, 1, 2, 2], { qty: 2, face: 3 }, 0, 10, 5)
  );
  if (action.type === 'bid') {
    const cur = { qty: 2, face: 3 };
    const valid = action.qty > cur.qty || (action.qty === cur.qty && action.face > cur.face);
    assert.ok(valid, `sheriff bid ${JSON.stringify(action)} does not beat ${JSON.stringify(cur)}`);
  }
});

test('sheriffMakeBid calls when bid probability is too low (maxed bid)', async () => {
  // Force personality=0 (Cautious, callThreshold=0.22) with an extreme bid
  const action = await page.evaluate(() =>
    window.__run.sheriffMakeBid([2, 4, 5, 1, 6], { qty: 10, face: 6 }, 0, 10, 5)
  );
  // qty=10 face=6 means 10 sixes from 10 dice — essentially impossible, must call
  assert.strictEqual(action.type, 'call');
});

// ── Suite 7: Player Actions ───────────────────────────────────────────────────
test('playerBid sets current bid and switches turn to sheriff', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setCurrentBid({ qty: 0, face: 0 });
    window.__run.setTurn('player');
    window.__run.setLastBidder('');
    // selectedQty and selectedFace default to 1,1 — but we need to set via JS
    // The game has selectedQty/selectedFace as local vars, we invoke playerBid directly
    // set selected values first by nudging the UI state through setCurrentBid
  });
  // playerBid uses selectedQty=1, selectedFace=1 which is valid when current bid is {qty:0,face:0}
  await page.evaluate(() => window.__run.playerBid());
  const bid = await page.evaluate(() => window.__run.getCurrentBid());
  const turn = await page.evaluate(() => window.__run.getTurn());
  assert.strictEqual(bid.qty, 1);
  assert.strictEqual(bid.face, 1);
  assert.strictEqual(turn, 'sheriff');
});

test('playerCall fails when no bid has been made', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setCurrentBid({ qty: 0, face: 0 });
    window.__run.setLastBidder('');
  });
  const stateBefore = await page.evaluate(() => window.__run.getState());
  await page.evaluate(() => window.__run.playerCall());
  const stateAfter = await page.evaluate(() => window.__run.getState());
  // Should still be playing (not reveal), since no bid was made
  assert.strictEqual(stateAfter, 'playing');
});

test("playerCall fails if player made last bid (can't call own bid)", async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setCurrentBid({ qty: 2, face: 3 });
    window.__run.setLastBidder('player');
  });
  await page.evaluate(() => window.__run.playerCall());
  const s = await page.evaluate(() => window.__run.getState());
  assert.strictEqual(s, 'playing');
});

test('playerCall succeeds when sheriff bid last', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setCurrentBid({ qty: 2, face: 3 });
    window.__run.setLastBidder('sheriff');
    window.__run.setTurn('player');
  });
  await page.evaluate(() => window.__run.playerCall());
  const s = await page.evaluate(() => window.__run.getState());
  assert.strictEqual(s, 'reveal');
});

// ── Suite 8: Round Resolution ─────────────────────────────────────────────────
test('resolveRound player_called: actual < qty → player wins', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]); // 0 sixes each
    window.__run.setCurrentBid({ qty: 5, face: 6 }); // bid 5 sixes, only 0 exist
    window.__run.resolveRound('player_called');
  });
  const r = await page.evaluate(() => window.__run.getRevealResult());
  assert.strictEqual(r.winner, 'player');
  assert.strictEqual(r.actual, 0);
});

test('resolveRound player_called: actual >= qty → sheriff wins', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([6, 6, 6, 1, 2], [6, 6, 1, 2, 3]); // 5 sixes total
    window.__run.setCurrentBid({ qty: 5, face: 6 });
    window.__run.resolveRound('player_called');
  });
  const r = await page.evaluate(() => window.__run.getRevealResult());
  assert.strictEqual(r.winner, 'sheriff');
  assert.strictEqual(r.actual, 5);
});

test('resolveRound sheriff_called: actual >= qty → player wins', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([3, 3, 3, 1, 2], [3, 1, 2, 4, 5]); // 4 threes
    window.__run.setCurrentBid({ qty: 4, face: 3 });
    window.__run.resolveRound('sheriff_called');
  });
  const r = await page.evaluate(() => window.__run.getRevealResult());
  assert.strictEqual(r.winner, 'player');
});

test('resolveRound sheriff_called: actual < qty → sheriff wins', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([1, 2, 4, 5, 6], [1, 2, 4, 5, 6]); // 0 threes
    window.__run.setCurrentBid({ qty: 4, face: 3 });
    window.__run.resolveRound('sheriff_called');
  });
  const r = await page.evaluate(() => window.__run.getRevealResult());
  assert.strictEqual(r.winner, 'sheriff');
});

test('resolveRound sets state to reveal', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    window.__run.setCurrentBid({ qty: 3, face: 1 });
    window.__run.resolveRound('sheriff_called');
  });
  const s = await page.evaluate(() => window.__run.getState());
  assert.strictEqual(s, 'reveal');
});

// ── Suite 9: Score & Round Progression ───────────────────────────────────────
test('player win adds bounty to score', async () => {
  await page.evaluate(() => {
    window.__run.startGame(); // score reset to 0
    window.__run.setDice([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]); // 0 sixes
    window.__run.setCurrentBid({ qty: 5, face: 6 });
    window.__run.resolveRound('player_called'); // player wins round 0
  });
  const score = await page.evaluate(() => window.__run.getPlayerScore());
  assert.strictEqual(score, 200, 'round 0 bounty is $200');
});

test('sheriff win adds nothing to score', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([6, 6, 6, 6, 6], [6, 6, 6, 6, 6]); // 10 sixes
    window.__run.setCurrentBid({ qty: 5, face: 6 });
    window.__run.resolveRound('player_called'); // sheriff wins (actual >= qty)
  });
  const score = await page.evaluate(() => window.__run.getPlayerScore());
  assert.strictEqual(score, 0);
});

test('roundWins tracks player win', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    window.__run.setCurrentBid({ qty: 5, face: 6 });
    window.__run.resolveRound('player_called');
  });
  const wins = await page.evaluate(() => window.__run.getRoundWins());
  assert.strictEqual(wins[0], 'player');
});

test('roundWins tracks sheriff win', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.setDice([6, 6, 6, 6, 6], [6, 6, 6, 6, 6]);
    window.__run.setCurrentBid({ qty: 5, face: 6 });
    window.__run.resolveRound('player_called');
  });
  const wins = await page.evaluate(() => window.__run.getRoundWins());
  assert.strictEqual(wins[0], 'sheriff');
});

test('score accumulates across multiple rounds', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    // Win round 0: $200
    window.__run.setDice([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    window.__run.setCurrentBid({ qty: 5, face: 6 });
    window.__run.resolveRound('player_called');
    // Start round 1
    window.__run.setRound(1);
    window.__run.setState('playing');
    // Win round 1: $400
    window.__run.setDice([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    window.__run.setCurrentBid({ qty: 5, face: 6 });
    window.__run.resolveRound('player_called');
  });
  const score = await page.evaluate(() => window.__run.getPlayerScore());
  assert.strictEqual(score, 600, 'round 0 ($200) + round 1 ($400) = $600');
});

test('ROUNDS bounties are 200, 400, 600, 800, 1000', async () => {
  const bounties = await page.evaluate(() => window.__run.ROUNDS.map(r => r.bounty));
  assert.deepStrictEqual(bounties, [200, 400, 600, 800, 1000]);
});

// ── Suite 10: Console error sweep ────────────────────────────────────────────
test('no console errors during normal play', async () => {
  assert.strictEqual(consoleErrors.length, 0,
    'Console errors found: ' + consoleErrors.join('; '));
});

// ── Runner ────────────────────────────────────────────────────────────────────
(async () => {
  await setup();
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✓ ${t.name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${t.name}: ${e.message}`);
      failed++;
    }
  }
  await teardown();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
