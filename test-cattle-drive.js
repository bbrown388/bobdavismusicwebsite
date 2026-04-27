// Playwright tests for Cattle Drive (Game 06)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'cattle-drive.html').replace(/\\/g, '/');
const W = 360, H = 640;

let browser, page;

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.warn('[PAGE ERROR]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(200);
}

async function teardown() { if (browser) await browser.close(); }

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// ── Suite 1: Title screen ──────────────────────────────────
async function suite1() {
  console.log('\nSuite 1: Title screen');
  await setup();

  const s = await page.evaluate(() => state);
  assert(s === 'title', 'initial state is title');

  // Title screen has rendered content (non-black pixels at center)
  const px = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(W/2, H/2 - 80, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 20, 'title screen has rendered gradient content');

  await teardown();
}

// ── Suite 2: Tap starts game ──────────────────────────────
async function suite2() {
  console.log('\nSuite 2: Tap starts game');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);

  const s = await page.evaluate(() => state);
  assert(s === 'playing', 'tap title → state becomes playing');

  const cnt = await page.evaluate(() => cattle.length);
  assert(cnt === 10, 'cattle array has 10 cows');

  const wc = await page.evaluate(() => wolves.length);
  assert(wc === 2, 'wolves array has 2 wolves');

  const tl = await page.evaluate(() => timeLeft);
  assert(Math.abs(tl - 90) < 1, 'timeLeft starts at 90');

  await teardown();
}

// ── Suite 3: Scare point created on tap ───────────────────
async function suite3() {
  console.log('\nSuite 3: Scare point mechanics');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);

  // Tap field area — should create scare point
  await page.mouse.click(W / 2, 400);
  await page.waitForTimeout(50);

  const sp = await page.evaluate(() => scarePoint);
  assert(sp !== null, 'scarePoint created on tap');
  assert(Math.abs(sp.x - W/2) < 2, 'scarePoint x matches tap x');
  assert(Math.abs(sp.y - 400) < 2, 'scarePoint y matches tap y');

  await teardown();
}

// ── Suite 4: Cattle physics — velocity applies to position ─
async function suite4() {
  console.log('\nSuite 4: Cattle physics simulation running');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);

  const cowPos = await page.evaluate(() => ({ x: cattle[0].x, y: cattle[0].y }));

  // Directly set upward velocity to confirm game loop applies vx/vy to position
  await page.evaluate(() => { cattle[0].vy = -80; });
  await page.waitForTimeout(400);

  const newPos = await page.evaluate(() => ({ x: cattle[0].x, y: cattle[0].y, collected: cattle[0].collected }));
  const movedDist = Math.hypot(newPos.x - cowPos.x, newPos.y - cowPos.y);
  assert(movedDist > 1 || newPos.collected, 'cattle physics loop applies velocity to position');

  await teardown();
}

// ── Suite 5: Wolf startle via test hook ───────────────────
async function suite5() {
  console.log('\nSuite 5: Wolf startle');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);

  const before = await page.evaluate(() => wolves[0].startled);
  assert(!before, 'wolf[0] not startled initially');

  await page.evaluate(() => window.__test.startleWolf(0));

  const after = await page.evaluate(() => wolves[0].startled);
  assert(after, 'wolf[0] startled after test hook');

  // Wolf should move away from startled position
  const wPos = await page.evaluate(() => ({ x: wolves[0].x, y: wolves[0].y }));
  await page.waitForTimeout(500);
  const wPos2 = await page.evaluate(() => ({ x: wolves[0].x, y: wolves[0].y }));
  const wMoved = Math.hypot(wPos2.x - wPos.x, wPos2.y - wPos.y);
  assert(wMoved > 0, 'startled wolf moved position');

  await teardown();
}

// ── Suite 6: Win condition — collectAll hook ───────────────
async function suite6() {
  console.log('\nSuite 6: Win condition via collectAll');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);

  await page.evaluate(() => window.__test.collectAll());
  await page.waitForTimeout(200);

  const s = await page.evaluate(() => state);
  assert(s === 'win', 'state is win after collectAll()');

  const col = await page.evaluate(() => collected);
  assert(col === 10, 'collected = 10 after collectAll()');

  await teardown();
}

