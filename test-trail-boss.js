// Playwright tests for Trail Boss (Game 20)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'trail-boss.html').replace(/\\/g, '/');
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

// Suite 2: Canvas dimensions 360x640
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions 360x640');
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

// Suite 4: startGame resets resources to 1
async function suite4() {
  console.log('\nSuite 4: startGame resets resources to 1');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setResources({ water: 0.2, food: 0.3, axle: 0.1 });
    window.__test.startGame();
  });
  const res = await page.evaluate(() => window.__test.getResources());
  assert(res.water === 1, 'water reset to 1');
  assert(res.food === 1, 'food reset to 1');
  assert(res.axle === 1, 'axle reset to 1');
  await teardown();
}

// Suite 5: startGame resets progress to 0
async function suite5() {
  console.log('\nSuite 5: startGame resets progress to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setProgress(500);
    window.__test.startGame();
  });
  const p = await page.evaluate(() => window.__test.getProgress());
  assert(p === 0, 'progress reset to 0 on startGame');
  await teardown();
}

// Suite 6: startGame resets biomeIdx to 0
async function suite6() {
  console.log('\nSuite 6: startGame resets biomeIdx to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBiome(3);
    window.__test.startGame();
  });
  const bi = await page.evaluate(() => window.__test.getBiomeIdx());
  assert(bi === 0, 'biomeIdx reset to 0 on startGame');
  await teardown();
}

// Suite 7: startGame sets activeEvent to null
async function suite7() {
  console.log('\nSuite 7: startGame clears activeEvent');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.spawnEvent();
    window.__test.startGame();
  });
  const ev = await page.evaluate(() => window.__test.getActiveEvent());
  assert(ev === null, 'activeEvent is null after startGame');
  await teardown();
}

// Suite 8: 5 biomes defined
async function suite8() {
  console.log('\nSuite 8: 5 biomes defined');
  await setup();
  const n = await page.evaluate(() => window.__test.BIOMES.length);
  assert(n === 5, '5 biomes defined');
  await teardown();
}

// Suite 9: Desert biome waterMult >= 2
async function suite9() {
  console.log('\nSuite 9: Desert biome waterMult >= 2');
  await setup();
  const wm = await page.evaluate(() => window.__test.BIOMES[1].waterMult);
  assert(wm >= 2, 'Desert waterMult >= 2 (got ' + wm + ')');
  await teardown();
}

// Suite 10: Mountains biome foodMult >= 2
async function suite10() {
  console.log('\nSuite 10: Mountains biome foodMult >= 2');
  await setup();
  const fm = await page.evaluate(() => window.__test.BIOMES[2].foodMult);
  assert(fm >= 2, 'Mountains foodMult >= 2 (got ' + fm + ')');
  await teardown();
}

// Suite 11: River biome axleMult >= 2
async function suite11() {
  console.log('\nSuite 11: River biome axleMult >= 2');
  await setup();
  const am = await page.evaluate(() => window.__test.BIOMES[4].axleMult);
  assert(am >= 2, 'River axleMult >= 2 (got ' + am + ')');
  await teardown();
}

// Suite 12: BIOME_DUR constant is > 0
async function suite12() {
  console.log('\nSuite 12: BIOME_DUR > 0');
  await setup();
  const bd = await page.evaluate(() => window.__test.BIOME_DUR);
  assert(typeof bd === 'number' && bd > 0, 'BIOME_DUR is a positive number (got ' + bd + ')');
  await teardown();
}

// Suite 13: PROGRESS_RATE > 0
async function suite13() {
  console.log('\nSuite 13: PROGRESS_RATE > 0');
  await setup();
  const pr = await page.evaluate(() => window.__test.PROGRESS_RATE);
  assert(typeof pr === 'number' && pr > 0, 'PROGRESS_RATE is a positive number (got ' + pr + ')');
  await teardown();
}

// Suite 14: DRAIN rates defined for water, food, axle
async function suite14() {
  console.log('\nSuite 14: DRAIN rates defined');
  await setup();
  const d = await page.evaluate(() => window.__test.DRAIN);
  assert(typeof d.water === 'number' && d.water > 0, 'DRAIN.water is positive');
  assert(typeof d.food  === 'number' && d.food  > 0, 'DRAIN.food is positive');
  assert(typeof d.axle  === 'number' && d.axle  > 0, 'DRAIN.axle is positive');
  await teardown();
}

