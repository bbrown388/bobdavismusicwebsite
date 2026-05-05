// Playwright tests for Dust Devil Dance (Game 34)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'dust-devil-dance.html').replace(/\\/g, '/');
const W = 360, H = 640;
let browser, page;
let consoleErrors = [];

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  consoleErrors = [];
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!t.includes('CORS') && !t.includes('Failed to fetch') && !t.includes('net::ERR'))
        consoleErrors.push(t);
    }
  });
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

// Suite 1: Canvas dimensions 360x640
async function suite1() {
  console.log('\nSuite 1: Canvas dimensions 360x640');
  await setup();
  const d = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert(d.w === 360, 'canvas width = 360');
  assert(d.h === 640, 'canvas height = 640');
  await teardown();
}

// Suite 2: Initial state is title
async function suite2() {
  console.log('\nSuite 2: Initial state is title');
  await setup();
  const s = await page.evaluate(() => window.__test.state);
  assert(s === 'title', 'initial state is title');
  await teardown();
}

// Suite 3: Core constants
async function suite3() {
  console.log('\nSuite 3: Core constants');
  await setup();
  const c = await page.evaluate(() => ({
    ct: window.__test.COMPOSE_TIME,
    md: window.__test.MAX_DEVILS,
    ml: window.__test.MIN_PATH_LEN,
    rd: window.__test.RESONANCE_DIST,
    rc: window.__test.RESONANCE_COOLDOWN,
    fe: window.__test.FEEDBACK_ENDPOINT,
  }));
  assert(c.ct === 60, 'COMPOSE_TIME = 60');
  assert(c.md === 5, 'MAX_DEVILS = 5');
  assert(c.ml > 0, 'MIN_PATH_LEN > 0');
  assert(c.rd > 0, 'RESONANCE_DIST > 0');
  assert(c.rc > 0, 'RESONANCE_COOLDOWN > 0');
  assert(typeof c.fe === 'string' && c.fe.startsWith('https'), 'FEEDBACK_ENDPOINT is https URL');
  await teardown();
}

// Suite 4: PENTA has 5 ascending frequencies
async function suite4() {
  console.log('\nSuite 4: PENTA scale structure');
  await setup();
  const r = await page.evaluate(() => {
    const p = window.__test.PENTA;
    return {
      len: p.length,
      allPositive: p.every(f => f > 0),
      ascending: p.every((f, i) => i === 0 || f > p[i - 1]),
    };
  });
  assert(r.len === 5, 'PENTA has 5 entries');
  assert(r.allPositive, 'all PENTA frequencies > 0');
  assert(r.ascending, 'PENTA frequencies are ascending');
  await teardown();
}

// Suite 5: LANDMARKS structure
async function suite5() {
  console.log('\nSuite 5: LANDMARKS structure');
  await setup();
  const r = await page.evaluate(() => {
    const lm = window.__test.LANDMARKS;
    return {
      len: lm.length,
      allHaveFields: lm.every(l => l.name && l.x > 0 && l.y > 0 && l.type),
      types: lm.map(l => l.type),
      hasMesa: lm.some(l => l.type === 'mesa'),
      hasWaterhole: lm.some(l => l.type === 'waterhole'),
    };
  });
  assert(r.len === 4, 'LANDMARKS has 4 entries');
  assert(r.allHaveFields, 'every landmark has name, x, y, type');
  assert(r.hasMesa, 'LANDMARKS includes a mesa');
  assert(r.hasWaterhole, 'LANDMARKS includes a waterhole');
  await teardown();
}

// Suite 6: startGame() resets all state
async function suite6() {
  console.log('\nSuite 6: startGame() resets all state');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.stormT = 30;
    window.__test.resonanceMeter = 0.5;
    window.__test.startGame();
    return {
      state: window.__test.state,
      stormT: window.__test.stormT,
      devilsLen: window.__test.devils.length,
      resonanceMeter: window.__test.resonanceMeter,
      drawingPath: window.__test.drawingPath,
      sparksLen: window.__test.resonanceSparks.length,
    };
  });
  assert(r.state === 'composing', 'state = composing after startGame');
  assert(r.stormT === 0, 'stormT = 0 after startGame');
  assert(r.devilsLen === 0, 'devils = [] after startGame');
  assert(r.resonanceMeter === 0, 'resonanceMeter = 0 after startGame');
  assert(r.drawingPath === null, 'drawingPath = null after startGame');
  assert(r.sparksLen === 0, 'resonanceSparks = [] after startGame');
  await teardown();
}

// Suite 7: pathLength calculations
async function suite7() {
  console.log('\nSuite 7: pathLength() calculations');
  await setup();
  const r = await page.evaluate(() => {
    const fn = window.__test.pathLength;
    const empty = fn([]);
    const single = fn([{ x: 0, y: 0 }]);
    const two = fn([{ x: 0, y: 0 }, { x: 30, y: 40 }]); // 3-4-5 triple = 50
    const straight = fn([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]);
    return { empty, single, two, straight };
  });
  assert(r.empty === 0, 'pathLength([]) = 0');
  assert(r.single === 0, 'pathLength([point]) = 0');
  assert(Math.abs(r.two - 50) < 0.01, 'pathLength 3-4-5 triangle = 50');
  assert(Math.abs(r.straight - 100) < 0.01, 'pathLength of 3 collinear points = 100');
  await teardown();
}

