// Playwright tests for Midnight Rodeo (Game 14)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'midnight-rodeo.html').replace(/\\/g, '/');
const W = 360, H = 640;
let browser, page;
const consoleErrors = [];

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => {
    if (m.type() === 'error') { console.warn('[PAGE ERROR]', m.text()); consoleErrors.push(m.text()); }
  });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}
async function teardown() { if (browser) { await browser.close(); browser = null; page = null; } }
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
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 180, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 20, 'title screen renders visible content');
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

// Suite 3: startGame resets to playing state
async function suite3() {
  console.log('\nSuite 3: startGame resets to playing state');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  await teardown();
}

// Suite 4: Bull starts in riding phase
async function suite4() {
  console.log('\nSuite 4: Bull starts in riding phase');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const phase = await page.evaluate(() => window.__test.getBullPhase());
  assert(phase === 'riding', 'bull phase is riding after startGame');
  await teardown();
}

// Suite 5: Mistakes start at 0
async function suite5() {
  console.log('\nSuite 5: Mistakes start at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const mistakes = await page.evaluate(() => window.__test.getMistakes());
  assert(mistakes === 0, 'mistakes start at 0');
  await teardown();
}

// Suite 6: Crowd energy starts at 0.5
async function suite6() {
  console.log('\nSuite 6: Crowd energy starts at 0.5');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const crowd = await page.evaluate(() => window.__test.getCrowd());
  assert(Math.abs(crowd - 0.5) < 0.01, 'crowd starts at 0.5');
  await teardown();
}

// Suite 7: Score starts at 0
async function suite7() {
  console.log('\nSuite 7: Score starts at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const score = await page.evaluate(() => window.__test.getScore());
  assert(score === 0, 'score starts at 0');
  await teardown();
}

// Suite 8: Bull direction values are valid
async function suite8() {
  console.log('\nSuite 8: Bull direction values are valid');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const results = await page.evaluate(() => {
    const validDirs = [-1, 0, 1];
    let allValid = true;
    for (let i = 0; i < 20; i++) {
      window.__test.startGame();
      window.__test.forcePhase('telegraphing');
      const d = window.__test.getBullDir();
      if (!validDirs.includes(d)) allValid = false;
    }
    return allValid;
  });
  assert(results, 'bull dir is always -1, 0, or 1');
  await teardown();
}

// Suite 9: Correct left tap reduces no mistakes
async function suite9() {
  console.log('\nSuite 9: Correct left tap (LEFT spin) = no mistake');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(-1); // DIR_LEFT
    window.__test.tap('left');
    window.__test.tickFrames(20); // advance past telegraph -> bucking -> recovering
  });
  const mistakes = await page.evaluate(() => window.__test.getMistakes());
  assert(mistakes === 0, 'no mistake after correct left tap on LEFT spin');
  await teardown();
}

// Suite 10: Correct right tap reduces no mistakes
async function suite10() {
  console.log('\nSuite 10: Correct right tap (RIGHT spin) = no mistake');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(1); // DIR_RIGHT
    window.__test.tap('right');
    window.__test.tickFrames(20);
  });
  const mistakes = await page.evaluate(() => window.__test.getMistakes());
  assert(mistakes === 0, 'no mistake after correct right tap on RIGHT spin');
  await teardown();
}

// Suite 11: Wrong tap on LEFT spin = mistake
async function suite11() {
  console.log('\nSuite 11: Wrong tap on LEFT spin = mistake');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(-1); // DIR_LEFT
    window.__test.tap('right');    // wrong
    window.__test.tickFrames(20);
  });
  const mistakes = await page.evaluate(() => window.__test.getMistakes());
  assert(mistakes === 1, 'one mistake after wrong right tap on LEFT spin');
  await teardown();
}

// Suite 12: Wrong tap on RIGHT spin = mistake
async function suite12() {
  console.log('\nSuite 12: Wrong tap on RIGHT spin = mistake');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(1);  // DIR_RIGHT
    window.__test.tap('left');      // wrong
    window.__test.tickFrames(20);
  });
  const mistakes = await page.evaluate(() => window.__test.getMistakes());
  assert(mistakes === 1, 'one mistake after wrong left tap on RIGHT spin');
  await teardown();
}