// Suite 15: tickTime advances progress
async function suite15() {
  console.log('\nSuite 15: tickTime advances progress');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => window.__test.getProgress());
  await page.evaluate(() => window.__test.tickTime(1.0));
  const after = await page.evaluate(() => window.__test.getProgress());
  assert(after > before, 'progress increased after tickTime (before=' + before + ', after=' + after + ')');
  await teardown();
}

// Suite 16: tickTime drains water resource
async function suite16() {
  console.log('\nSuite 16: tickTime drains water');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => window.__test.getResources().water);
  await page.evaluate(() => window.__test.tickTime(10.0));
  const after = await page.evaluate(() => window.__test.getResources().water);
  assert(after < before, 'water drained after 10s (before=' + before + ', after=' + after + ')');
  await teardown();
}

// Suite 17: tickTime drains food resource
async function suite17() {
  console.log('\nSuite 17: tickTime drains food');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => window.__test.getResources().food);
  await page.evaluate(() => window.__test.tickTime(10.0));
  const after = await page.evaluate(() => window.__test.getResources().food);
  assert(after < before, 'food drained after 10s (before=' + before + ', after=' + after + ')');
  await teardown();
}

// Suite 18: tickTime drains axle resource
async function suite18() {
  console.log('\nSuite 18: tickTime drains axle');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => window.__test.getResources().axle);
  await page.evaluate(() => window.__test.tickTime(10.0));
  const after = await page.evaluate(() => window.__test.getResources().axle);
  assert(after < before, 'axle drained after 10s (before=' + before + ', after=' + after + ')');
  await teardown();
}

// Suite 19: Water reaching 0 triggers lose state
async function suite19() {
  console.log('\nSuite 19: Water=0 -> lose');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setResources({ water: 0.001, food: 1, axle: 1 });
  });
  await page.evaluate(() => window.__test.tickTime(0.5));
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when water depletes (got ' + st + ')');
  await teardown();
}

// Suite 20: Food reaching 0 triggers lose state
async function suite20() {
  console.log('\nSuite 20: Food=0 -> lose');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setResources({ water: 1, food: 0.001, axle: 1 });
  });
  await page.evaluate(() => window.__test.tickTime(0.5));
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when food depletes (got ' + st + ')');
  await teardown();
}

// Suite 21: Axle reaching 0 triggers lose state
async function suite21() {
  console.log('\nSuite 21: Axle=0 -> lose');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setResources({ water: 1, food: 1, axle: 0.001 });
  });
  await page.evaluate(() => window.__test.tickTime(0.5));
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when axle depletes (got ' + st + ')');
  await teardown();
}

// Suite 22: deathResource set when water runs out
async function suite22() {
  console.log('\nSuite 22: deathResource = Water when water runs out');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setResources({ water: 0.001, food: 1, axle: 1 });
    window.__test.tickTime(0.5);
  });
  const dr = await page.evaluate(() => window.__test.getDeathResource());
  assert(dr === 'Water', 'deathResource is Water (got ' + dr + ')');
  await teardown();
}

// Suite 23: spawnEvent creates an activeEvent
async function suite23() {
  console.log('\nSuite 23: spawnEvent creates activeEvent');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.spawnEvent(); });
  const ev = await page.evaluate(() => window.__test.getActiveEvent());
  assert(ev !== null, 'activeEvent is not null after spawnEvent');
  assert(typeof ev.type === 'string', 'activeEvent has a type');
  assert(ev.timer > 0, 'activeEvent timer > 0');
  await teardown();
}

// Suite 24: Ambush event tapCount starts at 0
async function suite24() {
  console.log('\nSuite 24: Ambush tapCount starts at 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'ambush', timer: 3.5, maxTimer: 3.5, tapCount: 0, resolved: false });
  });
  const ev = await page.evaluate(() => window.__test.getActiveEvent());
  assert(ev.tapCount === 0, 'tapCount is 0 at start (got ' + ev.tapCount + ')');
  await teardown();
}

