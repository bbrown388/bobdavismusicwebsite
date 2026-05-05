// Playwright tests for Tumbleweed Pinball (Game 30)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'tumbleweed-pinball.html').replace(/\\/g, '/');
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
function approx(a, b, tol) { return Math.abs(a - b) <= tol; }

function tickFrames(n, dt) {
  return page.evaluate(([n, dt]) => {
    for (let i = 0; i < n; i++) window.__test.update(dt);
  }, [n, dt || 0.016]);
}

// Suite 1: Initial state is title
async function suite1() {
  console.log('\nSuite 1: Initial state is title');
  await setup();
  const st = await page.evaluate(() => window.__test.phase);
  assert(st === 'title', 'initial phase is title (got ' + st + ')');
  await teardown();
}

// Suite 2: Canvas dimensions 360x640
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions 360x640');
  await setup();
  const d = await page.evaluate(() => ({ w: document.getElementById('c').width, h: document.getElementById('c').height }));
  assert(d.w === 360, 'canvas width 360');
  assert(d.h === 640, 'canvas height 640');
  await teardown();
}

// Suite 3: startGame => phase playing
async function suite3() {
  console.log('\nSuite 3: startGame => playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.phase);
  assert(st === 'playing', 'phase is playing after startGame');
  await teardown();
}

// Suite 4: startGame resets score to 0
async function suite4() {
  console.log('\nSuite 4: startGame resets score to 0');
  await setup();
  const sc = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(9999);
    window.__test.startGame();
    return window.__test.score;
  });
  assert(sc === 0, 'score reset to 0');
  await teardown();
}

// Suite 5: startGame resets balls to 3
async function suite5() {
  console.log('\nSuite 5: startGame resets balls to 3');
  await setup();
  const b = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBalls(0);
    window.__test.startGame();
    return window.__test.balls;
  });
  assert(b === 3, 'balls reset to 3');
  await teardown();
}

// Suite 6: startGame resets chain to 1
async function suite6() {
  console.log('\nSuite 6: startGame resets chain to 1');
  await setup();
  const c = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setChain(8);
    window.__test.startGame();
    return window.__test.chain;
  });
  assert(c === 1, 'chain reset to 1');
  await teardown();
}

// Suite 7: ballAlive true after startGame
async function suite7() {
  console.log('\nSuite 7: ballAlive true after startGame');
  await setup();
  const alive = await page.evaluate(() => {
    window.__test.startGame();
    return window.__test.ballAlive;
  });
  assert(alive === true, 'ball is alive after startGame');
  await teardown();
}

// Suite 8: Ball spawns near center-top
async function suite8() {
  console.log('\nSuite 8: Ball spawns near center-top');
  await setup();
  const pos = await page.evaluate(() => {
    window.__test.startGame();
    return { x: window.__test.ball.x, y: window.__test.ball.y };
  });
  assert(pos.x > 140 && pos.x < 220, 'ball spawns near center x: ' + pos.x);
  assert(pos.y < 110, 'ball spawns near top y: ' + pos.y);
  await teardown();
}

// Suite 9: 5 bumpers defined with correct radii
async function suite9() {
  console.log('\nSuite 9: 5 bumpers with correct radius');
  await setup();
  const res = await page.evaluate(() => {
    const b = window.__test.BUMPERS;
    return { count: b.length, allRadius: b.every(b => b.r === window.__test.BUMPER_R) };
  });
  assert(res.count === 5, '5 bumpers defined');
  assert(res.allRadius, 'all bumpers have BUMPER_R radius');
  await teardown();
}

// Suite 10: 3 targets defined
async function suite10() {
  console.log('\nSuite 10: 3 targets defined');
  await setup();
  const res = await page.evaluate(() => {
    const t = window.__test.TARGETS;
    return { count: t.length, allNotHit: t.every(t => !t.hit) };
  });
  assert(res.count === 3, '3 targets defined');
  assert(res.allNotHit, 'all targets start as not hit');
  await teardown();
}

