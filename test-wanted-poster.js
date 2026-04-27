// Playwright tests for Wanted Poster (Game 09)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'wanted-poster.html').replace(/\\/g, '/');
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

// ── Suite 1: Title screen ─────────────────────────────────
async function suite1() {
  console.log('\nSuite 1: Title screen');
  await setup();

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'title', 'initial state is title');

  // Canvas has rendered content
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 60, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 10, 'title screen has rendered content');

  await teardown();
}

// ── Suite 2: Tap title → study state ──────────────────────
async function suite2() {
  console.log('\nSuite 2: Tap title → study state');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'study', 'tapping title starts game in study state');
  assert(s.score === 0, 'score starts at 0');
  assert(s.lives === 3, 'lives start at 3');
  assert(s.round === 1, 'first round starts at 1');

  await teardown();
}

// ── Suite 3: startGame hook initializes state ─────────────
async function suite3() {
  console.log('\nSuite 3: startGame hook initializes state');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'study', 'startGame puts game in study state');
  assert(s.score === 0, 'score is 0');
  assert(s.lives === 3, 'lives are 3');
  assert(s.round === 1, 'round is 1');
  assert(s.npcCount >= 4, 'at least 4 NPCs in round 1');

  await teardown();
}

// ── Suite 4: skipStudy transitions to find ────────────────
async function suite4() {
  console.log('\nSuite 4: skipStudy transitions to find state');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.skipStudy());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'find', 'skipStudy puts game in find state');
  assert(s.studyTimer === 0, 'study timer is 0');

  await teardown();
}

// ── Suite 5: Tapping correct NPC → caught, score++ ────────
async function suite5() {
  console.log('\nSuite 5: Tap correct NPC → caught state, score increments');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.skipStudy());
  await page.waitForTimeout(50);

  const before = await page.evaluate(() => window.__test.getState());
  const outlawIdx = before.outlawIdx;

  await page.evaluate(idx => window.__test.tapNPC(idx), outlawIdx);
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'caught', 'tapping correct NPC puts game in caught state');
  assert(s.score === 1, 'score increments to 1');

  await teardown();
}

// ── Suite 6: Tapping wrong NPC loses a life ───────────────
async function suite6() {
  console.log('\nSuite 6: Tap wrong NPC → loses a life');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.skipStudy());
  await page.waitForTimeout(50);

  const before = await page.evaluate(() => window.__test.getState());
  const wrongIdx = (before.outlawIdx + 1) % before.npcCount;

  await page.evaluate(idx => window.__test.tapNPC(idx), wrongIdx);
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.lives === 2, 'wrong tap reduces lives to 2');
  assert(s.state === 'find', 'state remains find after single wrong tap');

  await teardown();
}

// ── Suite 7: Three wrong taps → game over ────────────────
async function suite7() {
  console.log('\nSuite 7: Three wrong taps → game over');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.skipStudy());
  await page.waitForTimeout(50);

  const s0 = await page.evaluate(() => window.__test.getState());
  const outlawIdx = s0.outlawIdx;

  // Tap 3 different wrong NPCs
  let wrongCount = 0;
  for (let i = 0; i < s0.npcCount && wrongCount < 3; i++) {
    if (i !== outlawIdx) {
      await page.evaluate(idx => window.__test.tapNPC(idx), i);
      await page.waitForTimeout(50);
      wrongCount++;
    }
  }

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'three wrong taps trigger game over');
  assert(s.lives === 0, 'lives reach 0');

  await teardown();
}

// ── Suite 8: Caught → next round ─────────────────────────
async function suite8() {
  console.log('\nSuite 8: Caught state auto-advances to next round');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.skipStudy());
  await page.waitForTimeout(50);

  const outlawIdx = await page.evaluate(() => window.__test.getOutlawIdx());
  await page.evaluate(idx => window.__test.tapNPC(idx), outlawIdx);
  await page.waitForTimeout(2200); // caughtTimer = 1.55s + buffer

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.round === 2, 'round advances to 2 after catching outlaw');
  assert(s.state === 'study', 'next round starts in study state');

  await teardown();
}