// Suite 25: Tapping during ambush increments tapCount
async function suite25() {
  console.log('\nSuite 25: Tap during ambush increments tapCount');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'ambush', timer: 3.5, maxTimer: 3.5, tapCount: 0, resolved: false });
    window.__test.handleTap(180, 400);
  });
  const ev = await page.evaluate(() => window.__test.getActiveEvent());
  assert(ev !== null && ev.tapCount === 1, 'tapCount incremented to 1 (got ' + (ev ? ev.tapCount : 'null') + ')');
  await teardown();
}

// Suite 26: 7 taps resolves ambush successfully
async function suite26() {
  console.log('\nSuite 26: 7 taps resolve ambush');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'ambush', timer: 3.5, maxTimer: 3.5, tapCount: 0, resolved: false });
    for (let i = 0; i < 7; i++) window.__test.handleTap(180, 400);
  });
  const ev = await page.evaluate(() => window.__test.getActiveEvent());
  assert(ev === null, 'activeEvent is null after 7 taps (ambush resolved)');
  await teardown();
}

// Suite 27: Ambush success increases bonus
async function suite27() {
  console.log('\nSuite 27: Ambush success increases bonus');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'ambush', timer: 3.5, maxTimer: 3.5, tapCount: 6, resolved: false });
  });
  const bonusBefore = await page.evaluate(() => window.__test.getScore());
  await page.evaluate(() => window.__test.handleTap(180, 400));
  const bonusAfter = await page.evaluate(() => window.__test.getScore());
  assert(bonusAfter > bonusBefore, 'score increased after ambush success (' + bonusBefore + '->' + bonusAfter + ')');
  await teardown();
}

// Suite 28: Ambush failure (expired timer) reduces food
async function suite28() {
  console.log('\nSuite 28: Ambush failure reduces food');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'ambush', timer: 0.01, maxTimer: 3.5, tapCount: 0, resolved: false });
  });
  const foodBefore = await page.evaluate(() => window.__test.getResources().food);
  await page.evaluate(() => window.__test.tickTime(0.1));
  const foodAfter = await page.evaluate(() => window.__test.getResources().food);
  assert(foodAfter < foodBefore, 'food reduced after ambush failure (' + foodBefore + '->' + foodAfter + ')');
  await teardown();
}

// Suite 29: Supply event restores lowest resource
async function suite29() {
  console.log('\nSuite 29: Supply event restores lowest resource');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setResources({ water: 0.5, food: 0.3, axle: 0.9 });
    window.__test.setActiveEvent({ type: 'supply', timer: 3.0, maxTimer: 3.0, tapCount: 0, resolved: false });
    window.__test.handleTap(180, 400);
  });
  const res = await page.evaluate(() => window.__test.getResources());
  assert(res.food > 0.3, 'food (lowest) restored after supply (was 0.3, now ' + res.food + ')');
  await teardown();
}

// Suite 30: River choice left reduces axle
async function suite30() {
  console.log('\nSuite 30: River ford (left tap) reduces axle');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'river', timer: 4.0, maxTimer: 4.0, tapCount: 0, resolved: false });
  });
  const axleBefore = await page.evaluate(() => window.__test.getResources().axle);
  await page.evaluate(() => window.__test.handleTap(80, 400));
  const axleAfter = await page.evaluate(() => window.__test.getResources().axle);
  assert(axleAfter < axleBefore, 'axle reduced after ford (' + axleBefore + '->' + axleAfter + ')');
  await teardown();
}

// Suite 31: River choice right reduces food
async function suite31() {
  console.log('\nSuite 31: River bridge (right tap) reduces food');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'river', timer: 4.0, maxTimer: 4.0, tapCount: 0, resolved: false });
  });
  const foodBefore = await page.evaluate(() => window.__test.getResources().food);
  await page.evaluate(() => window.__test.handleTap(280, 400));
  const foodAfter = await page.evaluate(() => window.__test.getResources().food);
  assert(foodAfter < foodBefore, 'food reduced after bridge (' + foodBefore + '->' + foodAfter + ')');
  await teardown();
}

// Suite 32: Popup spawned on event resolve
async function suite32() {
  console.log('\nSuite 32: Popup spawned on event resolve');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setActiveEvent({ type: 'supply', timer: 3.0, maxTimer: 3.0, tapCount: 0, resolved: false });
    window.__test.handleTap(180, 400);
  });
  const pops = await page.evaluate(() => window.__test.getPopups());
  assert(pops.length > 0, 'popup spawned after supply resolve');
  await teardown();
}