// Suite 11: Gravity accelerates ball downward
async function suite11() {
  console.log('\nSuite 11: Gravity accelerates ball downward');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    // Place ball away from bumpers (all bumpers are above y=250)
    window.__test.setBall(280, 450, 0, 0);
    const vy0 = window.__test.ball.vy;
    window.__test.update(0.1);
    return { vy0, vy1: window.__test.ball.vy };
  });
  assert(res.vy1 > res.vy0, 'vy increases due to gravity (vy0=' + res.vy0 + ' vy1=' + res.vy1 + ')');
  await teardown();
}

// Suite 12: Ball bounces off left wall
async function suite12() {
  console.log('\nSuite 12: Ball bounces off left wall');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBall(window.__test.WALL_L - 5, 300, -200, 0);
    window.__test.update(0.016);
    return { x: window.__test.ball.x, vx: window.__test.ball.vx };
  });
  assert(res.vx > 0, 'vx is positive after left wall bounce (vx=' + res.vx + ')');
  assert(res.x >= 22 + 11, 'ball x >= WALL_L + BALL_R (x=' + res.x + ')');
  await teardown();
}

// Suite 13: Ball bounces off right wall
async function suite13() {
  console.log('\nSuite 13: Ball bounces off right wall');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBall(window.__test.WALL_R + 5, 300, 200, 0);
    window.__test.update(0.016);
    return { vx: window.__test.ball.vx };
  });
  assert(res.vx < 0, 'vx is negative after right wall bounce');
  await teardown();
}

// Suite 14: Ball bounces off top wall
async function suite14() {
  console.log('\nSuite 14: Ball bounces off top wall');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBall(180, window.__test.WALL_T - 5, 0, -200);
    window.__test.update(0.016);
    return { vy: window.__test.ball.vy };
  });
  assert(res.vy > 0, 'vy is positive after top wall bounce');
  await teardown();
}

// Suite 15: Ball hitting bumper increases score by 100
async function suite15() {
  console.log('\nSuite 15: Bumper hit increases score by 100 (chain=1)');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(0);
    window.__test.setChain(1, 0);
    const b = window.__test.BUMPERS[0];
    window.__test.setBall(b.x, b.y - b.r - window.__test.BALL_R, 0, 50);
    window.__test.update(0.05);
    return { score: window.__test.score };
  });
  assert(res.score >= 100, 'score increased by at least 100 (score=' + res.score + ')');
  await teardown();
}

// Suite 16: Bumper hit doubles chain
async function suite16() {
  console.log('\nSuite 16: Bumper hit doubles chain');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setChain(1, 0);
    const b = window.__test.BUMPERS[0];
    window.__test.setBall(b.x, b.y - b.r - window.__test.BALL_R, 0, 50);
    window.__test.update(0.05);
    return { chain: window.__test.chain };
  });
  assert(res.chain === 2, 'chain doubled to 2 after bumper hit (chain=' + res.chain + ')');
  await teardown();
}

// Suite 17: Chain caps at 8
async function suite17() {
  console.log('\nSuite 17: Chain caps at 8');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setChain(8, 2.0);
    const b = window.__test.BUMPERS[0];
    window.__test.setBall(b.x, b.y - b.r - window.__test.BALL_R, 0, 50);
    window.__test.update(0.05);
    return { chain: window.__test.chain };
  });
  assert(res.chain === 8, 'chain stays at 8 max (chain=' + res.chain + ')');
  await teardown();
}

// Suite 18: Chain resets after CHAIN_TIMEOUT
async function suite18() {
  console.log('\nSuite 18: Chain resets after CHAIN_TIMEOUT');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setChain(4, 0.1);
    // Move ball somewhere safe from bumpers
    window.__test.setBall(180, 470, 0, 0);
    window.__test.update(0.2);
    return { chain: window.__test.chain };
  });
  assert(res.chain === 1, 'chain reset to 1 after timeout (chain=' + res.chain + ')');
  await teardown();
}

// Suite 19: Target hit scores 200
async function suite19() {
  console.log('\nSuite 19: Target hit scores 200');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(0);
    const t = window.__test.TARGETS[0];
    window.__test.setBall(t.x + t.w / 2, t.y - window.__test.BALL_R, 0, 80);
    window.__test.update(0.05);
    return { score: window.__test.score, hit: window.__test.TARGETS[0].hit };
  });
  assert(res.hit === true, 'target is marked hit');
  assert(res.score >= 200, 'score increased by 200 (score=' + res.score + ')');
  await teardown();
}

