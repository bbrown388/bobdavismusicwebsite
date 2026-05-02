// Playwright tests for Rope Trick (Game 17)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'rope-trick.html').replace(/\\/g, '/');
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
async function teardown() { if (browser) { await browser.close(); browser = null; page = null; } }
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// Suite 1: Initial state is title
async function suite1() {
  console.log('\nSuite 1: Initial state is title');
  await setup();
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'initial state is title');
  await teardown();
}

// Suite 2: Canvas dimensions
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions');
  await setup();
  const dims = await page.evaluate(() => {
    const c = document.getElementById('c');
    return { w: c.width, h: c.height };
  });
  assert(dims.w === 360, 'canvas width is 360');
  assert(dims.h === 640, 'canvas height is 640');
  await teardown();
}

// Suite 3: startGame transitions to playing
async function suite3() {
  console.log('\nSuite 3: startGame transitions to playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  await teardown();
}

// Suite 4: Score starts at 0
async function suite4() {
  console.log('\nSuite 4: Score starts at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 0, 'score is 0 at start (got ' + sc + ')');
  await teardown();
}

// Suite 5: Round starts at 0
async function suite5() {
  console.log('\nSuite 5: Round starts at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const r = await page.evaluate(() => window.__test.getRound());
  assert(r === 0, 'round is 0 at start (got ' + r + ')');
  await teardown();
}

// Suite 6: Misses starts at 0
async function suite6() {
  console.log('\nSuite 6: Misses starts at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const m = await page.evaluate(() => window.__test.getMisses());
  assert(m === 0, 'misses is 0 at start (got ' + m + ')');
  await teardown();
}

// Suite 7: Phase is aiming after startGame
async function suite7() {
  console.log('\nSuite 7: Phase is aiming after startGame');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ph = await page.evaluate(() => window.__test.getPhase());
  assert(ph === 'aiming', 'phase is aiming after startGame (got ' + ph + ')');
  await teardown();
}

// Suite 8: Aim cursor oscillates after update
async function suite8() {
  console.log('\nSuite 8: Aim cursor oscillates after update');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const x1 = await page.evaluate(() => window.__test.getAimX());
  await page.evaluate(() => window.__test.update(0.5));
  const x2 = await page.evaluate(() => window.__test.getAimX());
  assert(Math.abs(x2 - x1) > 5, 'aim cursor moved after 0.5s update (x1=' + x1.toFixed(1) + ' x2=' + x2.toFixed(1) + ')');
  await teardown();
}

// Suite 9: Wind is non-zero after startGame
async function suite9() {
  console.log('\nSuite 9: Wind is non-zero after startGame');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const w = await page.evaluate(() => window.__test.getWindX());
  assert(w !== 0, 'windX is non-zero after startGame (got ' + w + ')');
  await teardown();
}

// Suite 10: setWindX sets wind correctly
async function suite10() {
  console.log('\nSuite 10: setWindX sets wind');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(2);
  });
  const w = await page.evaluate(() => window.__test.getWindX());
  assert(w === 2, 'windX is 2 after setWindX(2) (got ' + w + ')');
  await teardown();
}

// Suite 11: setAimX sets aim correctly
async function suite11() {
  console.log('\nSuite 11: setAimX sets aim correctly');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setAimX(200);
  });
  const x = await page.evaluate(() => window.__test.getAimX());
  assert(x === 200, 'aimX is 200 after setAimX(200) (got ' + x + ')');
  await teardown();
}

// Suite 12: Perfect throw returns 300 pts
async function suite12() {
  console.log('\nSuite 12: Perfect throw scores 300 pts');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx);
  });
  const pts = await page.evaluate(() => window.__test.throwNow());
  assert(pts === 300, 'perfect throw scores 300 (got ' + pts + ')');
  await teardown();
}

// Suite 13: Good throw returns 150 pts
async function suite13() {
  console.log('\nSuite 13: Good throw scores 150 pts');
  await setup();
  const pts = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const tx = window.__test.getTargetX();
    // Aim PERFECT_DIST+5 off center — inside GOOD_DIST, outside PERFECT
    window.__test.setAimX(tx + window.__test.PERFECT_DIST + 5);
    return window.__test.throwNow();
  });
  assert(pts === 150, 'good throw scores 150 (got ' + pts + ')');
  await teardown();
}

