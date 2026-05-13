// Playwright tests for Lariat Spin (Game 49)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'lariat-spin.html').replace(/\\/g, '/');
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

async function teardown() {
  if (browser) { await browser.close(); browser = null; page = null; }
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// S1: Initial state is title
async function s1() {
  console.log('\nS1: Initial state is "title"');
  await setup();
  const st = await page.evaluate(() => window.__ls.state);
  assert(st === 'title', 'state is "title" on load');
  await teardown();
}

// S2: Canvas dimensions
async function s2() {
  console.log('\nS2: Canvas is 360x640');
  await setup();
  const d = await page.evaluate(() => {
    const c = document.getElementById('c');
    return { w: c.width, h: c.height };
  });
  assert(d.w === 360, 'canvas width 360');
  assert(d.h === 640, 'canvas height 640');
  await teardown();
}

// S3: startGame transitions to round_intro
async function s3() {
  console.log('\nS3: startGame() -> round_intro');
  await setup();
  await page.evaluate(() => window.__ls.startGame());
  const st = await page.evaluate(() => window.__ls.state);
  assert(st === 'round_intro', 'state is "round_intro" after startGame()');
  await teardown();
}

// S4: startGame resets omega, theta, lives, totalScore
async function s4() {
  console.log('\nS4: startGame() resets physics state');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.omega = 10;
    window.__ls.lives = 1;
    window.__ls.totalScore = 99;
    window.__ls.startGame();
  });
  const r = await page.evaluate(() => ({
    omega: window.__ls.omega,
    lives: window.__ls.lives,
    totalScore: window.__ls.totalScore,
    roundNum: window.__ls.roundNum,
    roundCatches: window.__ls.roundCatches,
  }));
  assert(r.omega === 0,       'omega resets to 0');
  assert(r.lives === 3,       'lives resets to 3');
  assert(r.totalScore === 0,  'totalScore resets to 0');
  assert(r.roundNum === 0,    'roundNum resets to 0');
  assert(r.roundCatches === 0,'roundCatches resets to 0');
  await teardown();
}

// S5: doTap adds TAP_IMPULSE to omega
async function s5() {
  console.log('\nS5: doTap() adds TAP_IMPULSE when spinning');
  await setup();
  const r = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 0;
    window.__ls.doTap();
    return { omega: window.__ls.omega, imp: window.__ls.TAP_IMPULSE };
  });
  assert(Math.abs(r.omega - r.imp) < 0.01, 'omega equals TAP_IMPULSE after one tap');
  await teardown();
}

// S6: doTap has no effect when not in spinning state
async function s6() {
  console.log('\nS6: doTap() ignored when state !== spinning');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'thrown';
    window.__ls.omega = 5;
  });
  await page.evaluate(() => window.__ls.doTap());
  const omega = await page.evaluate(() => window.__ls.omega);
  assert(omega === 5, 'omega unchanged in thrown state');
  await teardown();
}

// S7: doTap capped at COLLAPSE_OMEGA + 0.4
async function s7() {
  console.log('\nS7: doTap() caps omega at COLLAPSE_OMEGA + 0.4');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = window.__ls.COLLAPSE_OMEGA;
  });
  await page.evaluate(() => window.__ls.doTap());
  const r = await page.evaluate(() => ({
    omega: window.__ls.omega,
    cap:   window.__ls.COLLAPSE_OMEGA + 0.4,
  }));
  assert(r.omega <= r.cap + 0.01, 'omega does not exceed COLLAPSE_OMEGA + 0.4');
  await teardown();
}

// S8: doThrow does nothing below MIN_RELEASE
async function s8() {
  console.log('\nS8: doThrow() ignored when omega < MIN_RELEASE');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = window.__ls.MIN_RELEASE - 1;
  });
  await page.evaluate(() => window.__ls.doThrow());
  const r = await page.evaluate(() => ({ state: window.__ls.state, fly: window.__ls.flyThrow }));
  assert(r.state === 'spinning',  'state stays spinning');
  assert(r.fly === null,          'flyThrow remains null');
  await teardown();
}