// Suite 20: All 3 targets cleared gives WANTED bonus +2000 and resets
async function suite20() {
  console.log('\nSuite 20: All 3 targets cleared gives +2000 bonus and resets');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(0);
    // Mark first 2 as already hit
    window.__test.TARGETS[0].hit = true;
    window.__test.TARGETS[1].hit = true;
    // Hit the third target
    const t = window.__test.TARGETS[2];
    window.__test.setBall(t.x + t.w / 2, t.y - window.__test.BALL_R, 0, 80);
    window.__test.update(0.05);
    return {
      score: window.__test.score,
      allReset: window.__test.TARGETS.every(t => !t.hit),
    };
  });
  assert(res.score >= 2200, 'bonus +2000 added on clear (score=' + res.score + ')');
  assert(res.allReset, 'all targets reset after bonus');
  await teardown();
}

// Suite 21: Ball draining decrements balls
async function suite21() {
  console.log('\nSuite 21: Ball draining decrements balls');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    const b0 = window.__test.balls;
    window.__test.setBall(180, window.__test.DRAIN_Y + 5, 0, 100);
    window.__test.update(0.016);
    return { balls: window.__test.balls, phase: window.__test.phase };
  });
  assert(res.balls === 2, 'balls decremented to 2 (got ' + res.balls + ')');
  assert(res.phase === 'ballDead', 'phase is ballDead');
  await teardown();
}

// Suite 22: After ballDead timer, phase returns to playing
async function suite22() {
  console.log('\nSuite 22: After ballDead timer, phase returns to playing');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBall(180, window.__test.DRAIN_Y + 5, 0, 100);
    window.__test.update(0.016); // trigger drain
    // Now advance past ballDeadTimer (1.3s)
    for (let i = 0; i < 100; i++) window.__test.update(0.02);
    return { phase: window.__test.phase };
  });
  assert(res.phase === 'playing', 'phase returns to playing after ballDead timer');
  await teardown();
}

// Suite 23: Last ball drain leads to gameover
async function suite23() {
  console.log('\nSuite 23: Last ball drain leads to gameover');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setBalls(1);
    window.__test.setBall(180, window.__test.DRAIN_Y + 5, 0, 100);
    window.__test.update(0.016);
    for (let i = 0; i < 100; i++) window.__test.update(0.02);
    return { phase: window.__test.phase };
  });
  assert(res.phase === 'gameover', 'phase is gameover after last ball drains');
  await teardown();
}

// Suite 24: Left flipper rotates toward LF_ACTIVE when leftActive
async function suite24() {
  console.log('\nSuite 24: Left flipper rotates toward LF_ACTIVE when leftActive');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLfAngle(window.__test.LF_REST);
    window.__test.setLeftActive(true);
    window.__test.update(0.05);
    return { lfAngle: window.__test.lfAngle, LF_ACTIVE: window.__test.LF_ACTIVE, LF_REST: window.__test.LF_REST };
  });
  assert(res.lfAngle < res.LF_REST, 'lfAngle decreased toward LF_ACTIVE (angle=' + res.lfAngle + ')');
  await teardown();
}

// Suite 25: Right flipper rotates toward RF_ACTIVE when rightActive
async function suite25() {
  console.log('\nSuite 25: Right flipper rotates toward RF_ACTIVE when rightActive');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRfAngle(window.__test.RF_REST);
    window.__test.setRightActive(true);
    window.__test.update(0.05);
    return { rfAngle: window.__test.rfAngle, RF_ACTIVE: window.__test.RF_ACTIVE, RF_REST: window.__test.RF_REST };
  });
  assert(res.rfAngle > res.RF_REST, 'rfAngle increased toward RF_ACTIVE (angle=' + res.rfAngle + ')');
  await teardown();
}

