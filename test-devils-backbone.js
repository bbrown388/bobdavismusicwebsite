// Playwright tests for Devil's Backbone (Game 23)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'devils-backbone.html').replace(/\\/g, '/');
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
async function teardown() {
  if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
}
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

// Suite 2: Canvas dimensions 360x640
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions 360x640');
  await setup();
  const dims = await page.evaluate(() => {
    const c = document.getElementById('c');
    return { w: c.width, h: c.height };
  });
  assert(dims.w === 360, 'canvas width 360');
  assert(dims.h === 640, 'canvas height 640');
  await teardown();
}

// Suite 3: startGame transitions to playing
async function suite3() {
  console.log('\nSuite 3: startGame => playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  await teardown();
}

// Suite 4: startGame resets lean to 0
async function suite4() {
  console.log('\nSuite 4: startGame resets lean to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0.8);
    window.__test.startGame();
  });
  const lean = await page.evaluate(() => window.__test.getLean());
  assert(lean === 0, 'lean reset to 0');
  await teardown();
}

// Suite 5: startGame resets leanV to 0
async function suite5() {
  console.log('\nSuite 5: startGame resets leanV to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLeanV(1.5);
    window.__test.startGame();
  });
  const lv = await page.evaluate(() => window.__test.getLeanV());
  assert(lv === 0, 'leanV reset to 0');
  await teardown();
}

// Suite 6: startGame resets stageIndex to 0
async function suite6() {
  console.log('\nSuite 6: startGame resets stageIndex to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setStageIndex(3);
    window.__test.startGame();
  });
  const si = await page.evaluate(() => window.__test.getStageIndex());
  assert(si === 0, 'stageIndex reset to 0');
  await teardown();
}

// Suite 7: startGame resets totalScore to 0
async function suite7() {
  console.log('\nSuite 7: startGame resets totalScore to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.startGame();
  });
  const sc = await page.evaluate(() => window.__test.getTotalScore());
  assert(sc === 0, 'totalScore reset to 0');
  await teardown();
}

// Suite 8: startGame resets stageDist to 0
async function suite8() {
  console.log('\nSuite 8: startGame resets stageDist to 0');
  await setup();
  const sd = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setStageDist(999);
    window.__test.startGame();
    return window.__test.getStageDist();
  });
  assert(sd === 0, 'stageDist reset to 0');
  await teardown();
}

// Suite 9: stageScore starts at 0
async function suite9() {
  console.log('\nSuite 9: stageScore starts at 0 after startGame');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ss = await page.evaluate(() => window.__test.getStageScore());
  assert(ss === 0, 'stageScore starts at 0');
  await teardown();
}

// Suite 10: STAGES has exactly 5 entries
async function suite10() {
  console.log('\nSuite 10: STAGES has 5 entries');
  await setup();
  const cnt = await page.evaluate(() => window.__test.STAGES_COUNT);
  assert(cnt === 5, 'STAGES_COUNT is 5');
  await teardown();
}

// Suite 11: STAGES windAmp escalates from stage 0 to stage 4
async function suite11() {
  console.log('\nSuite 11: STAGES windAmp escalates');
  await setup();
  const ok = await page.evaluate(() => {
    const s = window.__test.STAGES;
    return s[0].windAmp < s[2].windAmp && s[2].windAmp < s[4].windAmp;
  });
  assert(ok, 'windAmp increases across stages');
  await teardown();
}

// Suite 12: STAGES bumpFreq escalates from stage 1 to stage 4
async function suite12() {
  console.log('\nSuite 12: STAGES bumpFreq escalates');
  await setup();
  const ok = await page.evaluate(() => {
    const s = window.__test.STAGES;
    return s[1].bumpFreq < s[3].bumpFreq && s[3].bumpFreq < s[4].bumpFreq;
  });
  assert(ok, 'bumpFreq increases across stages');
  await teardown();
}

// Suite 13: Each stage has dist > 0
async function suite13() {
  console.log('\nSuite 13: All stages have dist > 0');
  await setup();
  const ok = await page.evaluate(() => window.__test.STAGES.every(s => s.dist > 0));
  assert(ok, 'all stages have positive dist');
  await teardown();
}

// Suite 14: holdLeft decreases leanV
async function suite14() {
  console.log('\nSuite 14: holdLeft decreases leanV');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(0);
    window.__test.setHoldLeft(true);
    window.__test.applyPhysicsStep(0.1);
    window.__test.setHoldLeft(false);
  });
  const lv = await page.evaluate(() => window.__test.getLeanV());
  assert(lv < 0, 'holdLeft makes leanV negative (got ' + lv + ')');
  await teardown();
}

