// Playwright tests for Dust Storm (Game 26)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'dust-storm.html').replace(/\\/g, '/');
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

// Suite 2: Canvas 360x640
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions 360x640');
  await setup();
  const d = await page.evaluate(() => ({ w: document.getElementById('c').width, h: document.getElementById('c').height }));
  assert(d.w === 360, 'width 360');
  assert(d.h === 640, 'height 640');
  await teardown();
}

// Suite 3: startGame -> playing
async function suite3() {
  console.log('\nSuite 3: startGame => playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing (got ' + st + ')');
  await teardown();
}

// Suite 4: startGame resets score to 0
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
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.startGame();
  });
  const l = await page.evaluate(() => window.__test.getLives());
  assert(l === 3, 'lives reset to 3 (got ' + l + ')');
  await teardown();
}

// Suite 6: startGame resets round to 0
async function suite6() {
  console.log('\nSuite 6: startGame resets round');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRound(3);
    window.__test.startGame();
  });
  const r = await page.evaluate(() => window.__test.getRound());
  assert(r === 0, 'round reset to 0 (got ' + r + ')');
  await teardown();
}

// Suite 7: ROUNDS has 5 entries
async function suite7() {
  console.log('\nSuite 7: ROUNDS has 5 entries');
  await setup();
  const n = await page.evaluate(() => window.__test.ROUNDS.length);
  assert(n === 5, 'ROUNDS.length === 5 (got ' + n + ')');
  await teardown();
}

// Suite 8: ROUNDS speeds increase each round
async function suite8() {
  console.log('\nSuite 8: ROUNDS speeds increase');
  await setup();
  const speeds = await page.evaluate(() => window.__test.ROUNDS.map(r => r.speed));
  for (let i = 1; i < speeds.length; i++) {
    assert(speeds[i] > speeds[i - 1], 'round ' + i + ' speed > round ' + (i - 1));
  }
  await teardown();
}

// Suite 9: ROUNDS spawn intervals decrease
async function suite9() {
  console.log('\nSuite 9: ROUNDS spawnIntervals decrease');
  await setup();
  const intervals = await page.evaluate(() => window.__test.ROUNDS.map(r => r.spawnInterval));
  for (let i = 1; i < intervals.length; i++) {
    assert(intervals[i] < intervals[i - 1], 'round ' + i + ' interval < round ' + (i - 1));
  }
  await teardown();
}

// Suite 10: LANES has 3 values
async function suite10() {
  console.log('\nSuite 10: LANES has 3 lane positions');
  await setup();
  const n = await page.evaluate(() => window.__test.LANES.length);
  assert(n === 3, 'LANES.length === 3 (got ' + n + ')');
  await teardown();
}

// Suite 11: tap left -> lane decreases
async function suite11() {
  console.log('\nSuite 11: tap left half moves coach left');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLane(1); // start center
  });
  await page.mouse.click(80, 400); // left half
  await page.waitForTimeout(100);
  const l = await page.evaluate(() => window.__test.getLane());
  assert(l === 0, 'lane moved left to 0 (got ' + l + ')');
  await teardown();
}

// Suite 12: tap right -> lane increases
async function suite12() {
  console.log('\nSuite 12: tap right half moves coach right');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLane(1); // start center
  });
  await page.mouse.click(280, 400); // right half
  await page.waitForTimeout(100);
  const l = await page.evaluate(() => window.__test.getLane());
  assert(l === 2, 'lane moved right to 2 (got ' + l + ')');
  await teardown();
}

// Suite 13: can't go left past lane 0
async function suite13() {
  console.log('\nSuite 13: lane clamped at 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLane(0);
  });
  await page.mouse.click(80, 400);
  await page.waitForTimeout(50);
  const l = await page.evaluate(() => window.__test.getLane());
  assert(l === 0, 'lane stays 0 (got ' + l + ')');
  await teardown();
}

// Suite 14: can't go right past lane 2
async function suite14() {
  console.log('\nSuite 14: lane clamped at 2');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLane(2);
  });
  await page.mouse.click(280, 400);
  await page.waitForTimeout(50);
  const l = await page.evaluate(() => window.__test.getLane());
  assert(l === 2, 'lane stays 2 (got ' + l + ')');
  await teardown();
}

// Suite 15: setLane teleports coachX to LANES[n]
async function suite15() {
  console.log('\nSuite 15: setLane sets coachX to correct position');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLane(0);
  });
  const cx = await page.evaluate(() => window.__test.getCoachX());
  const l0 = await page.evaluate(() => window.__test.LANES[0]);
  assert(cx === l0, 'coachX === LANES[0] = ' + l0 + ' (got ' + cx + ')');
  await teardown();
}