// Suite 26: Left flipper clamps at LF_ACTIVE
async function suite26() {
  console.log('\nSuite 26: Left flipper clamps at LF_ACTIVE');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLfAngle(window.__test.LF_ACTIVE + 0.001);
    window.__test.setLeftActive(true);
    window.__test.update(0.5);
    return { lfAngle: window.__test.lfAngle, LF_ACTIVE: window.__test.LF_ACTIVE };
  });
  const diff = Math.abs(res.lfAngle - res.LF_ACTIVE);
  assert(diff < 0.001, 'lfAngle clamped at LF_ACTIVE (diff=' + diff + ')');
  await teardown();
}

// Suite 27: Right flipper clamps at RF_ACTIVE
async function suite27() {
  console.log('\nSuite 27: Right flipper clamps at RF_ACTIVE');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRfAngle(window.__test.RF_ACTIVE - 0.001);
    window.__test.setRightActive(true);
    window.__test.update(0.5);
    return { rfAngle: window.__test.rfAngle, RF_ACTIVE: window.__test.RF_ACTIVE };
  });
  const diff = Math.abs(res.rfAngle - res.RF_ACTIVE);
  assert(diff < 0.001, 'rfAngle clamped at RF_ACTIVE (diff=' + diff + ')');
  await teardown();
}

// Suite 28: closestOnSeg midpoint of horizontal segment
async function suite28() {
  console.log('\nSuite 28: closestOnSeg returns midpoint for horizontal segment');
  await setup();
  const res = await page.evaluate(() => {
    const p = window.__test.closestOnSeg(180, 300, 100, 300, 260, 300);
    return { x: p.x, y: p.y };
  });
  assert(Math.abs(res.x - 180) < 0.01, 'closest x is 180 (got ' + res.x + ')');
  assert(Math.abs(res.y - 300) < 0.01, 'closest y is 300 (got ' + res.y + ')');
  await teardown();
}

// Suite 29: closestOnSeg clamps to segment endpoints
async function suite29() {
  console.log('\nSuite 29: closestOnSeg clamps to endpoint');
  await setup();
  const res = await page.evaluate(() => {
    const p = window.__test.closestOnSeg(500, 300, 100, 300, 260, 300);
    return { x: p.x, y: p.y };
  });
  assert(Math.abs(res.x - 260) < 0.01, 'closest x clamped to 260 (got ' + res.x + ')');
  await teardown();
}

// Suite 30: resolveSegment pushes ball out from wall
async function suite30() {
  console.log('\nSuite 30: resolveSegment pushes ball out from wall');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    // Ball below the wall (y=312 > 305), moving upward (vy=-200) — moving toward wall
    window.__test.setBall(180, 312, 0, -200);
    window.__test.resolveSegment(100, 305, 260, 305, 0.7);
    return { y: window.__test.ball.y, vy: window.__test.ball.vy };
  });
  assert(res.y > 305, 'ball stays below wall after separation (y=' + res.y + ')');
  assert(res.vy > 0, 'vy reflected to positive (downward) after bounce (vy=' + res.vy + ')');
  await teardown();
}

// Suite 31: flipperEndpoints returns correct tip
async function suite31() {
  console.log('\nSuite 31: flipperEndpoints returns correct tip position');
  await setup();
  const res = await page.evaluate(() => {
    const pivot = { x: 100, y: 200 };
    const angle = 0; // horizontal, pointing right
    const ep = window.__test.flipperEndpoints(pivot, angle);
    return { ax: ep.ax, ay: ep.ay, bx: ep.bx, by: ep.by, len: window.__test.FLIPPER_LEN };
  });
  assert(Math.abs(res.ax - 100) < 0.01, 'ax = pivot.x');
  assert(Math.abs(res.ay - 200) < 0.01, 'ay = pivot.y');
  assert(Math.abs(res.bx - (100 + res.len)) < 0.01, 'bx = pivot.x + FLIPPER_LEN');
  assert(Math.abs(res.by - 200) < 0.01, 'by = pivot.y (horizontal)');
  await teardown();
}

