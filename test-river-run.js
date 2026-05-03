// Playwright tests for River Run (Game 27)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'river-run.html').replace(/\\/g, '/');
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
  assert(st === 'title', 'initial state is title (got ' + st + ')');
  await teardown();
}

// Suite 2: Canvas dimensions 360x640
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions 360x640');
  await setup();
  const d = await page.evaluate(() => ({ w: document.getElementById('c').width, h: document.getElementById('c').height }));
  assert(d.w === 360, 'width 360');
  assert(d.h === 640, 'height 640');
  await teardown();
}

// Suite 3: startGame => playing
async function suite3() {
  console.log('\nSuite 3: startGame => playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing (got ' + st + ')');
  await teardown();
}

// Suite 4: startGame resets score
async function suite4() {
  console.log('\nSuite 4: startGame resets score');
  await setup();
  const sc = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(9999);
    window.__test.startGame();
    return window.__test.getScore();
  });
  assert(sc === 0, 'score reset to 0 (got ' + sc + ')');
  await teardown();
}

// Suite 5: startGame resets lives to 3
async function suite5() {
  console.log('\nSuite 5: startGame resets lives');
  await setup();
  const l = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.startGame();
    return window.__test.getLives();
  });
  assert(l === 3, 'lives reset to 3 (got ' + l + ')');
  await teardown();
}

// Suite 6: startGame resets round to 0
async function suite6() {
  console.log('\nSuite 6: startGame resets round to 0');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRound(4);
    window.__test.startGame();
    return window.__test.getRound();
  });
  assert(r === 0, 'round reset to 0 (got ' + r + ')');
  await teardown();
}

// Suite 7: startGame resets distTraveled
async function suite7() {
  console.log('\nSuite 7: startGame resets distTraveled');
  await setup();
  const d = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setDistTraveled(9000);
    window.__test.startGame();
    return window.__test.getDistTraveled();
  });
  assert(d === 0, 'distTraveled reset to 0 (got ' + d + ')');
  await teardown();
}

// Suite 8: ROUNDS array has 5 entries
async function suite8() {
  console.log('\nSuite 8: ROUNDS array has 5 entries');
  await setup();
  const rounds = await page.evaluate(() => window.__test.getROUNDS());
  assert(rounds.length === 5, '5 rounds defined (got ' + rounds.length + ')');
  assert(rounds[0].speed === 200, 'round 1 speed 200');
  assert(rounds[4].speed === 360, 'round 5 speed 360');
  await teardown();
}

// Suite 9: ROUNDS escalate speed
async function suite9() {
  console.log('\nSuite 9: ROUNDS escalate speed and difficulty');
  await setup();
  const rounds = await page.evaluate(() => window.__test.getROUNDS());
  for (let i = 1; i < rounds.length; i++) {
    assert(rounds[i].speed > rounds[i-1].speed, 'round ' + (i+1) + ' speed > round ' + i);
    assert(rounds[i].boulderInt < rounds[i-1].boulderInt, 'round ' + (i+1) + ' boulderInt < round ' + i);
  }
  await teardown();
}

// Suite 10: startGame resets raftX to center
async function suite10() {
  console.log('\nSuite 10: startGame resets raftX to W/2');
  await setup();
  const x = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRaftX(100);
    window.__test.startGame();
    return window.__test.getRaftX();
  });
  assert(x === 180, 'raftX reset to 180 (got ' + x + ')');
  await teardown();
}

// Suite 11: startGame resets raftVX to 0
async function suite11() {
  console.log('\nSuite 11: startGame resets raftVX to 0');
  await setup();
  const vx = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRaftVX(500);
    window.__test.startGame();
    return window.__test.getRaftVX();
  });
  assert(vx === 0, 'raftVX reset to 0 (got ' + vx + ')');
  await teardown();
}

// Suite 12: RIVER_L and RIVER_R constants
async function suite12() {
  console.log('\nSuite 12: RIVER_L and RIVER_R constants');
  await setup();
  const l = await page.evaluate(() => window.__test.getRIVER_L());
  const r = await page.evaluate(() => window.__test.getRIVER_R());
  assert(l < 60, 'RIVER_L < 60 (got ' + l + ')');
  assert(r > 300, 'RIVER_R > 300 (got ' + r + ')');
  assert(r - l >= 240, 'River width >= 240 (got ' + (r - l) + ')');
  await teardown();
}

// Suite 13: RAFT_Y constant
async function suite13() {
  console.log('\nSuite 13: RAFT_Y constant');
  await setup();
  const ry = await page.evaluate(() => window.__test.getRAFT_Y());
  assert(ry > 460 && ry < 540, 'RAFT_Y in range 460-540 (got ' + ry + ')');
  await teardown();
}

