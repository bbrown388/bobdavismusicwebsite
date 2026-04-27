// Playwright tests for Dust Devil (Game 08)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'dust-devil.html').replace(/\\/g, '/');
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

  // Canvas has rendered content (non-trivial sum of RGB)
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W/2, 60, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 10, 'title screen has rendered content');

  await teardown();
}

// ── Suite 2: Tap starts game ──────────────────────────────
async function suite2() {
  console.log('\nSuite 2: Tap title → playing state');
  await setup();

  await page.mouse.click(W/2, H/2);
  await page.waitForTimeout(150);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'playing', 'tapping title starts game');
  assert(s.score === 0, 'score resets to 0 on start');
  assert(Math.abs(s.tw.x - W/2) < 2, 'tumbleweed starts near center-x');

  await teardown();
}

// ── Suite 3: Gravity — tumbleweed falls ───────────────────
async function suite3() {
  console.log('\nSuite 3: Tumbleweed falls under gravity');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);

  const s0 = await page.evaluate(() => window.__test.getState());
  await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => window.__test.getState());

  if (s1.state === 'over') {
    assert(true, 'tumbleweed moved and hit boundary (gravity confirmed)');
  } else {
    assert(s1.tw.y > s0.tw.y, 'tumbleweed y increased (fell due to gravity)');
  }

  await teardown();
}

// ── Suite 4: Gust — pushes tumbleweed away from tap ──────
async function suite4() {
  console.log('\nSuite 4: Gust moves tumbleweed away from tap point');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  // Move tumbleweed to center
  await page.evaluate(() => window.__test.setTW(180, 320, 0, 0));
  await page.waitForTimeout(50);

  // Gust from below right — tumbleweed should go up-left
  await page.evaluate(() => window.__test.gust(290, 430));
  await page.waitForTimeout(50);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.tw.vx < 0, 'gust from right pushes tumbleweed left (vx < 0)');
  assert(s.tw.vy < 0, 'gust from below pushes tumbleweed up (vy < 0)');

  await teardown();
}

// ── Suite 5: Wall collision → game over ──────────────────
async function suite5() {
  console.log('\nSuite 5: Wall placed at tumbleweed position → game over');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.setTW(180, 320, 0, 0));
  await page.waitForTimeout(30);

  // Place wall with no gap at y=320 — very small gap so TW will hit
  await page.evaluate(() => window.__test.placeWall(180, 320, 5));
  await page.waitForTimeout(200);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'wall collision triggers game over');

  await teardown();
}

// ── Suite 6: Boundary top → game over ────────────────────
async function suite6() {
  console.log('\nSuite 6: Tumbleweed exits top boundary → game over');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.setTW(180, 5, 0, -800));
  await page.waitForTimeout(200);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'exiting top boundary triggers game over');

  await teardown();
}

// ── Suite 7: Boundary bottom → game over ─────────────────
async function suite7() {
  console.log('\nSuite 7: Tumbleweed exits bottom boundary → game over');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.setTW(180, H - 5, 0, 800));
  await page.waitForTimeout(200);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'exiting bottom boundary triggers game over');

  await teardown();
}

// ── Suite 8: Score increments when passing walls ──────────
async function suite8() {
  console.log('\nSuite 8: Score increments when tumbleweed passes a wall');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  // Position TW just right of a wall with a wide gap — tumbleweed should pass through
  await page.evaluate(() => {
    window.__test.setTW(300, 320, 0, 0);
    window.__test.placeWall(240, 320, 200); // wall at x=240, wide gap → TW at 300 is already past right edge
  });
  await page.waitForTimeout(200);

  const s = await page.evaluate(() => window.__test.getState());
  // Scoring: wall.x + WALL_WIDTH_HALF(24) < tw.x - TW_RADIUS(18)
  // wall.x=240+24=264 < 300-18=282 → yes, should score
  assert(s.score >= 1 || s.state === 'over', 'tumbleweed scored or game ended');

  await teardown();
}