// Suite 14: Miss throw returns 0 pts
async function suite14() {
  console.log('\nSuite 14: Miss throw scores 0 pts');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx + window.__test.GOOD_DIST + 20);
  });
  const pts = await page.evaluate(() => window.__test.throwNow());
  assert(pts === 0, 'miss throw scores 0 (got ' + pts + ')');
  await teardown();
}

// Suite 15: Miss increments misses counter
async function suite15() {
  console.log('\nSuite 15: Miss increments misses counter');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx + 150);
  });
  await page.evaluate(() => window.__test.throwNow());
  const m = await page.evaluate(() => window.__test.getMisses());
  assert(m === 1, 'misses is 1 after a miss (got ' + m + ')');
  await teardown();
}

// Suite 16: getLastScore returns last throw score
async function suite16() {
  console.log('\nSuite 16: getLastScore returns last throw score');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx);
  });
  await page.evaluate(() => window.__test.throwNow());
  const ls = await page.evaluate(() => window.__test.getLastScore());
  assert(ls === 300, 'getLastScore returns 300 after perfect throw (got ' + ls + ')');
  await teardown();
}

// Suite 17: Score accumulates over multiple throws
async function suite17() {
  console.log('\nSuite 17: Score accumulates over multiple throws');
  await setup();
  const sc = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    // Perfect throw on round 0
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx);
    window.__test.throwNow();
    // Advance to next round
    window.__test.update(window.__test.THROW_DUR + window.__test.RESULT_DUR + 0.2);
    // Reset wind and aim for round 1
    window.__test.setWindX(0);
    const tx2 = window.__test.getTargetX();
    window.__test.setAimX(tx2);
    window.__test.throwNow();
    return window.__test.getScore();
  });
  assert(sc === 600, 'score is 600 after two perfect throws (got ' + sc + ')');
  await teardown();
}

// Suite 18: Round advances after complete throw cycle
async function suite18() {
  console.log('\nSuite 18: Round advances after complete throw cycle');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx);
    window.__test.throwNow();
  });
  await page.evaluate(() => window.__test.update(window.__test.THROW_DUR + window.__test.RESULT_DUR + 0.2));
  const r = await page.evaluate(() => window.__test.getRound());
  assert(r === 1, 'round is 1 after completing first throw (got ' + r + ')');
  await teardown();
}

// Suite 19: Phase is throwing immediately after throwNow
async function suite19() {
  console.log('\nSuite 19: Phase is throwing immediately after throwNow');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    window.__test.throwNow();
  });
  const ph = await page.evaluate(() => window.__test.getPhase());
  assert(ph === 'throwing', 'phase is throwing after throwNow (got ' + ph + ')');
  await teardown();
}

// Suite 20: Phase is result after throw animation
async function suite20() {
  console.log('\nSuite 20: Phase is result after throw animation');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    window.__test.throwNow();
    window.__test.update(window.__test.THROW_DUR + 0.1);
  });
  const ph = await page.evaluate(() => window.__test.getPhase());
  assert(ph === 'result', 'phase is result after THROW_DUR (got ' + ph + ')');
  await teardown();
}

// Suite 21: Phase returns to aiming on next round
async function suite21() {
  console.log('\nSuite 21: Phase returns to aiming on next round');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    window.__test.throwNow();
    window.__test.update(window.__test.THROW_DUR + window.__test.RESULT_DUR + 0.2);
  });
  const ph = await page.evaluate(() => window.__test.getPhase());
  assert(ph === 'aiming', 'phase is aiming on round 2 (got ' + ph + ')');
  await teardown();
}

// Suite 22: After MAX_ROUNDS throws, state changes
async function suite22() {
  console.log('\nSuite 22: After MAX_ROUNDS throws state is win or lose');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const dur = window.__test.THROW_DUR + window.__test.RESULT_DUR + 0.2;
    for (let i = 0; i < window.__test.MAX_ROUNDS; i++) {
      const tx = window.__test.getTargetX();
      window.__test.setAimX(tx);
      window.__test.throwNow();
      window.__test.update(dur);
    }
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win' || st === 'lose', 'state is win or lose after MAX_ROUNDS (got ' + st + ')');
  await teardown();
}