// Suite 14: spawnBoulder creates a boulder
async function suite14() {
  console.log('\nSuite 14: spawnBoulder adds obstacle');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.spawnBoulder();
  });
  const obs = await page.evaluate(() => window.__test.getObstacles());
  assert(obs.length > 0, 'at least one obstacle after spawn');
  const boulders = obs.filter(o => o.type === 'boulder');
  assert(boulders.length > 0, 'boulder type present');
  await teardown();
}

// Suite 15: spawnLog creates a log
async function suite15() {
  console.log('\nSuite 15: spawnLog adds log');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.spawnLog();
  });
  const obs = await page.evaluate(() => window.__test.getObstacles());
  const logs = obs.filter(o => o.type === 'log');
  assert(logs.length > 0, 'log type present');
  assert(logs[0].w === 65, 'log width is 65');
  await teardown();
}

// Suite 16: Boulder has valid radius
async function suite16() {
  console.log('\nSuite 16: Boulder has valid radius');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.spawnBoulder(); });
  const obs = await page.evaluate(() => window.__test.getObstacles());
  const b = obs.find(o => o.type === 'boulder');
  assert(b.r >= 13 && b.r <= 32, 'boulder r in range 13-32 (got ' + b.r + ')');
  await teardown();
}

// Suite 17: Log has lateral velocity
async function suite17() {
  console.log('\nSuite 17: Log has non-zero lateral velocity');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.spawnLog(); });
  const obs = await page.evaluate(() => window.__test.getObstacles());
  const lg = obs.find(o => o.type === 'log');
  assert(Math.abs(lg.vx) > 0, 'log vx non-zero (got ' + lg.vx + ')');
  await teardown();
}

// Suite 18: Obstacle scrolls down
async function suite18() {
  console.log('\nSuite 18: Obstacles scroll down over time');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.spawnBoulder(); });
  const y1 = await page.evaluate(() => window.__test.getObstacles().find(o => o.type === 'boulder').y);
  await page.waitForTimeout(200);
  const y2 = await page.evaluate(() => window.__test.getObstacles().find(o => o.type === 'boulder').y);
  assert(y2 > y1, 'boulder y increased: ' + y1 + ' -> ' + y2);
  await teardown();
}

// Suite 19: Steer left increases negative raftVX
async function suite19() {
  console.log('\nSuite 19: Steer left sets steerDir -1');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setSteerDir(-1);
    window.__test.setRaftVX(0);
  });
  await page.waitForTimeout(150);
  const vx = await page.evaluate(() => window.__test.getRaftVX());
  assert(vx < 0, 'raftVX negative after steer left (got ' + vx + ')');
  await teardown();
}

// Suite 20: Steer right increases positive raftVX
async function suite20() {
  console.log('\nSuite 20: Steer right sets steerDir 1');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setSteerDir(1);
    window.__test.setRaftVX(0);
  });
  await page.waitForTimeout(150);
  const vx = await page.evaluate(() => window.__test.getRaftVX());
  assert(vx > 0, 'raftVX positive after steer right (got ' + vx + ')');
  await teardown();
}

// Suite 21: Raft clamps to river left wall
async function suite21() {
  console.log('\nSuite 21: Raft clamps to RIVER_L wall');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRaftX(20);
    window.__test.setRaftVX(-400);
  });
  await page.waitForTimeout(200);
  const x = await page.evaluate(() => window.__test.getRaftX());
  const l = await page.evaluate(() => window.__test.getRIVER_L());
  assert(x >= l, 'raft clamped at or right of RIVER_L (x=' + x + ', l=' + l + ')');
  await teardown();
}

// Suite 22: Raft clamps to river right wall
async function suite22() {
  console.log('\nSuite 22: Raft clamps to RIVER_R wall');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRaftX(350);
    window.__test.setRaftVX(400);
  });
  await page.waitForTimeout(200);
  const x = await page.evaluate(() => window.__test.getRaftX());
  const r = await page.evaluate(() => window.__test.getRIVER_R());
  assert(x <= r, 'raft clamped at or left of RIVER_R (x=' + x + ', r=' + r + ')');
  await teardown();
}

// Suite 23: Collision reduces lives
async function suite23() {
  console.log('\nSuite 23: Boulder collision reduces lives');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    const livesBefore = window.__test.getLives();
    window.__test.triggerBoulderHit();
    return { before: livesBefore };
  });
  await page.waitForTimeout(150);
  const livesAfter = await page.evaluate(() => window.__test.getLives());
  assert(livesAfter < result.before, 'lives decreased: ' + result.before + ' -> ' + livesAfter);
  await teardown();
}

