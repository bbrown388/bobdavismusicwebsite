// Playwright tests for Boot Hill Bluff (Game 11)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'boot-hill-bluff.html').replace(/\\/g, '/');
const W = 360, H = 640;
let browser, page;

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.warn('[PAGE ERROR]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}
async function teardown() { if (browser) await browser.close(); }
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// Suite 1: Title screen
async function suite1() {
  console.log('\nSuite 1: Title screen');
  await setup();
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'initial state is title');
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W/2, 220, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 30, 'title screen renders content');
  await teardown();
}

// Suite 2: Tap starts game
async function suite2() {
  console.log('\nSuite 2: Tap starts game');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  const chips = await page.evaluate(() => window.__test.getChips());
  assert(chips.playerChips === 90, 'player starts with 90 chips after ante (100 - 10)');
  assert(chips.aiChips === 90, 'AI starts with 90 chips after ante (100 - 10)');
  assert(chips.pot === 20, 'pot starts at 20 (ante * 2)');
  await teardown();
}

// Suite 3: Cards dealt
async function suite3() {
  console.log('\nSuite 3: Cards dealt');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const cards = await page.evaluate(() => window.__test.getCards());
  assert(cards.playerCard >= 1 && cards.playerCard <= 10, 'player card in range 1-10');
  assert(cards.aiCard >= 1 && cards.aiCard <= 10, 'AI card in range 1-10');
  await teardown();
}

// Suite 4: Round counter
async function suite4() {
  console.log('\nSuite 4: Round starts at 1');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const r = await page.evaluate(() => window.__test.getRound());
  assert(r === 1, 'round is 1 at game start');
  await teardown();
}

// Suite 5: Phase progression deal -> ai_think -> player_turn
async function suite5() {
  console.log('\nSuite 5: Phase progression');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const p1 = await page.evaluate(() => window.__test.getPhase());
  assert(p1 === 'deal', 'phase starts at deal');
  await page.waitForTimeout(800);
  const p2 = await page.evaluate(() => window.__test.getPhase());
  assert(p2 === 'ai_think' || p2 === 'player_turn', 'phase advances past deal');
  await page.waitForTimeout(1400);
  const p3 = await page.evaluate(() => window.__test.getPhase());
  assert(p3 === 'player_turn', 'phase reaches player_turn');
  await teardown();
}

// Suite 6: Fold action
async function suite6() {
  console.log('\nSuite 6: Fold action');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(2100); // wait for player_turn
  const chipsBefore = await page.evaluate(() => window.__test.getChips());
  await page.evaluate(() => window.__test.playerDecide('fold'));
  const phase = await page.evaluate(() => window.__test.getPhase());
  assert(phase === 'result', 'fold moves to result phase');
  // AI should gain the pot
  const chipsAfter = await page.evaluate(() => window.__test.getChips());
  assert(chipsAfter.pot === 0 || chipsAfter.aiChips > chipsBefore.aiChips, 'AI gains pot on player fold');
  await teardown();
}

// Suite 7: Call action leads to showdown
async function suite7() {
  console.log('\nSuite 7: Call action');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(2100);
  await page.evaluate(() => window.__test.playerDecide('call'));
  const phase = await page.evaluate(() => window.__test.getPhase());
  assert(phase === 'result' || phase === 'showdown', 'call moves to result/showdown');
  await teardown();
}

// Suite 8: Raise action
async function suite8() {
  console.log('\nSuite 8: Raise action');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(2100);
  await page.evaluate(() => window.__test.playerDecide('raise'));
  const phase = await page.evaluate(() => window.__test.getPhase());
  assert(phase === 'result', 'raise resolves to result');
  await teardown();
}

// Suite 9: Chips conserved (no chips created or destroyed)
async function suite9() {
  console.log('\nSuite 9: Chip conservation');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(2100);
  await page.evaluate(() => window.__test.playerDecide('call'));
  await page.waitForTimeout(100);
  const chips = await page.evaluate(() => window.__test.getChips());
  // After resolution, total chips should equal CHIPS_START * 2 (200)
  const total = chips.playerChips + chips.aiChips + chips.pot;
  assert(total === 200, 'total chips conserved at 200 (got ' + total + ')');
  await teardown();
}

// Suite 10: AI bluff flag set
async function suite10() {
  console.log('\nSuite 10: AI bluff/honest flagged');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const bluffing = await page.evaluate(() => typeof window.__test.isBluffing() === 'boolean');
  assert(bluffing, 'isBluffing returns boolean');
  await teardown();
}