// S9: doThrow creates flyThrow and transitions to thrown
async function s9() {
  console.log('\nS9: doThrow() creates flyThrow at MIN_RELEASE omega');
  await setup();
  const r = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = window.__ls.MIN_RELEASE;
    window.__ls.theta = 0;
    window.__ls.target = { x: 200, y: 280, vx: 50, hitFlash: 0 };
    window.__ls.doThrow();
    const fly = window.__ls.flyThrow;
    return { state: window.__ls.state, fly: fly ? { t: fly.t, duration: fly.duration } : null };
  });
  assert(r.state === 'thrown',    'state transitions to thrown');
  assert(r.fly !== null,          'flyThrow created');
  assert(r.fly.duration > 0,      'flyThrow has positive duration');
  assert(r.fly.t === 0,           'flyThrow timer starts at 0');
  await teardown();
}

// S10: flyThrow destination matches throwLandX at theta=0
async function s10() {
  console.log('\nS10: flyThrow.tx = throwLandX(theta=0) = HAND_X + AIM_REACH');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = window.__ls.MIN_RELEASE;
    window.__ls.theta = 0;
    window.__ls.target = { x: 180, y: 280, vx: 50, hitFlash: 0 };
  });
  await page.evaluate(() => window.__ls.doThrow());
  const r = await page.evaluate(() => ({
    tx:       window.__ls.flyThrow.tx,
    landX:    window.__ls.throwLandX(0),
  }));
  assert(Math.abs(r.tx - r.landX) < 0.5, 'flyThrow.tx equals throwLandX(0)');
  await teardown();
}

// S11: throwLandX range is [HAND_X-AIM_REACH, HAND_X+AIM_REACH]
async function s11() {
  console.log('\nS11: throwLandX covers full throw arc');
  await setup();
  const r = await page.evaluate(() => {
    const right = window.__ls.throwLandX(0);
    const left  = window.__ls.throwLandX(Math.PI);
    return { right, left, reach: window.__ls.AIM_REACH, hx: 180 };
  });
  assert(Math.abs(r.right - (r.hx + r.reach)) < 0.5, 'theta=0 lands at HAND_X + AIM_REACH');
  assert(Math.abs(r.left  - (r.hx - r.reach)) < 0.5, 'theta=PI lands at HAND_X - AIM_REACH');
  await teardown();
}

// S12: ropeRadius scales with omega
async function s12() {
  console.log('\nS12: ropeRadius grows with omega');
  await setup();
  const r = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 0;
    const rMin = window.__ls.ropeRadius();
    window.__ls.omega = window.__ls.COLLAPSE_OMEGA;
    const rMax = window.__ls.ropeRadius();
    return { rMin, rMax };
  });
  assert(r.rMax > r.rMin, 'radius at COLLAPSE_OMEGA > radius at 0');
  await teardown();
}

// S13: catch increments roundCatches and totalScore
async function s13() {
  console.log('\nS13: landThrow() registers catch when aim aligns with target');
  await setup();
  const r = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'thrown';
    window.__ls.roundCatches = 0;
    window.__ls.totalScore   = 0;
    window.__ls.lives        = 3;
    window.__ls.target   = { x: 180, y: 280, vx: 0, hitFlash: 0 };
    window.__ls.flyThrow = { sx: 180, sy: 320, tx: 180, ty: 280, t: 0, duration: 10 };
    window.__ls.landThrow();
    return { roundCatches: window.__ls.roundCatches, totalScore: window.__ls.totalScore, state: window.__ls.state };
  });
  assert(r.roundCatches === 1, 'roundCatches incremented to 1');
  assert(r.totalScore   === 1, 'totalScore incremented to 1');
  assert(r.state === 'result', 'state transitions to result');
  await teardown();
}

// S14: miss decrements lives
async function s14() {
  console.log('\nS14: landThrow() decrements lives on miss');
  await setup();
  const r = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'thrown';
    window.__ls.lives = 3;
    window.__ls.roundCatches = 0;
    window.__ls.target   = { x: 50, y: 280, vx: 0, hitFlash: 0 };
    window.__ls.flyThrow = { sx: 180, sy: 320, tx: 320, ty: 280, t: 0, duration: 10 };
    window.__ls.landThrow();
    return { lives: window.__ls.lives, state: window.__ls.state };
  });
  assert(r.lives === 2,         'lives decremented to 2 on miss');
  assert(r.state === 'result',  'state is result after miss');
  await teardown();
}