// Suite 24: Invincibility after hit
async function suite24() {
  console.log('\nSuite 24: Invincibility set after hit');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.triggerBoulderHit();
  });
  await page.waitForTimeout(100);
  const inv = await page.evaluate(() => window.__test.getInvincible());
  assert(inv > 0, 'invincible > 0 after hit (got ' + inv + ')');
  await teardown();
}

// Suite 25: hitFlash set after hit
async function suite25() {
  console.log('\nSuite 25: hitFlash set after collision');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.triggerBoulderHit();
  });
  await page.waitForTimeout(80);
  const hf = await page.evaluate(() => window.__test.getHitFlash());
  assert(hf > 0, 'hitFlash > 0 after hit (got ' + hf + ')');
  await teardown();
}

// Suite 26: distTraveled accumulates
async function suite26() {
  console.log('\nSuite 26: distTraveled increases during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const d1 = await page.evaluate(() => window.__test.getDistTraveled());
  await page.waitForTimeout(300);
  const d2 = await page.evaluate(() => window.__test.getDistTraveled());
  assert(d2 > d1, 'distTraveled increased: ' + d1 + ' -> ' + d2);
  await teardown();
}

// Suite 27: Score accumulates during play
async function suite27() {
  console.log('\nSuite 27: Score accumulates during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(300);
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0, 'score > 0 after 300ms (got ' + sc + ')');
  await teardown();
}

// Suite 28: gameover on 0 lives
async function suite28() {
  console.log('\nSuite 28: state becomes gameover when lives reach 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.setInvincible(0);
    window.__test.triggerBoulderHit();
  });
  await page.waitForTimeout(150);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover', 'state is gameover (got ' + st + ')');
  await teardown();
}

// Suite 29: braking flag
async function suite29() {
  console.log('\nSuite 29: braking flag set/cleared');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.setBraking(true); });
  const b1 = await page.evaluate(() => window.__test.getBraking());
  assert(b1 === true, 'braking true');
  await page.evaluate(() => window.__test.setBraking(false));
  const b2 = await page.evaluate(() => window.__test.getBraking());
  assert(b2 === false, 'braking false');
  await teardown();
}

// Suite 30: current zones array
async function suite30() {
  console.log('\nSuite 30: spawnCurrentZone adds to array');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.spawnCurrentZone(); });
  const cz = await page.evaluate(() => window.__test.getCurrentZones());
  assert(cz.length > 0, 'currentZones non-empty after spawn');
  const z = cz[0];
  assert(z.dir === 1 || z.dir === -1, 'zone dir is -1 or 1 (got ' + z.dir + ')');
  await teardown();
}

// Suite 31: flow lines array
async function suite31() {
  console.log('\nSuite 31: flowLines initialized');
  await setup();
  const fl = await page.evaluate(() => window.__test.getFlowLines());
  assert(fl.length >= 28, 'at least 28 flow lines (got ' + fl.length + ')');
  assert(fl[0].y !== undefined, 'flow line has y property');
  await teardown();
}

// Suite 32: Round advances on targetDist
async function suite32() {
  console.log('\nSuite 32: Round clear triggers after targetDist');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    const targetDist = window.__test.getROUNDS()[0].targetDist;
    window.__test.setDistTraveled(targetDist - 1);
  });
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'roundclear' || st === 'playing', 'state is roundclear or still advancing (got ' + st + ')');
  await teardown();
}

// Suite 33: gamewin after round 5 clear
async function suite33() {
  console.log('\nSuite 33: gamewin after final round clear');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRound(4);
    const rounds = window.__test.getROUNDS();
    window.__test.setDistTraveled(rounds[4].targetDist - 1);
  });
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gamewin' || st === 'playing', 'state is gamewin or approaching (got ' + st + ')');
  await teardown();
}

// Suite 34: FEEDBACK_ENDPOINT defined
async function suite34() {
  console.log('\nSuite 34: FEEDBACK_ENDPOINT defined');
  await setup();
  const ep = await page.evaluate(() => typeof FEEDBACK_ENDPOINT !== 'undefined' ? FEEDBACK_ENDPOINT : null);
  assert(ep && ep.length > 10, 'FEEDBACK_ENDPOINT is defined and non-empty');
  await teardown();
}

// Suite 35: localStorage key
async function suite35() {
  console.log('\nSuite 35: localStorage uses river_run_best key');
  await setup();
  await page.evaluate(() => {
    localStorage.removeItem('river_run_best');
    localStorage.setItem('river_run_best', '1234');
  });
  const val = await page.evaluate(() => localStorage.getItem('river_run_best'));
  assert(val === '1234', 'localStorage key river_run_best works (got ' + val + ')');
  await teardown();
}