// Suite 33: Progress past BIOME_DUR*5 transitions to win
async function suite33() {
  console.log('\nSuite 33: Completing all progress -> win');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBiome(4);
    window.__test.setProgress(window.__test.BIOME_DUR * 5 - 1);
  });
  await page.evaluate(() => window.__test.tickTime(0.1));
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win after completing all 5 biomes (got ' + st + ')');
  await teardown();
}

// Suite 34: Biome index advances with progress
async function suite34() {
  console.log('\nSuite 34: Biome advances with progress');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setProgress(window.__test.BIOME_DUR * 1 - 1);
  });
  await page.evaluate(() => window.__test.tickTime(0.1));
  const bi = await page.evaluate(() => window.__test.getBiomeIdx());
  assert(bi >= 1, 'biomeIdx advanced to at least 1 (got ' + bi + ')');
  await teardown();
}

// Suite 35: nextEventIn decrements with tickTime
async function suite35() {
  console.log('\nSuite 35: nextEventIn decrements with tickTime');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setNextEventIn(20);
  });
  await page.evaluate(() => window.__test.tickTime(2.0));
  const nev = await page.evaluate(() => window.__test.getNextEventIn());
  assert(nev < 20, 'nextEventIn decreased after tickTime (got ' + nev + ')');
  await teardown();
}

// Suite 36: HUD renders gold pixels in score area
async function suite36() {
  console.log('\nSuite 36: HUD renders gold pixels in score area');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(200);
  const found = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    for (let px = 100; px < 260; px++) {
      for (let py = 14; py < 44; py++) {
        const d = ctx.getImageData(px, py, 1, 1).data;
        if (d[0] > 180 && d[1] > 140 && d[2] < 120 && d[3] > 200) return true;
      }
    }
    return false;
  });
  assert(found, 'gold pixels found in score HUD area');
  await teardown();
}

// Suite 37: FEEDBACK_ENDPOINT set to Google Apps Script URL
async function suite37() {
  console.log('\nSuite 37: FEEDBACK_ENDPOINT set');
  await setup();
  const ok = await page.evaluate(() =>
    typeof FEEDBACK_ENDPOINT === 'string' && FEEDBACK_ENDPOINT.includes('script.google.com')
  );
  assert(ok, 'FEEDBACK_ENDPOINT is set to Google Apps Script URL');
  await teardown();
}

// Suite 38: State cycle title -> playing -> lose -> playing
async function suite38() {
  console.log('\nSuite 38: State cycle title -> playing -> lose -> playing');
  await setup();
  let st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'starts at title');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'transitions to playing');
  await page.evaluate(() => {
    window.__test.setResources({ water: 0.001, food: 1, axle: 1 });
    window.__test.tickTime(0.5);
  });
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'transitions to lose');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'restarts to playing');
  await teardown();
}

// Suite 39: Resources clamped at 0 (never negative)
async function suite39() {
  console.log('\nSuite 39: Resources clamp at 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setResources({ water: 0.001, food: 1, axle: 1 });
    window.__test.tickTime(5.0);
  });
  const res = await page.evaluate(() => window.__test.getResources());
  assert(res.water >= 0, 'water is not negative (got ' + res.water + ')');
  await teardown();
}

// Suite 40: Console error sweep
async function suite40() {
  console.log('\nSuite 40: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx2.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__test.spawnEvent());
  await page.waitForTimeout(300);
  const filtered = errors.filter(e =>
    !e.includes('CORS') && !e.includes('net::ERR_FAILED') && !e.includes('favicon')
  );
  assert(filtered.length === 0, 'no console errors (got: ' + filtered.join(', ') + ')');
  await teardown();
}

// Run all suites
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5,
    suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15,
    suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25,
    suite26, suite27, suite28, suite29, suite30,
    suite31, suite32, suite33, suite34, suite35,
    suite36, suite37, suite38, suite39, suite40,
  ];
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (err) {
      console.error('\n' + err.message);
      failed++;
      if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
    }
  }
  console.log('\n' + passed + '/' + (passed + failed) + ' tests pass');
  process.exit(failed > 0 ? 1 : 0);
})();