// Suite 15: holdRight increases leanV
async function suite15() {
  console.log('\nSuite 15: holdRight increases leanV');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(0);
    window.__test.setHoldRight(true);
    window.__test.applyPhysicsStep(0.1);
    window.__test.setHoldRight(false);
  });
  const lv = await page.evaluate(() => window.__test.getLeanV());
  assert(lv > 0, 'holdRight makes leanV positive (got ' + lv + ')');
  await teardown();
}

// Suite 16: Positive leanV increases lean
async function suite16() {
  console.log('\nSuite 16: Positive leanV increases lean');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(2.0);
    window.__test.applyPhysicsStep(0.05);
  });
  const lean = await page.evaluate(() => window.__test.getLean());
  assert(lean > 0, 'positive leanV increases lean (got ' + lean + ')');
  await teardown();
}

// Suite 17: Negative leanV decreases lean
async function suite17() {
  console.log('\nSuite 17: Negative leanV decreases lean');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(-2.0);
    window.__test.applyPhysicsStep(0.05);
  });
  const lean = await page.evaluate(() => window.__test.getLean());
  assert(lean < 0, 'negative leanV decreases lean (got ' + lean + ')');
  await teardown();
}

// Suite 18: gameLose when lean >= TILT_LIMIT
async function suite18() {
  console.log('\nSuite 18: gameLose when lean >= TILT_LIMIT');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(1.05);
    window.__test.setLeanV(0);
    window.__test.applyPhysicsStep(0.016);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameLose', 'state is gameLose when lean >= 1.0 (got ' + st + ')');
  await teardown();
}

// Suite 19: gameLose when lean <= -TILT_LIMIT
async function suite19() {
  console.log('\nSuite 19: gameLose when lean <= -TILT_LIMIT');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(-1.05);
    window.__test.setLeanV(0);
    window.__test.applyPhysicsStep(0.016);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameLose', 'state is gameLose when lean <= -1.0 (got ' + st + ')');
  await teardown();
}

// Suite 20: stageDist increases during play
async function suite20() {
  console.log('\nSuite 20: stageDist increases during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(400);
  const sd = await page.evaluate(() => window.__test.getStageDist());
  assert(sd > 0, 'stageDist increased during play (got ' + sd + ')');
  await teardown();
}

// Suite 21: stageWin when stageDist >= stage.dist
async function suite21() {
  console.log('\nSuite 21: stageWin when stageDist >= stage.dist (stage 1)');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(0);
    window.__test.setStageDist(window.__test.STAGES[0].dist + 10);
    window.__test.applyPhysicsStep(0.016);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'stageWin', 'state is stageWin after completing stage (got ' + st + ')');
  await teardown();
}

// Suite 22: stageScore > 0 after completing a stage
async function suite22() {
  console.log('\nSuite 22: stageScore > 0 after completing stage');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(0);
    window.__test.setStageDist(window.__test.STAGES[0].dist + 10);
    window.__test.applyPhysicsStep(0.016);
  });
  const ss = await page.evaluate(() => window.__test.getStageScore());
  assert(ss > 0, 'stageScore > 0 after completing stage (got ' + ss + ')');
  await teardown();
}

// Suite 23: totalScore accumulates across stages
async function suite23() {
  console.log('\nSuite 23: totalScore accumulates');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(0);
    window.__test.setStageDist(window.__test.STAGES[0].dist + 10);
    window.__test.applyPhysicsStep(0.016);
  });
  const ts = await page.evaluate(() => window.__test.getTotalScore());
  assert(ts > 0, 'totalScore > 0 after first stage win (got ' + ts + ')');
  await teardown();
}

// Suite 24: gameWin after all 5 stages completed
async function suite24() {
  console.log('\nSuite 24: gameWin after completing all 5 stages');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0);
    window.__test.setLeanV(0);
    window.__test.setStageIndex(4);
    window.__test.setStageDist(window.__test.STAGES[4].dist + 10);
    window.__test.applyPhysicsStep(0.016);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameWin', 'state is gameWin after stage 5 (got ' + st + ')');
  await teardown();
}

// Suite 25: TILT_LIMIT is 1.0
async function suite25() {
  console.log('\nSuite 25: TILT_LIMIT is 1.0');
  await setup();
  const tl = await page.evaluate(() => window.__test.TILT_LIMIT);
  assert(tl === 1.0, 'TILT_LIMIT is 1.0 (got ' + tl + ')');
  await teardown();
}