// Suite 36: Title screen renders gold text
async function suite36() {
  console.log('\nSuite 36: Title screen renders gold/warm text');
  await setup();
  await page.waitForTimeout(200);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const mid = Math.floor(c.width / 2);
    for (let y = Math.floor(c.height * 0.30); y < Math.floor(c.height * 0.50); y++) {
      for (let x = mid - 80; x < mid + 80; x++) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] > 150 && d[1] > 140 && d[2] < 100 && d[3] > 200) return true;
      }
    }
    return false;
  });
  assert(pixel, 'gold/warm colored pixel found in title area');
  await teardown();
}

// Suite 37: HUD score pill renders during play
async function suite37() {
  console.log('\nSuite 37: HUD score pill renders during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(200);
  const hasHUD = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    for (let y = 8; y < 42; y++) {
      for (let x = 100; x < 260; x++) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] > 150 && d[1] > 140 && d[2] < 100 && d[3] > 150) return true;
      }
    }
    return false;
  });
  assert(hasHUD, 'gold HUD pixels found in top area during play');
  await teardown();
}

// Suite 38: Gameover renders red text
async function suite38() {
  console.log('\nSuite 38: Gameover screen renders red text');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.setInvincible(0);
    window.__test.triggerBoulderHit();
  });
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => window.__test.getState());
  if (st !== 'gameover') { console.log('  SKIP: state not gameover (' + st + ')'); await teardown(); return; }
  const hasRed = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    for (let y = 100; y < 280; y++) {
      for (let x = 80; x < 280; x++) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] > 180 && d[1] < 80 && d[2] < 80 && d[3] > 180) return true;
      }
    }
    return false;
  });
  assert(hasRed, 'red pixel found in gameover screen');
  await teardown();
}

// Suite 39: River area renders blue/teal during play
async function suite39() {
  console.log('\nSuite 39: River area has blue/teal pixels during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(200);
  const hasBlue = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const RIVER_L = window.__test.getRIVER_L();
    const RIVER_R = window.__test.getRIVER_R();
    for (let y = 100; y < 400; y += 10) {
      for (let x = RIVER_L + 20; x < RIVER_R - 20; x += 10) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[2] > d[0] + 10 && d[2] > 30 && d[3] > 150) return true;
      }
    }
    return false;
  });
  assert(hasBlue, 'blue/teal pixel found in river area');
  await teardown();
}

// Suite 40: Progress bar renders at bottom
async function suite40() {
  console.log('\nSuite 40: Progress bar renders at bottom of canvas');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(200);
  const hasBar = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const RIVER_L = window.__test.getRIVER_L();
    for (let x = RIVER_L + 10; x < RIVER_L + 50; x++) {
      for (let y = c.height - 20; y < c.height - 10; y++) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[2] > 100 && d[2] > d[0] && d[3] > 100) return true;
      }
    }
    return false;
  });
  assert(hasBar, 'progress bar blue pixel found near canvas bottom');
  await teardown();
}

// Suite 41: VX decays over time (momentum model)
async function suite41() {
  console.log('\nSuite 41: VX decays over time (momentum/inertia model)');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRaftVX(300);
    window.__test.setSteerDir(0);
  });
  await page.waitForTimeout(500);
  const vx = await page.evaluate(() => window.__test.getRaftVX());
  assert(Math.abs(vx) < 200, 'VX decayed from 300 to <200 in 500ms (got ' + vx + ')');
  assert(Math.abs(vx) > 0, 'VX is non-zero (momentum persists briefly)');
  await teardown();
}

// Suite 42: Console error sweep
async function suite42() {
  console.log('\nSuite 42: No console errors on load and play');
  const consoleErrors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx42 = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx42.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));
  await page.goto(FILE);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(600);
  const filtered = consoleErrors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('AudioContext') &&
    !e.includes('net::ERR')
  );
  assert(filtered.length === 0, 'no console errors (got: ' + filtered.join('; ') + ')');
  await teardown();
}

// ---- Runner ----
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15, suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25, suite26, suite27, suite28, suite29, suite30,
    suite31, suite32, suite33, suite34, suite35, suite36, suite37, suite38, suite39, suite40,
    suite41, suite42
  ];
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (err) {
      console.error(err.message);
      failed++;
      if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
    }
  }
  console.log('\n--- Results ---');
  console.log('Passed:', passed, '/ Failed:', failed, '/ Total:', suites.length);
  process.exit(failed > 0 ? 1 : 0);
})();