// Suite 32: Active left flipper gives ball upward boost
async function suite32() {
  console.log('\nSuite 32: Active left flipper boosts ball upward');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLeftActive(true);
    window.__test.setLfAngle(window.__test.LF_ACTIVE); // fully up
    const lf = window.__test.flipperEndpoints(window.__test.LF_PIVOT, window.__test.LF_ACTIVE);
    // Place ball just above flipper surface midpoint
    const mx = (lf.ax + lf.bx) / 2, my = (lf.ay + lf.by) / 2 - 12;
    window.__test.setBall(mx, my, 0, 200); // moving down
    const vy0 = window.__test.ball.vy;
    window.__test.update(0.02);
    return { vy0, vy1: window.__test.ball.vy };
  });
  assert(res.vy1 < res.vy0, 'vy decreased (ball kicked upward): vy0=' + res.vy0 + ' vy1=' + res.vy1);
  await teardown();
}

// Suite 33: Drain post deflects ball
async function suite33() {
  console.log('\nSuite 33: Drain post deflects ball');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    const dp = window.__test.DRAIN_POST;
    window.__test.setBall(dp.x, dp.y - dp.r - window.__test.BALL_R, 0, 200);
    window.__test.update(0.05);
    return { vy: window.__test.ball.vy };
  });
  assert(res.vy < 0, 'ball reflected off drain post (vy=' + res.vy + ')');
  await teardown();
}

// Suite 34: Bumper flash timer decreases
async function suite34() {
  console.log('\nSuite 34: Bumper flash timer decreases over time');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.BUMPERS[0].flash = 0.28;
    window.__test.setBall(180, 470, 0, 0); // away from bumpers
    window.__test.update(0.1);
    return window.__test.BUMPERS[0].flash;
  });
  assert(res < 0.28, 'flash timer decreased (flash=' + res + ')');
  await teardown();
}

// Suite 35: Bumper score uses chain multiplier
async function suite35() {
  console.log('\nSuite 35: Bumper score multiplied by chain');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(0);
    window.__test.setChain(4, 2.0);
    const b = window.__test.BUMPERS[0];
    window.__test.setBall(b.x, b.y - b.r - window.__test.BALL_R, 0, 50);
    window.__test.update(0.05);
    return { score: window.__test.score };
  });
  assert(res.score >= 400, 'score += 100*4 = 400 with chain 4 (score=' + res.score + ')');
  await teardown();
}

// Suite 36: Target flash set after hit
async function suite36() {
  console.log('\nSuite 36: Target flash > 0 after hit');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    const t = window.__test.TARGETS[0];
    const score0 = window.__test.score;
    // Ball just above target[0], moving straight down
    window.__test.setBall(t.x + t.w / 2, t.y - window.__test.BALL_R - 2, 0, 120);
    window.__test.update(0.02);
    // flash is set to 0.4 on hit and NOT cleared by bonus reset
    return { flash: window.__test.TARGETS[0].flash, scoreDelta: window.__test.score - score0 };
  });
  assert(res.flash > 0, 'target flash > 0 after hit (flash=' + res.flash + ')');
  assert(res.scoreDelta >= 200, 'score increased by >= 200 (delta=' + res.scoreDelta + ')');
  await teardown();
}

// Suite 37: Popups created on bumper hit
async function suite37() {
  console.log('\nSuite 37: Popup created on bumper hit');
  await setup();
  const res = await page.evaluate(() => {
    window.__test.startGame();
    const b = window.__test.BUMPERS[0];
    window.__test.setBall(b.x, b.y - b.r - window.__test.BALL_R, 0, 50);
    window.__test.update(0.05);
    return window.__test.popups.length;
  });
  assert(res > 0, 'at least 1 popup after bumper hit (count=' + res + ')');
  await teardown();
}

// Suite 38: Best score saved to localStorage
async function suite38() {
  console.log('\nSuite 38: Best score saved to localStorage on gameover');
  await setup();
  const res = await page.evaluate(() => {
    localStorage.removeItem('tumbleweed_pinball_best');
    window.__test.startGame();
    window.__test.setScore(5000);
    window.__test.setBalls(1);
    window.__test.setBall(180, window.__test.DRAIN_Y + 5, 0, 100);
    window.__test.update(0.016);
    for (let i = 0; i < 100; i++) window.__test.update(0.02);
    return { phase: window.__test.phase, best: window.__test.getBest() };
  });
  assert(res.phase === 'gameover', 'reached gameover');
  assert(res.best === 5000, 'best saved to localStorage (best=' + res.best + ')');
  await teardown();
}