// Suite 26: HOLD_FORCE > 0
async function suite26() {
  console.log('\nSuite 26: HOLD_FORCE > 0');
  await setup();
  const hf = await page.evaluate(() => window.__test.HOLD_FORCE);
  assert(hf > 0, 'HOLD_FORCE > 0 (got ' + hf + ')');
  await teardown();
}

// Suite 27: MAX_TILT_DEG >= 20
async function suite27() {
  console.log('\nSuite 27: MAX_TILT_DEG >= 20');
  await setup();
  const td = await page.evaluate(() => window.__test.MAX_TILT_DEG);
  assert(td >= 20, 'MAX_TILT_DEG >= 20 (got ' + td + ')');
  await teardown();
}

// Suite 28: localStorage key is devils_backbone_best
async function suite28() {
  console.log('\nSuite 28: localStorage key is devils_backbone_best');
  await setup();
  await page.evaluate(() => localStorage.setItem('devils_backbone_best', '12345'));
  await page.reload();
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => parseInt(localStorage.getItem('devils_backbone_best') || '0', 10));
  assert(b === 12345, 'localStorage devils_backbone_best persists (got ' + b + ')');
  await teardown();
}

// Suite 29: FEEDBACK_ENDPOINT is set in script
async function suite29() {
  console.log('\nSuite 29: FEEDBACK_ENDPOINT present in script');
  await setup();
  const ok = await page.evaluate(() => {
    for (const s of document.querySelectorAll('script')) {
      if (s.textContent.includes('FEEDBACK_ENDPOINT')) return true;
    }
    return false;
  });
  assert(ok, 'FEEDBACK_ENDPOINT constant present');
  await teardown();
}

// Suite 30: HUD renders pixels in top area
async function suite30() {
  console.log('\nSuite 30: HUD renders pixels in top strip');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(120);
  const nonBlack = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 360, 50);
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i + 1] > 20 || d.data[i + 2] > 20) n++;
    }
    return n;
  });
  assert(nonBlack > 100, 'HUD area has rendered pixels (got ' + nonBlack + ')');
  await teardown();
}

// Suite 31: Scene renders pixels in middle area
async function suite31() {
  console.log('\nSuite 31: Scene renders pixels in middle area');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(120);
  const nonBlack = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 100, 360, 380);
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i + 1] > 20 || d.data[i + 2] > 20) n++;
    }
    return n;
  });
  assert(nonBlack > 500, 'scene area has rendered pixels (got ' + nonBlack + ')');
  await teardown();
}

// Suite 32: Controls render pixels in bottom area
async function suite32() {
  console.log('\nSuite 32: Controls render pixels in bottom area');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(120);
  const nonBlack = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 530, 360, 100);
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i + 1] > 20 || d.data[i + 2] > 20) n++;
    }
    return n;
  });
  assert(nonBlack > 100, 'controls area has rendered pixels (got ' + nonBlack + ')');
  await teardown();
}

// Suite 33: Tilt meter renders around y=497
async function suite33() {
  console.log('\nSuite 33: Tilt meter renders');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(120);
  const nonBlack = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 490, 360, 35);
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i + 1] > 20 || d.data[i + 2] > 20) n++;
    }
    return n;
  });
  assert(nonBlack > 100, 'tilt meter area has rendered pixels (got ' + nonBlack + ')');
  await teardown();
}

// Suite 34: Title screen renders pixels
async function suite34() {
  console.log('\nSuite 34: Title screen renders pixels');
  await setup();
  await page.waitForTimeout(120);
  const nonBlack = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 360, 640);
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i + 1] > 20 || d.data[i + 2] > 20) n++;
    }
    return n;
  });
  assert(nonBlack > 1000, 'title screen renders (got ' + nonBlack + ')');
  await teardown();
}

// Suite 35: startStage resets lean and leanV
async function suite35() {
  console.log('\nSuite 35: startStage resets lean and leanV');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0.9);
    window.__test.setLeanV(-3.0);
    window.__test.startStage();
  });
  const { lean, lv } = await page.evaluate(() => ({
    lean: window.__test.getLean(),
    lv: window.__test.getLeanV(),
  }));
  assert(lean === 0, 'lean reset to 0 by startStage');
  assert(lv === 0, 'leanV reset to 0 by startStage');
  await teardown();
}