// Suite 8: spawnDevil rejects path too short
async function suite8() {
  console.log('\nSuite 8: spawnDevil rejects short path');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const shortPath = [{ x: 100, y: 200 }, { x: 110, y: 200 }]; // 10px — too short
    const result = window.__test.spawnDevil(shortPath);
    return { result, devilsLen: window.__test.devils.length };
  });
  assert(r.result === false, 'spawnDevil returns false for short path');
  assert(r.devilsLen === 0, 'no devil added for short path');
  await teardown();
}

// Suite 9: spawnDevil accepts valid path
async function suite9() {
  console.log('\nSuite 9: spawnDevil accepts valid path');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 }); // 174px
    const result = window.__test.spawnDevil(longPath);
    return { result, devilsLen: window.__test.devils.length };
  });
  assert(r.result === true, 'spawnDevil returns true for valid path');
  assert(r.devilsLen === 1, '1 devil added for valid path');
  await teardown();
}

// Suite 10: spawnDevil respects MAX_DEVILS limit
async function suite10() {
  console.log('\nSuite 10: spawnDevil respects MAX_DEVILS limit');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const md = window.__test.MAX_DEVILS;
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    for (let k = 0; k < md + 2; k++) window.__test.spawnDevil(longPath);
    return { devilsLen: window.__test.devils.length, maxDevils: md };
  });
  assert(r.devilsLen === r.maxDevils, 'devils.length never exceeds MAX_DEVILS');
  await teardown();
}

// Suite 11: checkResonance increments meter when devils are close
async function suite11() {
  console.log('\nSuite 11: checkResonance increments resonanceMeter');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    const path2 = longPath.map(p => ({ x: p.x + 5, y: p.y + 5 }));
    window.__test.spawnDevil(longPath);
    window.__test.spawnDevil(path2);
    // Force both devils to the same location
    window.__test.devils[0].x = 100; window.__test.devils[0].y = 100;
    window.__test.devils[1].x = 104; window.__test.devils[1].y = 100;
    const meterBefore = window.__test.resonanceMeter;
    window.__test.checkResonance(9999); // large nowSec so cooldown is not an issue
    return { meterBefore, meterAfter: window.__test.resonanceMeter };
  });
  assert(r.meterBefore === 0, 'meter starts at 0');
  assert(r.meterAfter > r.meterBefore, 'resonanceMeter increases when devils overlap');
  await teardown();
}

// Suite 12: checkResonance adds spark when resonance fires
async function suite12() {
  console.log('\nSuite 12: checkResonance adds resonance sparks');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    window.__test.spawnDevil(longPath);
    window.__test.spawnDevil(longPath.map(p => ({ x: p.x + 4, y: p.y })));
    window.__test.devils[0].x = 180; window.__test.devils[0].y = 300;
    window.__test.devils[1].x = 184; window.__test.devils[1].y = 300;
    window.__test.checkResonance(9999);
    return window.__test.resonanceSparks.length;
  });
  assert(r >= 1, 'at least 1 resonance spark added when devils overlap');
  await teardown();
}

// Suite 13: resonanceMeter clamps at 1.0
async function suite13() {
  console.log('\nSuite 13: resonanceMeter clamps at 1.0');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.resonanceMeter = 0.98;
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    window.__test.spawnDevil(longPath);
    window.__test.spawnDevil(longPath.map(p => ({ x: p.x + 3, y: p.y })));
    window.__test.devils[0].x = 100; window.__test.devils[0].y = 200;
    window.__test.devils[1].x = 102; window.__test.devils[1].y = 200;
    window.__test.checkResonance(9999);
    return window.__test.resonanceMeter;
  });
  assert(r <= 1.0, 'resonanceMeter never exceeds 1.0');
  await teardown();
}

// Suite 14: updateDevil advances progress
async function suite14() {
  console.log('\nSuite 14: updateDevil advances devil.progress');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    window.__test.spawnDevil(longPath);
    const d = window.__test.devils[0];
    const p0 = d.progress;
    window.__test.updateDevil(d, 0.5);
    return { p0, p1: d.progress };
  });
  assert(r.p1 !== r.p0, 'devil.progress changes after updateDevil');
  assert(r.p1 >= 0 && r.p1 < 1, 'devil.progress stays in [0, 1)');
  await teardown();
}

