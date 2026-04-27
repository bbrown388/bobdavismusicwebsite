// Playwright tests for Tin Star Showdown (Game 07)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'tin-star-showdown.html').replace(/\\/g, '/');
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

  // Canvas has rendered non-black content (stars / gradient)
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W/2, 40, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 10, 'title screen has rendered content');

  await teardown();
}

// ── Suite 2: Tap advances from title to intro ─────────────
async function suite2() {
  console.log('\nSuite 2: Tap → intro state');
  await setup();

  await page.mouse.click(W/2, H/2);
  await page.waitForTimeout(150);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'intro', 'tapping title advances to intro');
  assert(s.round === 1, 'round is 1 on match start');
  assert(s.pWins === 0, 'player wins reset to 0');
  assert(s.aWins === 0, 'ai wins reset to 0');

  await teardown();
}

// ── Suite 3: Tap advances from intro to ready ─────────────
async function suite3() {
  console.log('\nSuite 3: Tap → ready state');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro
  await page.waitForTimeout(100);
  await page.mouse.click(W/2, H/2); // intro → ready
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'ready', 'tapping intro advances to ready');

  await teardown();
}

// ── Suite 4: Flinch — tap during READY loses round ────────
async function suite4() {
  console.log('\nSuite 4: Flinch during READY → result, AI wins');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro
  await page.waitForTimeout(100);
  await page.mouse.click(W/2, H/2); // intro → ready
  await page.waitForTimeout(100);

  // Trigger flinch via test hook
  await page.evaluate(() => window.__test.triggerFlinch());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'result', 'after flinch state is result');
  assert(s.roundResult === 'flinch', 'roundResult is flinch');
  assert(s.aWins === 1, 'AI gets a win on flinch');
  assert(s.pWins === 0, 'player does not get a win on flinch');

  await teardown();
}

// ── Suite 5: Player wins a round ─────────────────────────
async function suite5() {
  console.log('\nSuite 5: Player fires during DRAW → wins round');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro
  await page.waitForTimeout(100);
  await page.mouse.click(W/2, H/2); // intro → ready
  await page.waitForTimeout(100);

  // Skip READY delay, go straight to draw
  await page.evaluate(() => window.__test.triggerDraw());
  await page.waitForTimeout(80);

  const sInDraw = await page.evaluate(() => window.__test.getState());
  assert(sInDraw.state === 'draw', 'triggerDraw puts state in draw');

  // Player fires
  await page.evaluate(() => window.__test.triggerPlayerWin());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'result', 'state is result after player fires');
  assert(s.roundResult === 'player', 'roundResult is player');
  assert(s.pWins === 1, 'player has 1 win');
  assert(s.pReactMs === 250, 'pReactMs set to 250 by hook');

  await teardown();
}

// ── Suite 6: AI wins a round ──────────────────────────────
async function suite6() {
  console.log('\nSuite 6: AI fires → AI wins round');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro
  await page.waitForTimeout(100);
  await page.mouse.click(W/2, H/2); // intro → ready
  await page.waitForTimeout(100);

  await page.evaluate(() => window.__test.triggerDraw());
  await page.waitForTimeout(50);

  await page.evaluate(() => window.__test.triggerAiWin());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'result', 'state is result after AI fires');
  assert(s.roundResult === 'ai', 'roundResult is ai');
  assert(s.aWins === 1, 'AI has 1 win');
  assert(s.pWins === 0, 'player has 0 wins');

  await teardown();
}

// ── Suite 7: Match over — player wins match ───────────────
async function suite7() {
  console.log('\nSuite 7: Match over when player reaches 2 wins');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro
  await page.waitForTimeout(100);

  // Force player wins match via hook
  await page.evaluate(() => window.__test.forceMatchOver(true));
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'forceMatchOver puts state in over');
  assert(s.pWins === 2, 'player has 2 wins in over state');
  assert(s.matchWins === 1, 'matchWins incremented to 1');

  await teardown();
}

// ── Suite 8: Match over — AI wins match ──────────────────
async function suite8() {
  console.log('\nSuite 8: Match over when AI reaches 2 wins');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro
  await page.waitForTimeout(100);

  await page.evaluate(() => window.__test.forceMatchOver(false));
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'state is over');
  assert(s.aWins === 2, 'AI has 2 wins');
  assert(s.pWins === 0, 'player has 0 wins');

  await teardown();
}