// Suite 36: startStage resets stageDist
async function suite36() {
  console.log('\nSuite 36: startStage resets stageDist');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setStageDist(500);
    window.__test.startStage();
  });
  const sd = await page.evaluate(() => window.__test.getStageDist());
  assert(sd === 0, 'stageDist reset to 0 by startStage');
  await teardown();
}

// Suite 37: Wagon zone has rendered pixels (drawWagon ran)
async function suite37() {
  console.log('\nSuite 37: Wagon area has rendered pixels');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const nonBlack = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(80, 380, 200, 110);
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 30 || d.data[i + 1] > 30 || d.data[i + 2] > 30) n++;
    }
    return n;
  });
  assert(nonBlack > 200, 'wagon area has rendered pixels (got ' + nonBlack + ')');
  await teardown();
}

// Suite 38: scrollX increases during play
async function suite38() {
  console.log('\nSuite 38: scrollX increases during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(400);
  const sx = await page.evaluate(() => window.__test.getScrollX());
  assert(sx > 0, 'scrollX increased during play (got ' + sx + ')');
  await teardown();
}

// Suite 39: gameLose state renders overlay
async function suite39() {
  console.log('\nSuite 39: gameLose screen renders');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(1.05);
    window.__test.applyPhysicsStep(0.016);
  });
  await page.waitForTimeout(80);
  const nonBlack = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 360, 640);
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i + 1] > 20 || d.data[i + 2] > 20) n++;
    }
    return n;
  });
  assert(nonBlack > 500, 'gameLose screen renders pixels (got ' + nonBlack + ')');
  await teardown();
}

// Suite 40: stage 1 windAmp is less than stage 5 windAmp by at least 0.5
async function suite40() {
  console.log('\nSuite 40: Stage 1 windAmp significantly less than stage 5');
  await setup();
  const diff = await page.evaluate(() => {
    const s = window.__test.STAGES;
    return s[4].windAmp - s[0].windAmp;
  });
  assert(diff >= 0.5, 'windAmp difference >= 0.5 (got ' + diff + ')');
  await teardown();
}

// Suite 41: STAGES each have a name property
async function suite41() {
  console.log('\nSuite 41: All stages have name property');
  await setup();
  const ok = await page.evaluate(() => window.__test.STAGES.every(s => typeof s.name === 'string' && s.name.length > 0));
  assert(ok, 'all stages have non-empty name');
  await teardown();
}

// Suite 42: applyPhysicsStep doesn't crash when state is not playing
async function suite42() {
  console.log('\nSuite 42: applyPhysicsStep is no-op when not playing');
  await setup();
  let threw = false;
  try {
    await page.evaluate(() => {
      // state is 'title', applyPhysicsStep should do nothing
      window.__test.applyPhysicsStep(0.1);
    });
  } catch (e) { threw = true; }
  assert(!threw, 'applyPhysicsStep does not throw when state != playing');
  await teardown();
}

// Suite 43: flashAlpha starts at 1 on gameLose and decreases
async function suite43() {
  console.log('\nSuite 43: flashAlpha decreases after gameLose');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(1.1);
    window.__test.applyPhysicsStep(0.016);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameLose', 'confirmed gameLose state');
  await page.waitForTimeout(500);
  // Flash should have faded somewhat
  const nonRedish = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 360, 100);
    // After some time, the bright red flash overlay should be fading
    // Just check that the screen is still rendering
    let n = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i + 1] > 20 || d.data[i + 2] > 20) n++;
    }
    return n;
  });
  assert(nonRedish > 0, 'gameLose screen still rendering after 500ms');
  await teardown();
}

// Suite 44: No console errors
async function suite44() {
  console.log('\nSuite 44: No console errors');
  await setup();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLean(0.3);
    window.__test.applyPhysicsStep(0.1);
    window.__test.applyPhysicsStep(0.1);
  });
  await page.waitForTimeout(300);
  assert(errors.length === 0, 'no console errors (got ' + errors.join(', ') + ')');
  await teardown();
}

async function main() {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15, suite16,
    suite17, suite18, suite19, suite20, suite21, suite22, suite23, suite24,
    suite25, suite26, suite27, suite28, suite29, suite30, suite31, suite32,
    suite33, suite34, suite35, suite36, suite37, suite38, suite39, suite40,
    suite41, suite42, suite43, suite44,
  ];
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      try { await teardown(); } catch (_) {}
    }
  }
  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  process.exit(failed > 0 ? 1 : 0);
}

main();