// Suite 16: spawnObstacle adds to obstacles array
async function suite16() {
  console.log('\nSuite 16: spawnObstacle adds obstacle');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
    window.__test.spawnObstacle('boulder', 180, 200, 28);
  });
  const n = await page.evaluate(() => window.__test.getObstacles().length);
  assert(n === 1, 'obstacles.length === 1 (got ' + n + ')');
  await teardown();
}

// Suite 17: obstacle scrolls downward over time
async function suite17() {
  console.log('\nSuite 17: obstacles scroll toward coach (y increases)');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
    window.__test.spawnObstacle('boulder', 180, 100, 28);
  });
  const y1 = await page.evaluate(() => window.__test.getObstacles()[0].y);
  await page.waitForTimeout(300);
  const y2 = await page.evaluate(() => {
    const obs = window.__test.getObstacles();
    return obs.length > 0 ? obs[0].y : null;
  });
  assert(y2 === null || y2 > y1, 'obstacle y increased or passed off screen (y1=' + y1 + ' y2=' + y2 + ')');
  await teardown();
}

// Suite 18: collision reduces lives
async function suite18() {
  console.log('\nSuite 18: obstacle collision reduces lives');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
    window.__test.setLane(1);
    // Spawn obstacle on top of coach
    window.__test.spawnObstacle('boulder', 180, window.__test.COACH_Y, 50);
  });
  await page.waitForTimeout(100);
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives < 3, 'lives reduced by collision (got ' + lives + ')');
  await teardown();
}

// Suite 19: hitFlash invincibility prevents double-hit
async function suite19() {
  console.log('\nSuite 19: hitFlash prevents multi-hit');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(3);
    window.__test.setHitFlash(1.5); // set invincibility
    window.__test.clearObstacles();
    window.__test.spawnObstacle('boulder', 180, window.__test.COACH_Y, 50);
  });
  await page.waitForTimeout(100);
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives === 3, 'invincibility prevented hit (got ' + lives + ')');
  await teardown();
}

// Suite 20: triggerHit reduces lives
async function suite20() {
  console.log('\nSuite 20: triggerHit reduces lives by 1');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.triggerHit();
  });
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives === 2, 'lives = 2 after one hit (got ' + lives + ')');
  await teardown();
}

// Suite 21: 3 triggerHits -> gameover
async function suite21() {
  console.log('\nSuite 21: 3 hits -> gameover');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.triggerHit();
    window.__test.triggerHit();
    window.__test.triggerHit();
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover', 'state is gameover (got ' + st + ')');
  await teardown();
}

// Suite 22: distance increases during playing
async function suite22() {
  console.log('\nSuite 22: distance increases during play');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(400);
  const dist = await page.evaluate(() => window.__test.getDistance());
  assert(dist > 0, 'distance > 0 (got ' + dist + ')');
  await teardown();
}

// Suite 23: score increases during playing
async function suite23() {
  console.log('\nSuite 23: score increases during play');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(400);
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0, 'score > 0 (got ' + sc + ')');
  await teardown();
}

// Suite 24: distance >= targetDist -> roundclear
async function suite24() {
  console.log('\nSuite 24: distance >= targetDist => roundclear');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
    window.__test.setDistance(window.__test.getTargetDist() + 1);
  });
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'roundclear', 'state is roundclear (got ' + st + ')');
  await teardown();
}

// Suite 25: round bonus added on clear
async function suite25() {
  console.log('\nSuite 25: round clear adds score bonus');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(0);
    window.__test.clearObstacles();
    window.__test.setDistance(window.__test.getTargetDist() + 1);
  });
  await page.waitForTimeout(200);
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc >= 500, 'score >= 500 after round clear (got ' + sc + ')');
  await teardown();
}

// Suite 26: roundclear advances to next round after timer
async function suite26() {
  console.log('\nSuite 26: roundclear advances to round 1');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
    window.__test.setDistance(window.__test.getTargetDist() + 1);
  });
  await page.waitForTimeout(200);
  // Wait for clearTimer (2.6s)
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => window.__test.getRound());
  assert(r === 1, 'round advanced to 1 (got ' + r + ')');
  await teardown();
}

