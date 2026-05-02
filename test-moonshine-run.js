// Playwright tests for Moonshine Run (Game 16)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'moonshine-run.html').replace(/\\/g, '/');
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

// Suite 1: Title screen initial state
async function suite1() {
  console.log('\nSuite 1: Title screen initial state');
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

// Suite 4: Initial gauge values
async function suite4() {
  console.log('\nSuite 4: Initial gauge values');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const h = await page.evaluate(() => window.__test.getHeat());
  const p = await page.evaluate(() => window.__test.getPressure());
  const pr = await page.evaluate(() => window.__test.getProof());
  assert(h >= 50 && h <= 51.5, 'heat starts near 50 (got ' + h + ')');
  assert(p >= 45 && p <= 46.5, 'pressure starts near 45 (got ' + p + ')');
  assert(pr >= 0 && pr <= 1, 'proof starts near 0 (got ' + pr + ')');
  await teardown();
}

// Suite 5: Initial lives and batches
async function suite5() {
  console.log('\nSuite 5: Initial lives and batches');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const lives = await page.evaluate(() => window.__test.getLives());
  const bat   = await page.evaluate(() => window.__test.getBatches());
  assert(lives === 3, 'lives start at 3 (got ' + lives + ')');
  assert(bat === 0, 'batches start at 0 (got ' + bat + ')');
  await teardown();
}

// Suite 6: Score starts at 0
async function suite6() {
  console.log('\nSuite 6: Score starts at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 0, 'score is 0 at start (got ' + sc + ')');
  await teardown();
}

// Suite 7: Heat drifts up over time
async function suite7() {
  console.log('\nSuite 7: Heat drifts up over time');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);
    window.__test.update(2.0);
  });
  const h = await page.evaluate(() => window.__test.getHeat());
  assert(h > 50, 'heat increased after 2s update (got ' + h + ')');
  await teardown();
}

// Suite 8: Pressure drifts up over time
async function suite8() {
  console.log('\nSuite 8: Pressure drifts up over time');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setPressure(40);
    window.__test.update(2.0);
  });
  const p = await page.evaluate(() => window.__test.getPressure());
  assert(p > 40, 'pressure increased after 2s (got ' + p + ')');
  await teardown();
}

// Suite 9: Proof accumulates when heat in safe range
async function suite9() {
  console.log('\nSuite 9: Proof accumulates with heat in safe range');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);   // in safe range [28,75]
    window.__test.setProof(0);
    window.__test.setPressure(40); // safe pressure so no crash
    window.__test.update(3.0);
  });
  const pr = await page.evaluate(() => window.__test.getProof());
  assert(pr > 0, 'proof > 0 after 3s with heat=50 (got ' + pr + ')');
  await teardown();
}

// Suite 10: Proof does NOT accumulate when heat below safe range
async function suite10() {
  console.log('\nSuite 10: Proof does not accumulate when heat below safe range');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(10);   // below HEAT_SAFE[0]=28
    window.__test.setProof(20);
    window.__test.setPressure(30);
    // suppress drift by using small dt
    window.__test.update(0.5);
  });
  const pr = await page.evaluate(() => window.__test.getProof());
  assert(pr <= 20, 'proof did not increase with heat below safe range (got ' + pr + ')');
  await teardown();
}

// Suite 11: tapCool reduces heat
async function suite11() {
  console.log('\nSuite 11: tapCool reduces heat');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(60);
  });
  await page.evaluate(() => window.__test.tapCool());
  const h = await page.evaluate(() => window.__test.getHeat());
  assert(h < 60, 'heat decreased after tapCool (got ' + h + ')');
  await teardown();
}

// Suite 12: tapVent reduces pressure
async function suite12() {
  console.log('\nSuite 12: tapVent reduces pressure');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setPressure(60);
  });
  await page.evaluate(() => window.__test.tapVent());
  const p = await page.evaluate(() => window.__test.getPressure());
  assert(p < 60, 'pressure decreased after tapVent (got ' + p + ')');
  await teardown();
}

// Suite 13: tapMash increases proof
async function suite13() {
  console.log('\nSuite 13: tapMash increases proof');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setProof(30);
  });
  await page.evaluate(() => window.__test.tapMash());
  const pr = await page.evaluate(() => window.__test.getProof());
  assert(pr > 30, 'proof increased after tapMash (got ' + pr + ')');
  await teardown();
}