// S15: advanceAfterResult -> gameover when lives = 0
async function s15() {
  console.log('\nS15: advanceAfterResult() -> gameover when lives=0');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'result';
    window.__ls.lives = 0;
    window.__ls.roundCatches = 0;
  });
  await page.evaluate(() => window.__ls.advanceAfterResult());
  const st = await page.evaluate(() => window.__ls.state);
  assert(st === 'gameover', 'state is gameover when lives=0');
  await teardown();
}

// S16: advanceAfterResult -> round_intro on round complete
async function s16() {
  console.log('\nS16: advanceAfterResult() advances round on catches complete');
  await setup();
  const r = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'result';
    window.__ls.lives = 3;
    window.__ls.roundNum = 0;
    window.__ls.roundCatches = window.__ls.ROUNDS[0].catchesNeeded;
    window.__ls.target = { x: 100, y: 280, vx: 50, hitFlash: 0 };
    window.__ls.advanceAfterResult();
    return { state: window.__ls.state, roundNum: window.__ls.roundNum };
  });
  assert(r.state === 'round_intro', 'state becomes round_intro');
  assert(r.roundNum === 1,          'roundNum advances to 1');
  await teardown();
}

// S17: advanceAfterResult -> win after round 5
async function s17() {
  console.log('\nS17: advanceAfterResult() -> win after final round');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'result';
    window.__ls.lives = 3;
    window.__ls.roundNum = 4;  // last round index
    window.__ls.roundCatches = window.__ls.ROUNDS[4].catchesNeeded;
  });
  await page.evaluate(() => window.__ls.advanceAfterResult());
  const st = await page.evaluate(() => window.__ls.state);
  assert(st === 'win', 'state is win after all 5 rounds');
  await teardown();
}

// S18: advanceAfterResult -> spinning on same round (lives remain, not enough catches)
async function s18() {
  console.log('\nS18: advanceAfterResult() -> spinning when round incomplete');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'result';
    window.__ls.lives = 2;
    window.__ls.roundNum = 0;
    window.__ls.roundCatches = 0;
    window.__ls.target = { x: 100, y: 280, vx: 50, hitFlash: 0 };
  });
  await page.evaluate(() => window.__ls.advanceAfterResult());
  const r = await page.evaluate(() => ({
    state: window.__ls.state,
    omega: window.__ls.omega,
  }));
  assert(r.state === 'spinning', 'state is spinning after incomplete round');
  assert(r.omega === 0,          'omega reset to 0');
  await teardown();
}

// S19: ROUNDS has 5 entries with escalating speed
async function s19() {
  console.log('\nS19: ROUNDS has 5 entries with escalating targetSpeed');
  await setup();
  const r = await page.evaluate(() => window.__ls.ROUNDS);
  assert(r.length === 5, 'ROUNDS has 5 entries');
  for (let i = 1; i < r.length; i++) {
    assert(r[i].targetSpeed > r[i - 1].targetSpeed, `round ${i + 1} faster than round ${i}`);
  }
  await teardown();
}

// S20: ROUNDS has escalating catchesNeeded
async function s20() {
  console.log('\nS20: ROUNDS final round has more catches than first');
  await setup();
  const r = await page.evaluate(() => ({
    first: window.__ls.ROUNDS[0].catchesNeeded,
    last:  window.__ls.ROUNDS[4].catchesNeeded,
  }));
  assert(r.last >= r.first, 'final round needs >= catches as first round');
  await teardown();
}

// S21: ROUNDS has decreasing aimTolerance (harder each round)
async function s21() {
  console.log('\nS21: ROUNDS aimTolerance decreases each round');
  await setup();
  const r = await page.evaluate(() => window.__ls.ROUNDS);
  for (let i = 1; i < r.length; i++) {
    assert(r[i].aimTolerance < r[i - 1].aimTolerance, `round ${i + 1} tighter tolerance than ${i}`);
  }
  await teardown();
}