// ── Suite 9: NPC count increases per round ────────────────
async function suite9() {
  console.log('\nSuite 9: NPC count increases in later rounds');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  const r1 = await page.evaluate(() => window.__test.getNPCCount());
  assert(r1 === 4, 'round 1 has 4 NPCs');

  // Advance to round 3 via test hooks
  for (let r = 1; r <= 2; r++) {
    await page.evaluate(() => window.__test.skipStudy());
    await page.waitForTimeout(50);
    const idx = await page.evaluate(() => window.__test.getOutlawIdx());
    await page.evaluate(i => window.__test.tapNPC(i), idx);
    await page.waitForTimeout(2200);
  }

  const r3 = await page.evaluate(() => window.__test.getNPCCount());
  assert(r3 === 6, 'round 3 has 6 NPCs');

  await teardown();
}

// ── Suite 10: forceOver hook works ───────────────────────
async function suite10() {
  console.log('\nSuite 10: forceOver hook → over state');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'forceOver puts game in over state');

  await teardown();
}

// ── Suite 11: Best score saved to localStorage ───────────
async function suite11() {
  console.log('\nSuite 11: Best score persisted in localStorage');
  await setup();

  await page.evaluate(() => window.__test.resetBest());
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.skipStudy());
  await page.waitForTimeout(50);

  const outlawIdx = await page.evaluate(() => window.__test.getOutlawIdx());
  await page.evaluate(idx => window.__test.tapNPC(idx), outlawIdx);
  await page.waitForTimeout(2200);

  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  const stored = await page.evaluate(() => localStorage.getItem('wanted_poster_best'));
  assert(stored !== null, 'wanted_poster_best key exists in localStorage');
  assert(parseInt(stored) >= 1, 'stored best is at least 1');
  assert(parseInt(stored) === s.bestScore, 'stored best matches state bestScore');

  await teardown();
}

// ── Suite 12: getOutlaw returns face features ─────────────
async function suite12() {
  console.log('\nSuite 12: getOutlaw returns face feature object');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);

  const outlaw = await page.evaluate(() => window.__test.getOutlaw());
  assert(outlaw !== null, 'getOutlaw returns a face object');
  assert(typeof outlaw.hatStyle === 'number', 'hatStyle is a number');
  assert(typeof outlaw.beard === 'number', 'beard is a number');
  assert(typeof outlaw.scar === 'number', 'scar is a number');
  assert(typeof outlaw.eyeStyle === 'number', 'eyeStyle is a number');

  await teardown();
}

// ── Suite 13: Console error sweep ────────────────────────
async function suite13() {
  console.log('\nSuite 13: Console error sweep');
  await setup();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__test.skipStudy());
  await page.waitForTimeout(100);
  const outlawIdx = await page.evaluate(() => window.__test.getOutlawIdx());
  await page.evaluate(idx => window.__test.tapNPC(idx), outlawIdx);
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(200);
  await page.mouse.click(W / 2, H / 2 + 45);
  await page.waitForTimeout(400);

  assert(errors.length === 0, `no console errors (got: ${errors.join(', ') || 'none'})`);

  await teardown();
}

// ── Suite 14: Game over screen renders ───────────────────
async function suite14() {
  console.log('\nSuite 14: Game over screen renders gold text');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(150);

  // Score text in gold (#FFD700) at H/2 - 82 ≈ y=238; scan for gold pixels
  const found = await page.evaluate(() => {
    const ctx2 = document.getElementById('c').getContext('2d');
    for (let x = 80; x < 280; x++) {
      for (let y = 220; y < 258; y++) {
        const d = ctx2.getImageData(x, y, 1, 1).data;
        if (d[0] > 200 && d[1] > 180 && d[2] < 60) return true;
      }
    }
    return false;
  });
  assert(found, 'gold score text pixel found in game over region');

  await teardown();
}

// ── Suite 15: Play Again restarts game ───────────────────
async function suite15() {
  console.log('\nSuite 15: Play Again button restarts game');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(200);

  let s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'state is over before Play Again');

  // Play Again button: rr(ctx, W/2 - 87, H/2 + 22, 174, 46, 10) → center ≈ (180, 345)
  await page.mouse.click(W / 2, H / 2 + 45);
  await page.waitForTimeout(200);

  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'study', 'Play Again starts new game in study state');
  assert(s.score === 0, 'score resets on Play Again');
  assert(s.lives === 3, 'lives reset on Play Again');

  await teardown();
}

// ── Runner ────────────────────────────────────────────────
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15,
  ];
  let passed = 0, failed = 0;
  for (const fn of suites) {
    try {
      await fn();
      passed++;
    } catch (e) {
      console.error('\n' + e.message);
      failed++;
      try { await teardown(); } catch {}
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