// Suite 39: FEEDBACK_ENDPOINT constant is set
async function suite39() {
  console.log('\nSuite 39: FEEDBACK_ENDPOINT constant is correct');
  await setup();
  const ep = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(typeof ep === 'string' && ep.startsWith('https://script.google.com'), 'FEEDBACK_ENDPOINT starts with google script URL');
  await teardown();
}

// Suite 40: localStorage key is tumbleweed_pinball_best
async function suite40() {
  console.log('\nSuite 40: localStorage key is tumbleweed_pinball_best');
  await setup();
  await page.evaluate(() => {
    localStorage.setItem('tumbleweed_pinball_best', '12345');
    window.__test.startGame();
  });
  const best = await page.evaluate(() => window.__test.getBest());
  assert(best === 12345, 'reads from correct localStorage key (best=' + best + ')');
  await teardown();
}

// Suite 41: Pixel check — title screen has gold text
async function suite41() {
  console.log('\nSuite 41: Title screen renders gold text');
  await setup();
  await page.waitForTimeout(200);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Sample a wide band across title area looking for gold-ish pixels
    const imageData = ctx.getImageData(0, 330, 360, 80);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 200 && d[i+1] > 180 && d[i+2] < 120 && d[i+3] > 200) return true;
    }
    return false;
  });
  assert(pixel, 'gold pixel found in title area');
  await teardown();
}

// Suite 42: Pixel check — HUD background during playing
async function suite42() {
  console.log('\nSuite 42: HUD renders during playing');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, 360, 38).data;
    // Look for gold score text pixel
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 200 && d[i+1] > 180 && d[i+2] < 100 && d[i+3] > 200) return true;
    }
    return false;
  });
  assert(pixel, 'HUD gold pixel found in top strip');
  await teardown();
}

// Suite 43: Pixel check — gameover overlay is dark
async function suite43() {
  console.log('\nSuite 43: Gameover renders dark overlay');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setPhase('gameover');
  });
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, 360, 640).data;
    // Gameover = dark overlay, should have low-r,g,b in most pixels
    let darkCount = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 40 && d[i+1] < 40 && d[i+2] < 40 && d[i+3] > 200) darkCount++;
    }
    return darkCount;
  });
  assert(pixel > 5000, 'many dark pixels in gameover overlay (count=' + pixel + ')');
  await teardown();
}

// Suite 44: Pixel check — target area renders (left side, mid-y)
async function suite44() {
  console.log('\nSuite 44: Target area renders something non-black');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(100);
  const hasContent = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(26, 312, 60, 90).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] > 100 && (d[i] + d[i+1] + d[i+2]) > 60) return true;
    }
    return false;
  });
  assert(hasContent, 'non-black pixels in target area');
  await teardown();
}

// Suite 45: Bumper positions within play area
async function suite45() {
  console.log('\nSuite 45: Bumper positions within play area');
  await setup();
  const res = await page.evaluate(() => {
    return window.__test.BUMPERS.every(b =>
      b.x > window.__test.WALL_L + b.r &&
      b.x < window.__test.WALL_R - b.r &&
      b.y > window.__test.WALL_T + b.r &&
      b.y < 350
    );
  });
  assert(res, 'all bumpers within play area and above y=350');
  await teardown();
}

// Suite 46: Flipper constants validity
async function suite46() {
  console.log('\nSuite 46: Flipper angle constants are valid');
  await setup();
  const res = await page.evaluate(() => ({
    LF_REST: window.__test.LF_REST,
    LF_ACTIVE: window.__test.LF_ACTIVE,
    RF_REST: window.__test.RF_REST,
    RF_ACTIVE: window.__test.RF_ACTIVE,
    FLIPPER_LEN: window.__test.FLIPPER_LEN,
  }));
  assert(res.LF_REST > 0 && res.LF_REST < Math.PI, 'LF_REST is positive angle < PI');
  assert(res.LF_ACTIVE < 0, 'LF_ACTIVE is negative (above horizontal)');
  assert(res.RF_REST > Math.PI / 2 && res.RF_REST < Math.PI, 'RF_REST is in second quadrant');
  assert(res.RF_ACTIVE > Math.PI, 'RF_ACTIVE is below second quadrant (third)');
  assert(res.FLIPPER_LEN > 60 && res.FLIPPER_LEN < 100, 'FLIPPER_LEN is 60-100px');
  await teardown();
}