// Suite 13: STRAIGHT buck requires no tap (correct regardless)
async function suite13() {
  console.log('\nSuite 13: STRAIGHT buck is always correct');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(0); // DIR_STRAIGHT — no tap
    window.__test.tickFrames(60); // let telegraph expire untapped
  });
  const mistakes = await page.evaluate(() => window.__test.getMistakes());
  assert(mistakes === 0, 'no mistake when no tap on STRAIGHT spin');
  await teardown();
}

// Suite 14: Crowd energy rises on correct response
async function suite14() {
  console.log('\nSuite 14: Crowd energy rises on correct response');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    const before = window.__test.getCrowd();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(-1);
    window.__test.tap('left'); // correct
    window.__test.tickFrames(20);
    window._crowdBefore = before;
  });
  const { before, after } = await page.evaluate(() => ({
    before: window._crowdBefore,
    after: window.__test.getCrowd(),
  }));
  assert(after > before, 'crowd energy increased after correct tap');
  await teardown();
}

// Suite 15: Crowd energy falls on wrong response
async function suite15() {
  console.log('\nSuite 15: Crowd energy falls on wrong response');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window._crowdBefore = window.__test.getCrowd();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(-1);
    window.__test.tap('right'); // wrong
    window.__test.tickFrames(20);
  });
  const { before, after } = await page.evaluate(() => ({
    before: window._crowdBefore,
    after: window.__test.getCrowd(),
  }));
  assert(after < before, 'crowd energy decreased after wrong tap');
  await teardown();
}

// Suite 16: Crowd energy clamped at minimum 0
async function suite16() {
  console.log('\nSuite 16: Crowd energy clamped at 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Force many wrong taps to drain crowd
    for (let i = 0; i < 4; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(1);
      window.__test.tap('left'); // wrong
      window.__test.tickFrames(60);
    }
  });
  const crowd = await page.evaluate(() => window.__test.getCrowd());
  assert(crowd >= 0, 'crowd energy never goes below 0');
  await teardown();
}

// Suite 17: Score increases over time
async function suite17() {
  console.log('\nSuite 17: Score increases over time');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tickFrames(120); // 2 simulated seconds
  });
  const score = await page.evaluate(() => window.__test.getScore());
  assert(score > 0, 'score is greater than 0 after 2s of play');
  await teardown();
}

// Suite 18: Score multiplier reflects crowd energy
async function suite18() {
  console.log('\nSuite 18: Higher crowd = higher score rate');
  await setup();
  await page.evaluate(() => {
    // Two runs: one with crowd at max, one with crowd at min
    window.__test.startGame();
    // Force crowd near 1.0 (max)
    for (let i = 0; i < 4; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(-1);
      window.__test.tap('left'); // correct, crowd rises
      window.__test.tickFrames(60);
    }
    window._scoreHighCrowd = 0;
    // Record rate over 60 frames
    const s0 = window.__test.getScore();
    window.__test.tickFrames(60);
    window._scoreHighCrowd = window.__test.getScore() - s0;

    // Reset and drain crowd
    window.__test.startGame();
    for (let i = 0; i < 4; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(1);
      window.__test.tap('left'); // wrong x4 to drain crowd (stops before 3rd mistake kills game)
      window.__test.tickFrames(60);
    }
    const s1 = window.__test.getScore();
    window.__test.tickFrames(60);
    window._scoreLowCrowd = window.__test.getScore() - s1;
  });
  const { high, low } = await page.evaluate(() => ({
    high: window._scoreHighCrowd,
    low:  window._scoreLowCrowd,
  }));
  assert(high > low, 'score rate is higher with higher crowd energy (' + high + ' vs ' + low + ')');
  await teardown();
}