// Suite 14: tapHide sets hiding = true
async function suite14() {
  console.log('\nSuite 14: tapHide sets hiding = true');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.tapHide());
  const h = await page.evaluate(() => window.__test.getHiding());
  assert(h === true, 'hiding is true after tapHide');
  await teardown();
}

// Suite 15: tapHide while already hiding - no restart
async function suite15() {
  console.log('\nSuite 15: tapHide while hiding does not restart timer');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapHide();
  });
  const t1 = await page.evaluate(() => window.__test.getHideTimer());
  await page.evaluate(() => window.__test.update(0.5));
  await page.evaluate(() => window.__test.tapHide());
  const t2 = await page.evaluate(() => window.__test.getHideTimer());
  assert(t2 < t1, 'hide timer counting down (not restarted) after second tap (t1=' + t1.toFixed(2) + ' t2=' + t2.toFixed(2) + ')');
  await teardown();
}

// Suite 16: tapHide reduces heat
async function suite16() {
  console.log('\nSuite 16: tapHide reduces heat');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(70);
  });
  await page.evaluate(() => window.__test.tapHide());
  const h = await page.evaluate(() => window.__test.getHeat());
  assert(h < 70, 'heat reduced after tapHide (got ' + h + ')');
  await teardown();
}

// Suite 17: After HIDE_DURATION hiding ends and cooldown starts
async function suite17() {
  console.log('\nSuite 17: After HIDE_DURATION hiding ends and cooldown starts');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);
    window.__test.setPressure(40);
    window.__test.tapHide();
    window.__test.update(window.__test.HIDE_DURATION + 0.1);
  });
  const hiding = await page.evaluate(() => window.__test.getHiding());
  const cd     = await page.evaluate(() => window.__test.getHideCd());
  assert(!hiding, 'hiding is false after HIDE_DURATION elapsed');
  assert(cd > 0, 'cooldown started after hide ended (cd=' + cd.toFixed(2) + ')');
  await teardown();
}

// Suite 18: tapHide on cooldown does nothing
async function suite18() {
  console.log('\nSuite 18: tapHide on cooldown has no effect');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);
    window.__test.setPressure(40);
    window.__test.tapHide();
    window.__test.update(window.__test.HIDE_DURATION + 0.1); // hide ends, cd starts
  });
  const h1 = await page.evaluate(() => window.__test.getHeat());
  await page.evaluate(() => window.__test.tapHide()); // should be blocked by cooldown
  const h2 = await page.evaluate(() => window.__test.getHeat());
  assert(h2 >= h1, 'heat did not drop again (hide blocked by cooldown)');
  await teardown();
}

// Suite 19: Critical heat ends game
async function suite19() {
  console.log('\nSuite 19: Critical heat > 90 ends game');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(91);
    window.__test.setPressure(40);
    window.__test.update(0.05);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when heat > 90 (got ' + st + ')');
  await teardown();
}

// Suite 20: Critical pressure ends game
async function suite20() {
  console.log('\nSuite 20: Critical pressure > 88 ends game');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);
    window.__test.setPressure(89);
    window.__test.update(0.05);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when pressure > 88 (got ' + st + ')');
  await teardown();
}

// Suite 21: Proof reaching 100 triggers batch complete and resets
async function suite21() {
  console.log('\nSuite 21: Proof >= 100 triggers batch and resets to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setProof(99.5);
    window.__test.setHeat(50);
    window.__test.setPressure(40);
    window.__test.update(0.5);
  });
  const pr  = await page.evaluate(() => window.__test.getProof());
  const bat = await page.evaluate(() => window.__test.getBatches());
  assert(bat === 1, 'batches incremented to 1 (got ' + bat + ')');
  assert(pr < 50, 'proof reset after batch (got ' + pr + ')');
  await teardown();
}