// Suite 15: updateDevil moves devil position
async function suite15() {
  console.log('\nSuite 15: updateDevil moves devil x/y position');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6 + 30, y: 200 + i * 2 });
    window.__test.spawnDevil(longPath);
    const d = window.__test.devils[0];
    d.progress = 0;
    const x0 = d.x, y0 = d.y;
    window.__test.updateDevil(d, 1.0);
    return { x0, y0, x1: d.x, y1: d.y, movedX: d.x !== x0 || d.y !== y0 };
  });
  assert(r.movedX, 'devil position changes after updateDevil(dt=1.0)');
  await teardown();
}

// Suite 16: endComposition sets state to result
async function suite16() {
  console.log('\nSuite 16: endComposition() sets state to result');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.endComposition();
    return window.__test.state;
  });
  assert(r === 'result', 'state = result after endComposition');
  await teardown();
}

// Suite 17: resultType saved when 2+ devils
async function suite17() {
  console.log('\nSuite 17: resultType = saved when >= 2 devils placed');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    window.__test.spawnDevil(longPath);
    window.__test.spawnDevil(longPath.map(p => ({ x: p.x, y: p.y + 50 })));
    window.__test.endComposition();
    return window.__test.resultType;
  });
  assert(r === 'saved', 'resultType = saved when 2 devils placed');
  await teardown();
}

// Suite 18: resultType silent when 0 devils
async function suite18() {
  console.log('\nSuite 18: resultType = silent when 0 devils');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    // no devils
    window.__test.endComposition();
    return window.__test.resultType;
  });
  assert(r === 'silent', 'resultType = silent when no devils placed');
  await teardown();
}

// Suite 19: resultType silent when 1 devil
async function suite19() {
  console.log('\nSuite 19: resultType = silent when only 1 devil placed');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    window.__test.spawnDevil(longPath);
    window.__test.endComposition();
    return window.__test.resultType;
  });
  assert(r === 'silent', 'resultType = silent when only 1 devil placed');
  await teardown();
}

// Suite 20: localStorage key stored on win
async function suite20() {
  console.log('\nSuite 20: localStorage stores best resonance on win');
  await setup();
  const r = await page.evaluate(() => {
    localStorage.removeItem('dust_devil_dance_best');
    window.__test.startGame();
    const longPath = [];
    for (let i = 0; i < 30; i++) longPath.push({ x: i * 6, y: 200 });
    window.__test.spawnDevil(longPath);
    window.__test.spawnDevil(longPath.map(p => ({ x: p.x, y: p.y + 50 })));
    window.__test.resonanceMeter = 0.75;
    window.__test.endComposition();
    return { stored: localStorage.getItem('dust_devil_dance_best') };
  });
  assert(r.stored === '75', "localStorage key 'dust_devil_dance_best' stores pct correctly");
  await teardown();
}

// Suite 21: Click on title starts composing
async function suite21() {
  console.log('\nSuite 21: Click on title starts composing state');
  await setup();
  const r = await page.evaluate(() => {
    document.getElementById('c').click();
    return window.__test.state;
  });
  assert(r === 'composing', 'clicking canvas in title state starts composing');
  await teardown();
}

// Suite 22: No console errors on load
async function suite22() {
  console.log('\nSuite 22: No console errors on load');
  await setup();
  await page.waitForTimeout(500);
  assert(consoleErrors.length === 0, 'no console errors (got: ' + consoleErrors.join(', ') + ')');
  await teardown();
}

// Suite 23: Background pixel is not white
async function suite23() {
  console.log('\nSuite 23: Background pixel is not white');
  await setup();
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  });
  assert(!(pixel.r === 255 && pixel.g === 255 && pixel.b === 255), 'background pixel is not white');
  await teardown();
}

// Suite 24: FEEDBACK_ENDPOINT is Google Apps Script URL
async function suite24() {
  console.log('\nSuite 24: FEEDBACK_ENDPOINT is valid Google Apps Script URL');
  await setup();
  const fe = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(fe.includes('script.google.com'), 'FEEDBACK_ENDPOINT points to script.google.com');
  assert(fe.startsWith('https://'), 'FEEDBACK_ENDPOINT starts with https://');
  await teardown();
}

// Suite 25: resamplePath produces correct output
async function suite25() {
  console.log('\nSuite 25: resamplePath() resamples a path to target step count');
  await setup();
  const r = await page.evaluate(() => {
    const fn = window.__test.resamplePath;
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const out = fn(pts, 5);
    return {
      len: out.length,
      first: out[0],
      last: out[4],
      midX: out[2].x,
    };
  });
  assert(r.len === 5, 'resamplePath(pts, 5) returns 5 points');
  assert(r.first.x === 0, 'first resampled point x = 0');
  assert(Math.abs(r.last.x - 100) < 0.01, 'last resampled point x = 100');
  assert(Math.abs(r.midX - 50) < 1, 'mid resampled point x ≈ 50');
  await teardown();
}

// === RUNNER ===
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5,
    suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15,
    suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25,
  ];

  let passed = 0, failed = 0;
  for (const s of suites) {
    try {
      await s();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
    }
  }

  console.log(`\n=== Results: ${passed} suites passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
})();