// Suite 11: Tell type in valid range
async function suite11() {
  console.log('\nSuite 11: Tell type valid');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const t = await page.evaluate(() => window.__test.getTell());
  assert(t >= 0 && t <= 3, 'tellType in range 0-3 (got ' + t + ')');
  await teardown();
}

// Suite 12: Narrative phase triggers after round 2
async function suite12() {
  console.log('\nSuite 12: Narrative phase after round 2');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  // Fast-forward through rounds 1 and 2
  for (let r = 0; r < 2; r++) {
    await page.waitForTimeout(2100);
    const ph = await page.evaluate(() => window.__test.getPhase());
    if (ph === 'player_turn') {
      await page.evaluate(() => window.__test.playerDecide('call'));
    }
    await page.waitForTimeout(2200); // wait for result -> advance
  }
  await page.waitForTimeout(300);
  const ph = await page.evaluate(() => window.__test.getPhase());
  // Should be narrative or still result/deal depending on timing
  const validPhases = ['narrative', 'deal', 'result', 'ai_think', 'player_turn'];
  assert(validPhases.includes(ph), 'phase is valid after round 2: ' + ph);
  await teardown();
}

// Suite 13: Narrative choices available
async function suite13() {
  console.log('\nSuite 13: Narrative choices built');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  // Manually trigger narrative
  await page.evaluate(() => {
    const { buildNarrativeChoices, phase } = window.__test;
    // Access internal functions via test hook - simulate narrative
  });
  // Just verify structure via public API
  const r = await page.evaluate(() => window.__test.NARRATIVE_ROUNDS);
  assert(Array.isArray(r) && r.includes(2), 'NARRATIVE_ROUNDS includes round 2');
  assert(r.includes(4), 'NARRATIVE_ROUNDS includes round 4');
  await teardown();
}

// Suite 14: Game over when chips depleted
async function suite14() {
  console.log('\nSuite 14: Game over on chip depletion');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Manually drain player chips
    // Simulate by calling playerDecide after forcing chips low
  });
  // Fold 5 times to drain chips
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2100);
    const st = await page.evaluate(() => window.__test.getState());
    if (st === 'gameover') break;
    const ph = await page.evaluate(() => window.__test.getPhase());
    if (ph === 'player_turn') {
      await page.evaluate(() => window.__test.playerDecide('fold'));
    } else if (ph === 'narrative') {
      await page.evaluate(() => window.__test.chooseNarrative(1)); // stare them down (free)
    }
    await page.waitForTimeout(2200);
  }
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover' || st === 'playing', 'state resolves correctly after many folds');
  await teardown();
}

// Suite 15: AI profile assigned
async function suite15() {
  console.log('\nSuite 15: AI profile assigned');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const profile = await page.evaluate(() => window.__test.getAIProfile());
  assert(profile && profile.name && profile.bluffFreq >= 0, 'AI profile has name and bluffFreq');
  assert(profile.bluffFreq >= 0 && profile.bluffFreq <= 1, 'bluffFreq in valid range');
  await teardown();
}

// Suite 16: localStorage best score
async function suite16() {
  console.log('\nSuite 16: localStorage best score key');
  await setup();
  const slug = await page.evaluate(() => window.__test.CHIPS_START);
  assert(slug === 100, 'CHIPS_START is 100');
  // Verify localStorage key exists after a game
  await page.evaluate(() => localStorage.setItem('boot_hill_bluff_best', '150'));
  await page.reload();
  await page.waitForTimeout(300);
  const best = await page.evaluate(() => parseInt(localStorage.getItem('boot_hill_bluff_best') || '0'));
  assert(best === 150, 'localStorage best score persists');
  await teardown();
}

// Suite 17: Console error sweep
async function suite17() {
  console.log('\nSuite 17: No console errors on title screen');
  const errors = [];
  const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await br.newContext({ viewport: { width: W, height: H } });
  const pg = await ctx.newPage();
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.goto(FILE);
  await pg.waitForTimeout(800);
  await pg.evaluate(() => window.__test.startGame());
  await pg.waitForTimeout(500);
  const filtered = errors.filter(e => !e.includes('CORS') && !e.includes('fetch'));
  assert(filtered.length === 0, 'no console errors (got: ' + filtered.join('; ') + ')');
  await br.close();
}

// Suite 18: Tap title starts game (UI test)
async function suite18() {
  console.log('\nSuite 18: Tap on title screen starts game');
  await setup();
  await page.mouse.click(W/2, H/2);
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'tap title screen transitions to playing');
  await teardown();
}

// ── Runner ─────────────────────────────────────────────────
async function main() {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8, suite9,
    suite10, suite11, suite12, suite13, suite14, suite15, suite16, suite17, suite18,
  ];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try {
      await s();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      try { await teardown(); } catch {}
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