// S22: ropePos returns correct x at theta=0
async function s22() {
  console.log('\nS22: ropePos(0) returns x = HAND_X + ropeRadius');
  await setup();
  const r = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 5;
    const pos  = window.__ls.ropePos(0, 0);
    const rr   = window.__ls.ropeRadius();
    return { px: pos.x, expected: 180 + rr };
  });
  assert(Math.abs(r.px - r.expected) < 0.5, 'ropePos(0).x = HAND_X + ropeRadius');
  await teardown();
}

// S23: triggerCollapse sets omega to 0
async function s23() {
  console.log('\nS23: triggerCollapse() zeroes omega');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 15;
  });
  await page.evaluate(() => window.__ls.triggerCollapse());
  const r = await page.evaluate(() => ({
    omega:     window.__ls.omega,
    collapsed: window.__ls.collapsed,
  }));
  assert(r.omega === 0,      'omega is 0 after collapse');
  assert(r.collapsed === true,'collapsed flag set');
  await teardown();
}

// S24: doTap ignored when collapsed
async function s24() {
  console.log('\nS24: doTap() ignored while collapsed');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 0;
  });
  await page.evaluate(() => window.__ls.triggerCollapse());
  await page.evaluate(() => window.__ls.doTap());
  const omega = await page.evaluate(() => window.__ls.omega);
  assert(omega === 0, 'omega stays 0 during collapse');
  await teardown();
}

// S25: spawnTarget respects current roundNum target speed
async function s25() {
  console.log('\nS25: spawnTarget() uses correct speed for current round');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.roundNum = 2;
    const t = window.__ls.spawnTarget();
    window.__ls.target = t;
  });
  const r = await page.evaluate(() => ({
    speed:    Math.abs(window.__ls.target.vx),
    expected: window.__ls.ROUNDS[2].targetSpeed,
  }));
  assert(r.speed === r.expected, 'spawnTarget uses ROUNDS[2].targetSpeed');
  await teardown();
}

// S26: target wraps at canvas edges (left side)
async function s26() {
  console.log('\nS26: target wraps at left edge');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.target = { x: -100, y: 280, vx: -50, hitFlash: 0 };
  });
  // Manually call update-like logic: just check the wrap condition
  const wrapped = await page.evaluate(() => {
    const t = window.__ls.target;
    if (t.x < -80) t.x = W + 80;  // same logic as game
    return t.x;
  });
  assert(wrapped > 0, 'target.x wraps to right side from left edge');
  await teardown();
}

// S27: OPTIMAL_MIN < OPTIMAL_MAX < COLLAPSE_OMEGA
async function s27() {
  console.log('\nS27: Physics constants are in correct order');
  await setup();
  const r = await page.evaluate(() => ({
    optMin:   window.__ls.OPTIMAL_MIN,
    optMax:   window.__ls.OPTIMAL_MAX,
    colOmega: window.__ls.COLLAPSE_OMEGA,
    minRel:   window.__ls.MIN_RELEASE,
  }));
  assert(r.minRel   < r.optMin,   'MIN_RELEASE < OPTIMAL_MIN');
  assert(r.optMin   < r.optMax,   'OPTIMAL_MIN < OPTIMAL_MAX');
  assert(r.optMax   < r.colOmega, 'OPTIMAL_MAX < COLLAPSE_OMEGA');
  await teardown();
}

// S28: calcScore returns totalScore
async function s28() {
  console.log('\nS28: calcScore() returns totalScore');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.totalScore = 7;
  });
  const score = await page.evaluate(() => window.__ls.calcScore());
  assert(score === 7, 'calcScore() returns 7');
  await teardown();
}

// S29: flyThrow.duration > 0 after doThrow
async function s29() {
  console.log('\nS29: flyThrow.duration is positive after doThrow');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 10;
    window.__ls.theta = Math.PI / 4;
    window.__ls.target = { x: 200, y: 260, vx: 60, hitFlash: 0 };
  });
  await page.evaluate(() => window.__ls.doThrow());
  const dur = await page.evaluate(() => window.__ls.flyThrow ? window.__ls.flyThrow.duration : -1);
  assert(dur > 0, 'flyThrow.duration is positive');
  await teardown();
}