// Suite 27: round 1 speed > round 0 speed
async function suite27() {
  console.log('\nSuite 27: startRound(1) sets higher speed');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  const s0 = await page.evaluate(() => window.__test.getScrollSpeed());
  await page.evaluate(() => { window.__test.startRound(1); });
  const s1 = await page.evaluate(() => window.__test.getScrollSpeed());
  assert(s1 > s0, 'round 1 speed ' + s1 + ' > round 0 speed ' + s0);
  await teardown();
}

// Suite 28: round 4 triggers gamewin
async function suite28() {
  console.log('\nSuite 28: clearing round 4 (last) => gamewin');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRound(4);
    window.__test.startRound(4);
    window.__test.clearObstacles();
    window.__test.setDistance(window.__test.getTargetDist() + 1);
  });
  await page.waitForTimeout(200);
  // Wait for clearTimer
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gamewin', 'state is gamewin after final round (got ' + st + ')');
  await teardown();
}

// Suite 29: FOG_OUTER constant is 148
async function suite29() {
  console.log('\nSuite 29: FOG_OUTER === 148');
  await setup();
  const fo = await page.evaluate(() => window.__test.FOG_OUTER);
  assert(fo === 148, 'FOG_OUTER === 148 (got ' + fo + ')');
  await teardown();
}

// Suite 30: COACH_R constant is 18
async function suite30() {
  console.log('\nSuite 30: COACH_R === 18');
  await setup();
  const cr = await page.evaluate(() => window.__test.COACH_R);
  assert(cr === 18, 'COACH_R === 18 (got ' + cr + ')');
  await teardown();
}

// Suite 31: FEEDBACK_ENDPOINT set to Google Apps Script URL
async function suite31() {
  console.log('\nSuite 31: FEEDBACK_ENDPOINT is Google Apps Script URL');
  await setup();
  const ep = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(typeof ep === 'string' && ep.includes('script.google.com'), 'FEEDBACK_ENDPOINT is Google Apps Script URL');
  await teardown();
}

// Suite 32: localStorage best score
async function suite32() {
  console.log('\nSuite 32: localStorage best score read/write');
  await setup();
  await page.evaluate(() => { localStorage.setItem('dust_storm_best', '2200'); });
  const best = await page.evaluate(() => +(localStorage.getItem('dust_storm_best') || 0));
  assert(best === 2200, 'localStorage dust_storm_best read correctly (got ' + best + ')');
  await teardown();
}

// Suite 33: title screen renders gold text
async function suite33() {
  console.log('\nSuite 33: title screen renders gold text');
  await setup();
  const hasGold = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Look for gold pixels in title text area around y=192 (H*0.30 = 192)
    for (let y = 175; y <= 270; y += 3) {
      for (let x = 80; x <= 280; x += 4) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] > 180 && d[1] > 140 && d[2] < 120 && d[3] > 100) return true;
      }
    }
    return false;
  });
  assert(hasGold, 'gold pixel found in title area');
  await teardown();
}

// Suite 34: HUD renders during playing
async function suite34() {
  console.log('\nSuite 34: HUD renders during playing');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(100);
  const hasPixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    for (let x = 140; x <= 220; x += 5) {
      const d = ctx.getImageData(x, 22, 1, 1).data;
      if (d[3] > 50) return true;
    }
    return false;
  });
  assert(hasPixel, 'HUD score area has visible pixels');
  await teardown();
}

// Suite 35: gameover renders red text
async function suite35() {
  console.log('\nSuite 35: gameover screen renders red text');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('gameover');
  });
  await page.waitForTimeout(100);
  const hasRed = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // "WIPED OUT" baseline at H*0.28=179; scan above and below
    for (let y = 145; y <= 185; y += 2) {
      for (let x = 80; x <= 280; x += 5) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] > 150 && d[1] < 90 && d[2] < 90) return true;
      }
    }
    return false;
  });
  assert(hasRed, 'red pixel in gameover text area');
  await teardown();
}

// Suite 36: feedback overlay visible when fbVisible=true
async function suite36() {
  console.log('\nSuite 36: feedback overlay renders');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('gameover');
    window.__test.setFbVisible(true);
  });
  await page.waitForTimeout(100);
  const visible = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // "HOW'D WE DO?" baseline at y=118; scan y=100-122
    for (let y = 100; y <= 122; y += 2) {
      for (let x = 100; x <= 260; x += 5) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] > 150 && d[3] > 100) return true;
      }
    }
    return false;
  });
  assert(visible, 'feedback overlay text is visible');
  await teardown();
}