// ── Suite 7: Score computed on win ────────────────────────
async function suite7() {
  console.log('\nSuite 7: Score on win');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);

  // Set known timeLeft so score is deterministic
  await page.evaluate(() => { timeLeft = 60; });
  await page.evaluate(() => window.__test.collectAll());
  await page.waitForTimeout(150);

  const sc = await page.evaluate(() => score);
  // 10 cows × 100 = 1000 + 60s × 10 = 600 → total 1600
  assert(sc >= 1500, 'score ≥ 1500 with 60s remaining and 10 cows');
  assert(sc <= 1700, 'score ≤ 1700 (within expected range)');

  await teardown();
}

// ── Suite 8: localStorage persists best score ─────────────
async function suite8() {
  console.log('\nSuite 8: localStorage best score');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);

  await page.evaluate(() => { timeLeft = 45; });
  await page.evaluate(() => window.__test.collectAll());
  await page.waitForTimeout(200);

  const stored = await page.evaluate(() => localStorage.getItem('cattle_drive_best'));
  assert(stored !== null, 'localStorage has cattle_drive_best after win');
  assert(parseInt(stored, 10) > 0, 'stored best > 0');

  await teardown();
}

// ── Suite 9: Timer ticks down ─────────────────────────────
async function suite9() {
  console.log('\nSuite 9: Timer decreases during play');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);
  const t1 = await page.evaluate(() => timeLeft);
  await page.waitForTimeout(600);
  const t2 = await page.evaluate(() => timeLeft);
  assert(t2 < t1, 'timeLeft decreased during play');

  await teardown();
}

// ── Suite 10: Time-up triggers lose ──────────────────────
async function suite10() {
  console.log('\nSuite 10: Time expiry triggers lose');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);

  await page.evaluate(() => { timeLeft = 0.05; });
  await page.waitForTimeout(400);

  const s = await page.evaluate(() => state);
  assert(s === 'lose', 'state is lose when timeLeft hits 0');

  await teardown();
}

// ── Suite 11: Console error sweep ────────────────────────
async function suite11() {
  console.log('\nSuite 11: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(FILE);
  await page.waitForTimeout(300);

  // Start game
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(300);

  // Tap to create scare points
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(80 + i * 60, 400);
    await page.waitForTimeout(120);
  }

  // Trigger win
  await page.evaluate(() => window.__test.collectAll());
  await page.waitForTimeout(400);

  // Go back to title
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  assert(errors.length === 0, `zero console errors (got: ${errors.join(', ')})`);
  await browser.close();
  browser = null;
}

// ── Suite 12: HUD renders during play ────────────────────
async function suite12() {
  console.log('\nSuite 12: HUD non-black pixels during play');
  await setup();

  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(350);

  // Timer bar is at bottom center (W/2-60, H-28) size 120×12
  const hasColor = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(W/2 - 60, H - 28, 120, 12).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 20 || d[i+1] > 20 || d[i+2] > 20) return true;
    }
    return false;
  });
  assert(hasColor, 'timer bar area has non-black pixels during play');

  await teardown();
}

// ── Suite 13: Win → title → play cycle ───────────────────
async function suite13() {
  console.log('\nSuite 13: Full state cycle');
  await setup();

  // Title → Playing
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);
  let s = await page.evaluate(() => state);
  assert(s === 'playing', 'title → playing on tap');

  // Win
  await page.evaluate(() => window.__test.collectAll());
  await page.waitForTimeout(200);
  s = await page.evaluate(() => state);
  assert(s === 'win', 'playing → win on collectAll');

  // Tap win screen → title
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);
  s = await page.evaluate(() => state);
  assert(s === 'title', 'win → title on tap');

  await teardown();
}

// ── Runner ────────────────────────────────────────────────
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6,
    suite7, suite8, suite9, suite10, suite11, suite12, suite13,
  ];
  let passed = 0, failed = 0;

  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      try { await teardown(); } catch {}
      browser = null;
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