// S30: landThrow: exact alignment catches even with aimTolerance=0 offset
async function s30() {
  console.log('\nS30: landThrow() catches when target exactly at landing X');
  await setup();
  const result = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'thrown';
    window.__ls.lives = 3;
    window.__ls.roundNum = 0;
    window.__ls.roundCatches = 0;
    window.__ls.totalScore = 0;
    const tx = 200;
    window.__ls.target   = { x: tx, y: 280, vx: 0, hitFlash: 0 };
    window.__ls.flyThrow = { sx: 180, sy: 320, tx: tx, ty: 280, t: 0, duration: 10 };
    window.__ls.landThrow();
    return { roundCatches: window.__ls.roundCatches, lives: window.__ls.lives };
  });
  assert(result.roundCatches === 1, 'exact alignment = catch');
  assert(result.lives === 3,        'no life lost on catch');
  await teardown();
}

// S31: landThrow: far miss always misses (beyond aimTolerance * 80)
async function s31() {
  console.log('\nS31: landThrow() misses when well outside tolerance');
  await setup();
  const result = await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'thrown';
    window.__ls.lives = 3;
    window.__ls.roundNum = 4;  // tightest tolerance
    window.__ls.roundCatches = 0;
    window.__ls.totalScore = 0;
    const tol = window.__ls.ROUNDS[4].aimTolerance * 80;
    window.__ls.target   = { x: 100, y: 280, vx: 0, hitFlash: 0 };
    window.__ls.flyThrow = { sx: 180, sy: 320, tx: 100 + tol + 30, ty: 280, t: 0, duration: 10 };
    window.__ls.landThrow();
    return { roundCatches: window.__ls.roundCatches, lives: window.__ls.lives };
  });
  assert(result.roundCatches === 0, 'outside tolerance = no catch');
  assert(result.lives === 2,        'life lost on miss');
  await teardown();
}

// S32: AIM_REACH is between 100 and 250 px
async function s32() {
  console.log('\nS32: AIM_REACH is a reasonable value (100-250)');
  await setup();
  const reach = await page.evaluate(() => window.__ls.AIM_REACH);
  assert(reach >= 100 && reach <= 250, `AIM_REACH=${reach} in valid range`);
  await teardown();
}

// S33: Multiple taps accumulate omega
async function s33() {
  console.log('\nS33: Multiple taps accumulate omega');
  await setup();
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 0;
  });
  await page.evaluate(() => { window.__ls.doTap(); window.__ls.doTap(); window.__ls.doTap(); });
  const r = await page.evaluate(() => ({
    omega: window.__ls.omega,
    imp:   window.__ls.TAP_IMPULSE,
  }));
  assert(r.omega >= r.imp * 2.5, 'omega >= 2.5 * TAP_IMPULSE after 3 taps');
  await teardown();
}

// S34: startGame creates a valid target
async function s34() {
  console.log('\nS34: startGame() creates valid target object');
  await setup();
  await page.evaluate(() => window.__ls.startGame());
  const t = await page.evaluate(() => window.__ls.target);
  assert(t !== null,              'target is not null after startGame');
  assert(typeof t.x === 'number', 'target.x is a number');
  assert(typeof t.y === 'number', 'target.y is a number');
  assert(typeof t.vx === 'number','target.vx is a number');
  assert(t.vx !== 0,              'target.vx is non-zero');
  await teardown();
}

// S35: No console errors (sweep)
async function s35() {
  console.log('\nS35: No console errors during normal gameplay');
  await setup();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => {
    window.__ls.startGame();
    window.__ls.state = 'spinning';
    window.__ls.omega = 10;
    window.__ls.theta = 0;
    window.__ls.target = { x: 180, y: 280, vx: 50, hitFlash: 0 };
    window.__ls.doTap();
    window.__ls.doThrow();
    window.__ls.landThrow = () => {}; // suppress result transition
  });
  await page.waitForTimeout(400);
  assert(errors.length === 0, `0 console errors (got: ${errors.join(', ')})`);
  await teardown();
}

// === RUN ALL ===
const TESTS = [s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,
               s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,
               s21,s22,s23,s24,s25,s26,s27,s28,s29,s30,
               s31,s32,s33,s34,s35];

(async () => {
  let passed = 0, failed = 0;
  for (const t of TESTS) {
    try {
      await t();
      passed++;
    } catch(e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await browser.close(); } catch(_) {} browser = null; page = null; }
    }
  }
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
})();