// Suite 22: 3 batches triggers win
async function suite22() {
  console.log('\nSuite 22: 3 batches triggers win state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBatches(2);
    window.__test.setProof(99.5);
    window.__test.setHeat(50);
    window.__test.setPressure(40);
    window.__test.update(0.5);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win after 3rd batch (got ' + st + ')');
  await teardown();
}

// Suite 23: Detection with revenuer in cone
async function suite23() {
  console.log('\nSuite 23: Revenuer in cone with heat > threshold increases detectProg');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(60);
    const { STILL_X, STILL_Y, makeRevenuer } = window.__test;
    // Place revenuer so its cone covers the still
    const rev = makeRevenuer(STILL_Y, 1, 0);  // dir=1, speed=0 (stationary)
    rev.x = STILL_X - 20;                      // just to the left of still, cone points right
    window.__test.setRevenuers([rev]);
    window.__test.update(0.3);
  });
  const prog = await page.evaluate(() => window.__test.getRevenuers()[0].detectProg);
  assert(prog > 0, 'detectProg > 0 when revenuer cone covers still (got ' + prog.toFixed(3) + ')');
  await teardown();
}

// Suite 24: Detection blocked when hiding
async function suite24() {
  console.log('\nSuite 24: Detection blocked when hiding');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(60);
    window.__test.tapHide();
    const { STILL_X, STILL_Y, makeRevenuer } = window.__test;
    const rev = makeRevenuer(STILL_Y, 1, 0);
    rev.x = STILL_X - 20;
    window.__test.setRevenuers([rev]);
    window.__test.update(0.5);
  });
  const prog = await page.evaluate(() => window.__test.getRevenuers()[0].detectProg);
  assert(prog === 0, 'detectProg stays 0 when hiding (got ' + prog + ')');
  await teardown();
}

// Suite 25: Full detection (detectProg >= DETECT_THRESHOLD) costs a life
async function suite25() {
  console.log('\nSuite 25: Full detection costs one life');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(60);
    window.__test.setPressure(40);
    const { STILL_X, STILL_Y, makeRevenuer, DETECT_THRESHOLD } = window.__test;
    const rev = makeRevenuer(STILL_Y, 1, 0);
    rev.x = STILL_X - 20;
    window.__test.setRevenuers([rev]);
    window.__test.update(DETECT_THRESHOLD + 0.1);
  });
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives < 3, 'lives decreased after full detection (got ' + lives + ')');
  await teardown();
}

// Suite 26: 3 detections triggers lose
async function suite26() {
  console.log('\nSuite 26: 3 detections causes lose state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.setHeat(60);
    window.__test.setPressure(40);
    const { STILL_X, STILL_Y, makeRevenuer, DETECT_THRESHOLD } = window.__test;
    const rev = makeRevenuer(STILL_Y, 1, 0);
    rev.x = STILL_X - 20;
    window.__test.setRevenuers([rev]);
    window.__test.update(DETECT_THRESHOLD + 0.1);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose after final detection (got ' + st + ')');
  await teardown();
}

// Suite 27: coneOverlapsStill - revenuer behind still returns false
async function suite27() {
  console.log('\nSuite 27: coneOverlapsStill returns false when revenuer behind still');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ok = await page.evaluate(() => {
    const { makeRevenuer, coneOverlapsStill, STILL_X, STILL_Y } = window.__test;
    // dir=1 means cone points right; still is to the LEFT of revenuer
    const rev = makeRevenuer(STILL_Y, 1, 0);
    rev.x = STILL_X + 50; // still is behind the revenuer (dx is negative, fwd < 0)
    return coneOverlapsStill(rev);
  });
  assert(!ok, 'coneOverlapsStill returns false when still is behind revenuer');
  await teardown();
}

// Suite 28: coneOverlapsStill - revenuer far away returns false
async function suite28() {
  console.log('\nSuite 28: coneOverlapsStill returns false when revenuer far away');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ok = await page.evaluate(() => {
    const { makeRevenuer, coneOverlapsStill, STILL_X, STILL_Y, CONE_RANGE } = window.__test;
    const rev = makeRevenuer(STILL_Y, 1, 0);
    rev.x = STILL_X - CONE_RANGE - 80; // way out of range
    return coneOverlapsStill(rev);
  });
  assert(!ok, 'coneOverlapsStill returns false when revenuer is out of range');
  await teardown();
}

// Suite 29: forceWin → win state
async function suite29() {
  console.log('\nSuite 29: forceWin transitions to win state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forceWin();
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win after forceWin (got ' + st + ')');
  await teardown();
}

// Suite 30: forceLose → lose state
async function suite30() {
  console.log('\nSuite 30: forceLose transitions to lose state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forceLose();
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose after forceLose (got ' + st + ')');
  await teardown();
}

// Suite 31: Win score > 0
async function suite31() {
  console.log('\nSuite 31: Score > 0 after win');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.update(2.0);
    window.__test.forceWin();
  });
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0, 'score > 0 after win (got ' + sc + ')');
  await teardown();
}