// Suite 47: Guide walls connect to near flipper pivots
async function suite47() {
  console.log('\nSuite 47: Guide walls end near flipper pivot y');
  await setup();
  const res = await page.evaluate(() => {
    const guides = window.__test.GUIDES;
    return {
      leftEndY: guides[0].by,
      rightEndY: guides[1].by,
      lfPivotY: window.__test.LF_PIVOT.y,
    };
  });
  assert(Math.abs(res.leftEndY - res.lfPivotY) <= 10, 'left guide ends at flipper pivot y (diff=' + Math.abs(res.leftEndY - res.lfPivotY) + ')');
  assert(Math.abs(res.rightEndY - res.lfPivotY) <= 10, 'right guide ends at flipper pivot y');
  await teardown();
}

// Suite 48: Drain post within flipper gap area
async function suite48() {
  console.log('\nSuite 48: Drain post is between flipper pivots');
  await setup();
  const res = await page.evaluate(() => ({
    dpX: window.__test.DRAIN_POST.x,
    dpR: window.__test.DRAIN_POST.r,
    lfX: window.__test.LF_PIVOT.x,
    rfX: window.__test.RF_PIVOT.x,
  }));
  assert(res.dpX > res.lfX && res.dpX < res.rfX, 'drain post between flipper pivots');
  assert(res.dpR >= 5 && res.dpR <= 12, 'drain post radius 5-12px');
  await teardown();
}

// Suite 49: Console error sweep during gameplay
async function suite49() {
  console.log('\nSuite 49: No console errors during full cycle');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
  });
  await tickFrames(60, 0.016);
  await page.evaluate(() => {
    window.__test.setBalls(1);
    window.__test.setBall(180, window.__test.DRAIN_Y + 5, 0, 100);
  });
  await tickFrames(100, 0.02);
  assert(consoleErrors.length === 0, 'no console errors (got: ' + consoleErrors.join(', ') + ')');
  await teardown();
}

// Suite 50: Full state cycle title -> playing -> ballDead -> playing -> gameover
async function suite50() {
  console.log('\nSuite 50: Full state cycle');
  await setup();
  const res = await page.evaluate(() => {
    const log = [];
    log.push(window.__test.phase); // title
    window.__test.startGame();
    log.push(window.__test.phase); // playing
    // Drain
    window.__test.setBalls(1);
    window.__test.setBall(180, window.__test.DRAIN_Y + 5, 0, 100);
    window.__test.update(0.016);
    log.push(window.__test.phase); // ballDead
    // Wait past timer
    for (let i = 0; i < 100; i++) window.__test.update(0.02);
    log.push(window.__test.phase); // gameover
    // Play again
    window.__test.startGame();
    log.push(window.__test.phase); // playing
    return log;
  });
  assert(res[0] === 'title',    'phase[0] = title');
  assert(res[1] === 'playing',  'phase[1] = playing');
  assert(res[2] === 'ballDead', 'phase[2] = ballDead');
  assert(res[3] === 'gameover', 'phase[3] = gameover');
  assert(res[4] === 'playing',  'phase[4] = playing after restart');
  await teardown();
}

// ===== RUN =====
const suites = [
  suite1, suite2, suite3, suite4, suite5,
  suite6, suite7, suite8, suite9, suite10,
  suite11, suite12, suite13, suite14, suite15,
  suite16, suite17, suite18, suite19, suite20,
  suite21, suite22, suite23, suite24, suite25,
  suite26, suite27, suite28, suite29, suite30,
  suite31, suite32, suite33, suite34, suite35,
  suite36, suite37, suite38, suite39, suite40,
  suite41, suite42, suite43, suite44, suite45,
  suite46, suite47, suite48, suite49, suite50,
];

(async () => {
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try { await suite(); passed++; }
    catch (e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
    }
  }
  console.log(`\n${passed}/${suites.length} tests passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
})();