// Suite 23: Win when score >= WIN_THRESHOLD
async function suite23() {
  console.log('\nSuite 23: Win state when score >= WIN_THRESHOLD');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const dur = window.__test.THROW_DUR + window.__test.RESULT_DUR + 0.2;
    // All perfect: 300 * 5 = 1500 >= 750
    for (let i = 0; i < window.__test.MAX_ROUNDS; i++) {
      const tx = window.__test.getTargetX();
      window.__test.setAimX(tx);
      window.__test.throwNow();
      window.__test.update(dur);
    }
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win after all perfect throws (got ' + st + ')');
  await teardown();
}

// Suite 24: Lose when score < WIN_THRESHOLD
async function suite24() {
  console.log('\nSuite 24: Lose state when score < WIN_THRESHOLD');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const dur = window.__test.THROW_DUR + window.__test.RESULT_DUR + 0.2;
    // All misses: 0 pts < 750
    for (let i = 0; i < window.__test.MAX_ROUNDS; i++) {
      const tx = window.__test.getTargetX();
      window.__test.setAimX(tx + 200); // way off target
      window.__test.throwNow();
      window.__test.update(dur);
    }
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose after all misses (got ' + st + ')');
  await teardown();
}

// Suite 25: forceWin transitions to win
async function suite25() {
  console.log('\nSuite 25: forceWin transitions to win state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forceWin();
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win after forceWin (got ' + st + ')');
  await teardown();
}

// Suite 26: forceLose transitions to lose
async function suite26() {
  console.log('\nSuite 26: forceLose transitions to lose state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forceLose();
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose after forceLose (got ' + st + ')');
  await teardown();
}

// Suite 27: Wind shifts landing (setWindX 0 vs 3)
async function suite27() {
  console.log('\nSuite 27: Wind shifts landing position');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx);
    // With wind=0: landing = tx (perfect)
    window.__test.setWindX(0);
    const pts0 = window.__test.throwNow();
    window.__test.update(window.__test.THROW_DUR + window.__test.RESULT_DUR + 0.2);

    // With wind=3: landing = tx + 3*22 = tx+66 (miss)
    window.__test.setAimX(tx);
    window.__test.setWindX(3);
    const pts3 = window.__test.throwNow();
    return { pts0, pts3 };
  });
  assert(result.pts0 === 300, 'no wind: perfect score (got ' + result.pts0 + ')');
  assert(result.pts3 === 0, 'wind=3 shifts landing to miss (got ' + result.pts3 + ')');
  await teardown();
}

// Suite 28: PERFECT_DIST <= GOOD_DIST
async function suite28() {
  console.log('\nSuite 28: PERFECT_DIST < GOOD_DIST');
  await setup();
  const ok = await page.evaluate(() => window.__test.PERFECT_DIST < window.__test.GOOD_DIST);
  assert(ok, 'PERFECT_DIST (' + 18 + ') < GOOD_DIST (' + 44 + ')');
  await teardown();
}

// Suite 29: MAX_ROUNDS is 5
async function suite29() {
  console.log('\nSuite 29: MAX_ROUNDS is 5');
  await setup();
  const mr = await page.evaluate(() => window.__test.MAX_ROUNDS);
  assert(mr === 5, 'MAX_ROUNDS is 5 (got ' + mr + ')');
  await teardown();
}

// Suite 30: WIN_THRESHOLD is accessible
async function suite30() {
  console.log('\nSuite 30: WIN_THRESHOLD is accessible');
  await setup();
  const wt = await page.evaluate(() => window.__test.WIN_THRESHOLD);
  assert(typeof wt === 'number' && wt > 0, 'WIN_THRESHOLD is a positive number (got ' + wt + ')');
  await teardown();
}

// Suite 31: Win score > 0 after completing throws
async function suite31() {
  console.log('\nSuite 31: Win score > 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    // Make one perfect throw first
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx);
    window.__test.throwNow();
    window.__test.update(0.1);
    window.__test.forceWin();
  });
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0, 'score > 0 after win (got ' + sc + ')');
  await teardown();
}