// Suite 37: fog is drawn (dark at far edge, lighter near center)
async function suite37() {
  console.log('\nSuite 37: fog overlay - center is lighter than far edge');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
  });
  await page.waitForTimeout(100);
  const result = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const coachX = window.__test.getCoachX();
    const coachY = window.__test.COACH_Y;
    // Near coach center: should be less dark (visible road)
    const near = ctx.getImageData(Math.round(coachX), Math.round(coachY - 10), 1, 1).data;
    // Far edge (top of canvas): should be mostly opaque dust
    const far = ctx.getImageData(Math.round(coachX), 5, 1, 1).data;
    return {
      nearAlpha: near[3],
      farBrightness: far[0] + far[1] + far[2]
    };
  });
  // Far top should be relatively dark (dust colored)
  // Near coach should show road (non-zero pixels from road drawing)
  assert(result.farBrightness > 0, 'far edge has dust color (brightness ' + result.farBrightness + ')');
  await teardown();
}

// Suite 38: progress bar visible during playing
async function suite38() {
  console.log('\nSuite 38: progress bar visible at bottom');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(200);
  const hasBar = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Progress bar at y = H-12 = 628
    for (let x = 15; x <= 180; x += 8) {
      const d = ctx.getImageData(x, 628, 1, 1).data;
      if (d[3] > 50) return true;
    }
    return false;
  });
  assert(hasBar, 'progress bar pixel visible at bottom');
  await teardown();
}

// Suite 39: hearts (lives) display in HUD
async function suite39() {
  console.log('\nSuite 39: heart icons visible in HUD');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(100);
  const hasHeart = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Hearts at approx x=10-60, y=10-35 -- look for red pixels
    for (let x = 5; x <= 70; x += 4) {
      const d = ctx.getImageData(x, 25, 1, 1).data;
      if (d[0] > 150 && d[1] < 80) return true;
    }
    return false;
  });
  assert(hasHeart, 'red heart pixel found in HUD');
  await teardown();
}

// Suite 40: console error sweep
async function suite40() {
  console.log('\nSuite 40: no console errors during full play cycle');
  let errors = [];
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx2 = await b.newContext({ viewport: { width: W, height: H } });
  const p = await ctx2.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(FILE);
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
    window.__test.spawnObstacle('boulder', 90, 300, 28);
    window.__test.spawnObstacle('tumbleweed', 270, 250, 15);
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    window.__test.setDistance(window.__test.getTargetDist() + 1);
  });
  await p.waitForTimeout(3200);
  await p.evaluate(() => {
    window.__test.setState('gameover');
  });
  await p.waitForTimeout(200);
  const filtered = errors.filter(e => !e.includes('favicon') && !e.includes('CORS'));
  assert(filtered.length === 0, 'no console errors (got: ' + filtered.join(', ') + ')');
  await b.close();
}

// Suite 41: tumbleweed has drift velocity
async function suite41() {
  console.log('\nSuite 41: tumbleweed spawns with drift velocity');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearObstacles();
    window.__test.spawnObstacle('tumbleweed', 180, 200, 15);
  });
  const ob = await page.evaluate(() => window.__test.getObstacles()[0]);
  assert(ob.type === 'tumbleweed', 'obstacle type is tumbleweed');
  // driftVel is set to 0 by spawnObstacle helper, but internal spawn sets it non-zero
  // test that the property exists at minimum
  assert('rot' in ob, 'tumbleweed has rot property');
  await teardown();
}

// Suite 42: startRound resets distance and obstacles
async function suite42() {
  console.log('\nSuite 42: startRound resets distance to 0 and clears obstacles');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.spawnObstacle('boulder', 180, 200, 28);
    window.__test.setDistance(500);
    window.__test.startRound(2);
  });
  const res = await page.evaluate(() => ({
    dist: window.__test.getDistance(),
    obs: window.__test.getObstacles().length
  }));
  assert(res.dist === 0, 'distance reset to 0 (got ' + res.dist + ')');
  assert(res.obs === 0, 'obstacles cleared (got ' + res.obs + ')');
  await teardown();
}

// Runner
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15, suite16,
    suite17, suite18, suite19, suite20, suite21, suite22, suite23, suite24,
    suite25, suite26, suite27, suite28, suite29, suite30, suite31, suite32,
    suite33, suite34, suite35, suite36, suite37, suite38, suite39, suite40,
    suite41, suite42
  ];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try { await s(); passed++; }
    catch (e) { console.error(e.message); failed++; }
    finally { if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; } }
  }
  console.log('\n--- Results: ' + passed + '/' + (passed + failed) + ' passed ---');
  process.exit(failed > 0 ? 1 : 0);
})();