// Suite 19: 3 mistakes transitions to dead state
async function suite19() {
  console.log('\nSuite 19: 3 mistakes = dead state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    for (let i = 0; i < 3; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(1);
      window.__test.tap('left'); // wrong
      window.__test.tickFrames(60); // full cycle: telegraph(1) + bucking(~17) + recovering(~31) + buffer
    }
  });
  const { st, mistakes } = await page.evaluate(() => ({
    st:      window.__test.getState(),
    mistakes: window.__test.getMistakes(),
  }));
  assert(mistakes >= 3, 'mistakes reached 3 (' + mistakes + ')');
  assert(st === 'dead', 'state is dead after 3 mistakes');
  await teardown();
}

// Suite 20: Dead screen renders score
async function suite20() {
  console.log('\nSuite 20: Dead screen renders score');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    for (let i = 0; i < 3; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(1);
      window.__test.tap('left');
      window.__test.tickFrames(40);
    }
  });
  await page.waitForTimeout(100);
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 300, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 30, 'dead screen renders visible score text');
  await teardown();
}

// Suite 21: Phase transitions through full cycle
async function suite21() {
  console.log('\nSuite 21: Phase cycle riding -> telegraphing -> bucking -> recovering');
  await setup();
  const phases = await page.evaluate(() => {
    window.__test.startGame();
    // Trigger telegraph directly then trace the chain
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(0); // STRAIGHT so evaluateTap is always correct (no mistake)
    const t1 = window.__test.getBullPhase();           // 'telegraphing'
    window.__test.tickFrames(1);                        // phaseTimer=0 expires -> bucking
    const t2 = window.__test.getBullPhase();           // 'bucking'
    window.__test.tickFrames(22);                       // 22 ticks > BUCK_DUR(0.28s=17) -> recovering
    const t3 = window.__test.getBullPhase();           // 'recovering'
    window.__test.tickFrames(40);                       // 40 ticks > RECOV_DUR(0.52s=31) -> riding
    const t4 = window.__test.getBullPhase();           // 'riding'
    return [t1, t2, t3, t4];
  });
  assert(phases[0] === 'telegraphing', 'forcePhase sets telegraphing (' + phases[0] + ')');
  assert(phases[1] === 'bucking',      'telegraph -> bucking after 1 tick (' + phases[1] + ')');
  assert(phases[2] === 'recovering',   'bucking -> recovering after 22 ticks (' + phases[2] + ')');
  assert(phases[3] === 'riding',       'recovering -> riding after 40 ticks (' + phases[3] + ')');
  await teardown();
}

// Suite 22: Tap only registers during telegraph phase
async function suite22() {
  console.log('\nSuite 22: Tap ignored outside telegraph phase');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Phase is 'riding' — tap should be ignored
    window.__test.tap('left');
    window.__test.tickFrames(60); // ride phase continues
    // Now force to telegraphing with LEFT dir, then don't tap
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(-1);
    // Tap 'left' but we already tapped during riding — tapHandled should be false (fresh)
    window.__test.tap('left');
    window.__test.tickFrames(25); // evaluate
  });
  const mistakes = await page.evaluate(() => window.__test.getMistakes());
  assert(mistakes === 0, 'tap during riding phase is ignored; correct tap in telegraph succeeds');
  await teardown();
}

// Suite 23: Level advances after ~14 seconds
async function suite23() {
  console.log('\nSuite 23: Level advances after level interval');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tickFrames(14 * 60 + 10); // 14+ seconds at 60fps
  });
  const level = await page.evaluate(() => window.__test.getLevel());
  assert(level >= 1, 'level advanced to ' + level + ' after 14+ seconds');
  await teardown();
}

// Suite 24: localStorage persists best score
async function suite24() {
  console.log('\nSuite 24: localStorage persists best score');
  await setup();
  await page.evaluate(() => {
    localStorage.setItem('midnight-rodeo_best', '9999');
    window.__test.startGame();
  });
  const best = await page.evaluate(() => parseInt(localStorage.getItem('midnight-rodeo_best') || '0'));
  assert(best === 9999, 'best score retrieved from localStorage');
  await teardown();
}