// Suite 32: Target X is near expected position (round 0, vx=0)
async function suite32() {
  console.log('\nSuite 32: Target x near ROUND_DEFS[0].tx on round 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const tx = await page.evaluate(() => window.__test.getTargetX());
  assert(Math.abs(tx - 180) < 5, 'target x near 180 on round 0 (got ' + tx.toFixed(1) + ')');
  await teardown();
}

// Suite 33: Target Y is in expected range
async function suite33() {
  console.log('\nSuite 33: Target Y is in upper portion of canvas');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ty = await page.evaluate(() => window.__test.getTargetY());
  assert(ty > 100 && ty < 400, 'target y in range [100,400] (got ' + ty + ')');
  await teardown();
}

// Suite 34: Title screen renders pixels
async function suite34() {
  console.log('\nSuite 34: Title screen renders visible content');
  await setup();
  await page.waitForTimeout(200);
  const bright = await page.evaluate(() => {
    const c = document.getElementById('c');
    const data = c.getContext('2d').getImageData(0, 220, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i+1], data[i+2]);
    return max;
  });
  assert(bright > 30, 'title screen has bright pixels at y=220 (max=' + bright + ')');
  await teardown();
}

// Suite 35: Playing screen renders pixels
async function suite35() {
  console.log('\nSuite 35: Playing screen renders visible content');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const bright = await page.evaluate(() => {
    const c = document.getElementById('c');
    const data = c.getContext('2d').getImageData(0, 300, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i+1], data[i+2]);
    return max;
  });
  assert(bright > 10, 'playing screen has rendered pixels at y=300 (max=' + bright + ')');
  await teardown();
}

// Suite 36: Win screen renders pixels
async function suite36() {
  console.log('\nSuite 36: Win screen renders visible content');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceWin(); });
  await page.waitForTimeout(100);
  const bright = await page.evaluate(() => {
    const c = document.getElementById('c');
    const data = c.getContext('2d').getImageData(0, 200, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i+1], data[i+2]);
    return max;
  });
  assert(bright > 30, 'win screen has bright pixels at y=200 (max=' + bright + ')');
  await teardown();
}

// Suite 37: Lose screen renders pixels
async function suite37() {
  console.log('\nSuite 37: Lose screen renders visible content');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceLose(); });
  await page.waitForTimeout(100);
  const bright = await page.evaluate(() => {
    const c = document.getElementById('c');
    const data = c.getContext('2d').getImageData(0, 200, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i+1], data[i+2]);
    return max;
  });
  assert(bright > 30, 'lose screen has bright pixels at y=200 (max=' + bright + ')');
  await teardown();
}

// Suite 38: Feedback overlay hidden on load
async function suite38() {
  console.log('\nSuite 38: Feedback overlay is hidden on load');
  await setup();
  const disp = await page.evaluate(() => document.getElementById('fb-ov').style.display);
  assert(disp !== 'flex', 'feedback overlay not visible on load (got ' + disp + ')');
  await teardown();
}

// Suite 39: State cycle title -> playing -> lose -> playing
async function suite39() {
  console.log('\nSuite 39: State cycle title -> playing -> lose -> playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  let st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after first startGame');
  await page.evaluate(() => window.__test.forceLose());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose after forceLose');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state returns to playing after restart');
  await teardown();
}

// Suite 40: Console error sweep
async function suite40() {
  console.log('\nSuite 40: No console errors during full session');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx2.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWindX(0);
    const tx = window.__test.getTargetX();
    window.__test.setAimX(tx);
    window.__test.throwNow();
    window.__test.update(1.5);
    window.__test.setAimX(tx + 20);
    window.__test.throwNow();
    window.__test.update(0.5);
    window.__test.forceWin();
  });
  await page.waitForTimeout(100);
  assert(errors.length === 0, 'no console errors (got: ' + errors.join('; ') + ')');
  await teardown();
}

// ── Runner ─────────────────────────────────────────────────
async function run() {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15, suite16,
    suite17, suite18, suite19, suite20, suite21, suite22, suite23, suite24,
    suite25, suite26, suite27, suite28, suite29, suite30, suite31, suite32,
    suite33, suite34, suite35, suite36, suite37, suite38, suite39, suite40,
  ];

  let passed = 0, failed = 0;
  for (const s of suites) {
    try {
      await s();
      passed++;
    } catch (e) {
      console.error(`  ${e.message}`);
      failed++;
      if (browser) { try { await browser.close(); } catch {} browser = null; page = null; }
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