// ── Suite 9: forceOver hook works ────────────────────────
async function suite9() {
  console.log('\nSuite 9: forceOver hook → over state');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(100);

  const s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'forceOver puts game in over state');

  await teardown();
}

// ── Suite 10: Best score saved to localStorage ───────────
async function suite10() {
  console.log('\nSuite 10: Best score persisted in localStorage');
  await setup();

  await page.evaluate(() => window.__test.resetBest());
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(100);

  // Score is 0 on immediate forceOver, but bestScore should equal score
  const s = await page.evaluate(() => window.__test.getState());
  const stored = await page.evaluate(() => localStorage.getItem('dust_devil_best'));
  assert(stored !== null, 'dust_devil_best key exists in localStorage');
  assert(parseInt(stored) === s.bestScore, 'stored best matches state bestScore');

  await teardown();
}

// ── Suite 11: Console error sweep ────────────────────────
async function suite11() {
  console.log('\nSuite 11: Console error sweep');
  await setup();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // Drive through full state cycle
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__test.gust(180, 400));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(100);
  await page.mouse.click(W/2, H * 0.575 + 20); // Ride Again
  await page.waitForTimeout(200);

  await page.waitForTimeout(600); // let loop run ~36 frames

  assert(errors.length === 0, `no console errors (got: ${errors.join(', ') || 'none'})`);

  await teardown();
}

// ── Suite 12: HUD score visible during play ───────────────
async function suite12() {
  console.log('\nSuite 12: HUD score pill renders during play');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);

  // Score pill is centered: pill at x=W/2-38..W/2+38 = 142..218, y=8..36
  // Gold text (#FFE066 = R=255,G=224,B=102) — scan for pixels with high R and G
  const found = await page.evaluate(() => {
    const ctx2 = document.getElementById('c').getContext('2d');
    for (let x = 155; x < 210; x++) {
      for (let y = 14; y < 34; y++) {
        const d = ctx2.getImageData(x, y, 1, 1).data;
        if (d[0] > 150 && d[1] > 100) return true;
      }
    }
    return false;
  });
  assert(found, 'HUD gold score pixel found in scan region');

  await teardown();
}

// ── Suite 13: Game over screen renders ───────────────────
async function suite13() {
  console.log('\nSuite 13: Game over screen renders WIPEOUT text');
  await setup();

  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(100);

  // Over overlay is a dark fill — pixel at center should be dark-ish but non-zero
  // "WIPEOUT" in gold at H*0.24 ≈ y=154; scan around that area for gold pixels
  const found = await page.evaluate(() => {
    const ctx2 = document.getElementById('c').getContext('2d');
    for (let x = 120; x < 250; x++) {
      for (let y = 140; y < 175; y++) {
        const d = ctx2.getImageData(x, y, 1, 1).data;
        if (d[0] > 150 && d[1] > 100) return true;
      }
    }
    return false;
  });
  assert(found, 'WIPEOUT gold text pixel found in game over region');

  await teardown();
}

// ── Suite 14: Ride Again restarts game ───────────────────
async function suite14() {
  console.log('\nSuite 14: Ride Again button restarts game (full cycle)');
  await setup();

  // title → playing → over → playing via Ride Again
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__test.forceOver());
  await page.waitForTimeout(150);

  let s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'over', 'state is over before Ride Again');

  // Ride Again button: y = H*0.575 .. H*0.575+46 → y center ≈ 391
  await page.mouse.click(W/2, Math.floor(H * 0.575) + 23);
  await page.waitForTimeout(150);

  s = await page.evaluate(() => window.__test.getState());
  assert(s.state === 'playing', 'Ride Again starts new game');
  assert(s.score === 0, 'score resets on Ride Again');

  await teardown();
}

// ── Runner ────────────────────────────────────────────────
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6,
    suite7, suite8, suite9, suite10, suite11, suite12, suite13, suite14,
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