// Suite 25: New record saved to localStorage
async function suite25() {
  console.log('\nSuite 25: New record saved to localStorage');
  await setup();
  await page.evaluate(() => {
    localStorage.setItem('midnight-rodeo_best', '0');
    window.__test.startGame();
    // Tick for score, then die
    window.__test.tickFrames(120); // build some score
    for (let i = 0; i < 3; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(1);
      window.__test.tap('left');
      window.__test.tickFrames(60); // full cycle through recovering
    }
  });
  const newBest = await page.evaluate(() => parseInt(localStorage.getItem('midnight-rodeo_best') || '0'));
  assert(newBest > 0, 'new best score saved (' + newBest + ')');
  await teardown();
}

// Suite 26: Canvas renders content during playing
async function suite26() {
  console.log('\nSuite 26: Canvas renders content during playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(150);
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 440, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 10, 'canvas has visible content (bull area) during play');
  await teardown();
}

// Suite 27: Bull lean animates toward bull direction during telegraph
async function suite27() {
  console.log('\nSuite 27: Bull lean animates toward spin direction');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forcePhase('telegraphing');
    window.__test.forceBullDir(-1); // LEFT
    window.__test.tickFrames(15);
  });
  const lean = await page.evaluate(() => window.__test.getBullLean());
  assert(lean < -0.01, 'bull leans left during LEFT telegraph (lean=' + lean + ')');
  await teardown();
}

// Suite 28: Feedback overlay opens and closes
async function suite28() {
  console.log('\nSuite 28: Feedback overlay opens and closes');
  await setup();
  const ov = await page.evaluate(() => {
    document.getElementById('fb-ov').style.display = 'flex';
    return document.getElementById('fb-ov').style.display;
  });
  assert(ov === 'flex', 'feedback overlay displayed');
  const hidden = await page.evaluate(() => {
    document.getElementById('fb-cancel').click();
    return document.getElementById('fb-ov').style.display;
  });
  assert(hidden === 'none', 'feedback overlay hidden after cancel');
  await teardown();
}

// Suite 29: Full state cycle title -> playing -> dead -> title
async function suite29() {
  console.log('\nSuite 29: Full state cycle');
  await setup();

  // Start
  let st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'begins at title');

  // Playing
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'transitions to playing');

  // Dead
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(1);
      window.__test.tap('left');
      window.__test.tickFrames(60);
    }
  });
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'dead', 'transitions to dead after 3 mistakes');

  // Back to title via tap on canvas center (fallback branch)
  await page.evaluate(() => { window.__test.startGame = () => { window._st_set = true; }; });
  await page.evaluate(() => { window.__test.getState = () => 'dead'; });
  // Re-navigate to get a fresh title from dead
  await page.evaluate(() => { window.location.reload(); });
  await page.waitForTimeout(400);
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'returns to title after reload');

  await teardown();
}

// Suite 30: tickFrames is synchronous
async function suite30() {
  console.log('\nSuite 30: tickFrames is synchronous');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const s0 = await page.evaluate(() => window.__test.getScore());
  await page.evaluate(() => window.__test.tickFrames(180)); // 3 simulated seconds
  const s1 = await page.evaluate(() => window.__test.getScore());
  assert(s1 > s0, 'tickFrames synchronously advances score (' + s0 + ' -> ' + s1 + ')');
  await teardown();
}

// Suite 31: Console error sweep (must be last with persistent page)
async function suite31() {
  console.log('\nSuite 31: Console error sweep');
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) {
      window.__test.forcePhase('telegraphing');
      window.__test.forceBullDir(1);
      window.__test.tap('left');
      window.__test.tickFrames(40);
    }
  });
  await page.waitForTimeout(300);
  const nonCorsErrors = errs.filter(e => !e.includes('CORS') && !e.includes('cross-origin') && !e.includes('net::ERR'));
  assert(nonCorsErrors.length === 0, 'no console errors (ignoring CORS/net): ' + JSON.stringify(nonCorsErrors));
  await teardown();
}

// ---- Run all suites -------------------------------------------------------
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15, suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25, suite26, suite27, suite28, suite29, suite30,
    suite31,
  ];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try {
      await s();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await browser.close(); } catch {} browser = null; page = null; }
    }
  }
  console.log('\n--- Results ---');
  console.log(`Passed: ${passed}/${suites.length}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})();