// Suite 32: Steady timer increments when gauges in safe
async function suite32() {
  console.log('\nSuite 32: Steady timer increments when both gauges in safe range');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);      // in [28,75]
    window.__test.setPressure(40);  // in [10,65]
    window.__test.setProof(10);
    window.__test.update(3.0);
  });
  const st = await page.evaluate(() => window.__test.getSteady());
  assert(st > 0, 'steadyTimer > 0 after 3s in safe range (got ' + st.toFixed(2) + ')');
  await teardown();
}

// Suite 33: Steady timer resets when heat exceeds safe upper
async function suite33() {
  console.log('\nSuite 33: Steady timer resets when heat exceeds safe upper bound');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);
    window.__test.setPressure(40);
    window.__test.update(2.0);       // build up streak
    window.__test.setHeat(80);       // exceed HEAT_SAFE[1]=75
    window.__test.update(0.1);
  });
  const st = await page.evaluate(() => window.__test.getSteady());
  assert(st < 1, 'steadyTimer reset when heat exceeded safe upper (got ' + st.toFixed(2) + ')');
  await teardown();
}

// Suite 34: Title screen renders (pixel brightness check)
async function suite34() {
  console.log('\nSuite 34: Title screen renders visible content');
  await setup();
  await page.waitForTimeout(200);
  const bright = await page.evaluate(() => {
    const c = document.getElementById('c');
    const data = c.getContext('2d').getImageData(0, 150, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i+1], data[i+2]);
    return max;
  });
  assert(bright > 30, 'title screen has bright pixels at y=150 (max=' + bright + ')');
  await teardown();
}

// Suite 35: Playing screen renders (pixel check)
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

// Suite 36: Win screen renders
async function suite36() {
  console.log('\nSuite 36: Win screen renders visible content');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceWin(); });
  await page.waitForTimeout(100);
  const bright = await page.evaluate(() => {
    const c = document.getElementById('c');
    const data = c.getContext('2d').getImageData(0, 195, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i+1], data[i+2]);
    return max;
  });
  assert(bright > 30, 'win screen has bright pixels at y=195 (max=' + bright + ')');
  await teardown();
}

// Suite 37: Lose screen renders
async function suite37() {
  console.log('\nSuite 37: Lose screen renders visible content');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceLose(); });
  await page.waitForTimeout(100);
  const bright = await page.evaluate(() => {
    const c = document.getElementById('c');
    const data = c.getContext('2d').getImageData(0, 195, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i+1], data[i+2]);
    return max;
  });
  assert(bright > 30, 'lose screen has bright pixels at y=195 (max=' + bright + ')');
  await teardown();
}

// Suite 38: Feedback overlay exists and is hidden by default
async function suite38() {
  console.log('\nSuite 38: Feedback overlay is hidden on load');
  await setup();
  const disp = await page.evaluate(() => {
    return document.getElementById('fb-ov').style.display;
  });
  assert(disp !== 'flex', 'feedback overlay is not visible on load (got ' + disp + ')');
  await teardown();
}

// Suite 39: State cycle title -> playing -> lose -> title (tap to restart)
async function suite39() {
  console.log('\nSuite 39: State cycle title -> playing -> lose -> restart');
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
  console.log('\nSuite 40: No console errors during full play session');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx2.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(50);
    window.__test.setPressure(40);
    window.__test.update(1.0);
    window.__test.tapCool();
    window.__test.tapVent();
    window.__test.tapMash();
    window.__test.tapHide();
    window.__test.update(1.0);
    window.__test.forceWin();
  });
  await page.waitForTimeout(100);
  assert(errors.length === 0, 'no console errors (got: ' + errors.join('; ') + ')');
  await teardown();
}

// ---- Runner ----------------------------------------------------------
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