// ── Suite 9: localStorage best reaction time ──────────────
async function suite9() {
  console.log('\nSuite 9: Best reaction time saved to localStorage');
  await setup();

  // Reset best
  await page.evaluate(() => window.__test.resetBest());

  // Win a round with 250ms reaction time
  await page.mouse.click(W/2, H/2); await page.waitForTimeout(80);
  await page.mouse.click(W/2, H/2); await page.waitForTimeout(80);
  await page.evaluate(() => window.__test.triggerDraw());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.triggerPlayerWin());
  await page.waitForTimeout(100);

  const stored = await page.evaluate(() => localStorage.getItem('tinstar_best_react'));
  assert(stored !== null, 'tinstar_best_react is set in localStorage');
  assert(parseInt(stored) === 250, 'stored best react is 250');

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.bestReact === 250, 'bestReact state var is 250');

  await teardown();
}

// ── Suite 10: Round advances correctly after result ───────
async function suite10() {
  console.log('\nSuite 10: Round advances after result tap');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro (round 1)
  await page.waitForTimeout(80);
  await page.mouse.click(W/2, H/2); // intro → ready
  await page.waitForTimeout(80);
  await page.evaluate(() => window.__test.triggerDraw());
  await page.evaluate(() => window.__test.triggerPlayerWin());
  await page.waitForTimeout(100);

  // Unlock result guard and advance
  await page.evaluate(() => window.__test.unlockResult());
  await page.mouse.click(W/2, H/2); // result → intro (round 2)
  await page.waitForTimeout(150);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'intro', 'after result tap state is intro');
  assert(s.round === 2, 'round advanced to 2');

  await teardown();
}

// ── Suite 11: Console error sweep ────────────────────────
async function suite11() {
  console.log('\nSuite 11: Console error sweep (60 frames)');
  await setup();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // Run through key states
  await page.mouse.click(W/2, H/2); await page.waitForTimeout(50);  // → intro
  await page.mouse.click(W/2, H/2); await page.waitForTimeout(50);  // → ready
  await page.evaluate(() => window.__test.triggerDraw());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.triggerPlayerWin());
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__test.unlockResult());
  await page.mouse.click(W/2, H/2); await page.waitForTimeout(50);  // → intro round 2
  await page.evaluate(() => window.__test.forceMatchOver(false));
  await page.waitForTimeout(100);
  await page.mouse.click(W/2, H/2); await page.waitForTimeout(50);  // → title

  // Let the loop run for 60 frames
  await page.waitForTimeout(1100);

  assert(errors.length === 0, `no console errors (got: ${errors.join(', ') || 'none'})`);

  await teardown();
}

// ── Suite 12: HUD pixels ──────────────────────────────────
async function suite12() {
  console.log('\nSuite 12: HUD renders score pills during match');
  await setup();

  await page.mouse.click(W/2, H/2); // title → intro
  await page.waitForTimeout(100);
  await page.mouse.click(W/2, H/2); // intro → ready
  await page.waitForTimeout(100);

  // Gold "YOU  0" text is centered at x≈132, top of glyphs at y≈23
  const found = await page.evaluate(() => {
    const ctx2 = document.getElementById('c').getContext('2d');
    for (let x = 100; x < 170; x++) {
      for (let y = 20; y < 36; y++) {
        const d = ctx2.getImageData(x, y, 1, 1).data;
        if (d[0] > 150 && d[1] > 100) return true;
      }
    }
    return false;
  });
  assert(found, 'HUD gold text pixel found in scan region');

  await teardown();
}

// ── Suite 13: Full state cycle ────────────────────────────
async function suite13() {
  console.log('\nSuite 13: Full match cycle title→intro→ready→draw→result→over→title');
  await setup();

  // title
  let s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'title', 'starts at title');

  await page.mouse.click(W/2, H/2); await page.waitForTimeout(80);
  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'intro', 'tap→intro');

  await page.mouse.click(W/2, H/2); await page.waitForTimeout(80);
  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'ready', 'tap→ready');

  await page.evaluate(() => window.__test.triggerDraw());
  await page.waitForTimeout(50);
  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'draw', 'triggerDraw→draw');

  await page.evaluate(() => window.__test.triggerPlayerWin());
  await page.waitForTimeout(80);
  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'result', 'player wins→result');

  // Force match over
  await page.evaluate(() => window.__test.forceMatchOver(true));
  await page.waitForTimeout(80);
  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'forceMatchOver→over');

  // Click above the Share/Feedback buttons (top of the card) to trigger play again
  await page.mouse.click(W/2, Math.floor(H * 0.24) + 48);
  await page.waitForTimeout(100);
  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'title', 'over tap→title');

  await teardown();
}

// ── Runner ────────────────────────────────────────────────
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6,
    suite7, suite8, suite9, suite10, suite11, suite12, suite13,
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
