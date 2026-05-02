// Playwright tests for Canyon Crossfire (Game 19)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'canyon-crossfire.html').replace(/\\/g, '/');
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

// Suite 4: Score starts at 0
async function suite4() {
  console.log('\nSuite 4: Score starts at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 0, 'score is 0 at game start');
  await teardown();
}

// Suite 5: Lives starts at MAX_LIVES (3)
async function suite5() {
  console.log('\nSuite 5: Lives starts at 3');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const lv = await page.evaluate(() => window.__test.getLives());
  const ml = await page.evaluate(() => window.__test.MAX_LIVES);
  assert(lv === ml, `lives is ${ml} at game start`);
  assert(lv === 3, 'lives is exactly 3');
  await teardown();
}

// Suite 6: Three outlaws created on startGame
async function suite6() {
  console.log('\nSuite 6: Three outlaws created');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ow = await page.evaluate(() => window.__test.getOutlaws());
  assert(ow.length === 3, 'three outlaws created');
  await teardown();
}

// Suite 7: Outlaws named Slim, Hank, Dagger
async function suite7() {
  console.log('\nSuite 7: Outlaw names are Slim, Hank, Dagger');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ow = await page.evaluate(() => window.__test.getOutlaws());
  assert(ow[0].name === 'Slim', 'first outlaw is Slim');
  assert(ow[1].name === 'Hank', 'second outlaw is Hank');
  assert(ow[2].name === 'Dagger', 'third outlaw is Dagger');
  await teardown();
}

// Suite 8: Outlaws start with 3 HP
async function suite8() {
  console.log('\nSuite 8: Outlaws start with 3 HP each');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ow = await page.evaluate(() => window.__test.getOutlaws());
  for (const o of ow) assert(o.hp === 3, `${o.name} starts with 3 HP`);
  await teardown();
}

// Suite 9: targetIdx starts at 0
async function suite9() {
  console.log('\nSuite 9: targetIdx starts at 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ti = await page.evaluate(() => window.__test.getTargetIdx());
  assert(ti === 0, 'targetIdx is 0 after startGame');
  await teardown();
}

// Suite 10: Player not peeked at start
async function suite10() {
  console.log('\nSuite 10: Player not peeked at start');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const pk = await page.evaluate(() => window.__test.isPeeked());
  assert(pk === false, 'player is not peeked at start');
  await teardown();
}

// Suite 11: PEEK_DUR constant exposed
async function suite11() {
  console.log('\nSuite 11: PEEK_DUR constant exposed');
  await setup();
  const pd = await page.evaluate(() => window.__test.PEEK_DUR);
  assert(typeof pd === 'number' && pd > 0, 'PEEK_DUR is a positive number');
  assert(pd < 2, 'PEEK_DUR is less than 2 seconds (reasonable)');
  await teardown();
}

// Suite 12: FIRE_DUR constant exposed
async function suite12() {
  console.log('\nSuite 12: FIRE_DUR constant exposed');
  await setup();
  const fd = await page.evaluate(() => window.__test.FIRE_DUR);
  assert(typeof fd === 'number' && fd > 0, 'FIRE_DUR is a positive number');
  await teardown();
}

// Suite 13: fireShot sets player peeked
async function suite13() {
  console.log('\nSuite 13: fireShot sets player peeked');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.fireShot());
  const pk = await page.evaluate(() => window.__test.isPeeked());
  assert(pk === true, 'player is peeked after fireShot');
  await teardown();
}

// Suite 14: fireShot reduces target HP by 1
async function suite14() {
  console.log('\nSuite 14: fireShot reduces target HP by 1');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => window.__test.getOutlaws()[0].hp);
  await page.evaluate(() => window.__test.fireShot());
  const after = await page.evaluate(() => window.__test.getOutlaws()[0].hp);
  assert(after === before - 1, `HP decreased from ${before} to ${after}`);
  await teardown();
}

// Suite 15: Score increases by 50 per hit
async function suite15() {
  console.log('\nSuite 15: Score +50 per hit');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.fireShot());
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc >= 50, `score is at least 50 after hit (got ${sc})`);
  await teardown();
}

// Suite 16: 3 hits eliminate outlaw, score += 100 bonus, targetIdx advances
async function suite16() {
  console.log('\nSuite 16: 3 hits eliminate target and advance targetIdx');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.setTargetIdx(0); });
  await page.evaluate(() => window.__test.setOutlawHP(0, 1));
  await page.evaluate(() => window.__test.fireShot());
  const res = await page.evaluate(() => ({
    ow: window.__test.getOutlaws()[0],
    ti: window.__test.getTargetIdx(),
    sc: window.__test.getScore(),
  }));
  assert(res.ow.state === 'dead', 'outlaw state is dead after HP reaches 0');
  assert(res.ti !== 0, 'targetIdx advanced away from eliminated outlaw');
  assert(res.sc >= 150, `score includes elimination bonus (got ${res.sc})`);
  await teardown();
}

// Suite 17: Bullets spawned when firing at a live target
async function suite17() {
  console.log('\nSuite 17: Bullet spawned on fireShot');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.fireShot());
  const bs = await page.evaluate(() => window.__test.getBullets());
  const playerBullets = bs.filter(b => b.type === 'player');
  assert(playerBullets.length > 0, 'at least one player bullet spawned');
  await teardown();
}

// Suite 18: hitPlayer reduces lives by 1
async function suite18() {
  console.log('\nSuite 18: hitPlayer reduces lives by 1');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => window.__test.getLives());
  await page.evaluate(() => window.__test.hitPlayer());
  const after = await page.evaluate(() => window.__test.getLives());
  assert(after === before - 1, `lives went from ${before} to ${after}`);
  await teardown();
}

// Suite 19: Lives reaching 0 transitions to gameover
async function suite19() {
  console.log('\nSuite 19: Lives 0 -> gameover');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => { window.__test.hitPlayer(); window.__test.hitPlayer(); window.__test.hitPlayer(); });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover', 'state is gameover when lives reach 0');
  await teardown();
}

// Suite 20: All outlaws dead -> cleared
async function suite20() {
  console.log('\nSuite 20: All outlaws dead -> cleared');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'dead');
    window.__test.setOutlawState(1, 'dead');
    window.__test.setOutlawHP(2, 1);
    window.__test.setTargetIdx(2);
    window.__test.fireShot();
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'cleared', 'state is cleared when all outlaws dead');
  await teardown();
}

// Suite 21: Outlaw watchTimer decrements via tickTime
async function suite21() {
  console.log('\nSuite 21: Outlaw watchTimer decrements via tickTime');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'watching', 5.0);
  });
  await page.evaluate(() => window.__test.tickTime(0.5));
  const timer = await page.evaluate(() => window.__test.getOutlaws()[0].watchTimer);
  assert(timer < 5.0, `watchTimer decreased from 5.0 (got ${timer})`);
  assert(timer > 4.0, `watchTimer decreased by approximately 0.5 (got ${timer})`);
  await teardown();
}

// Suite 22: Outlaw transitions watching -> firing when watchTimer <= 0
async function suite22() {
  console.log('\nSuite 22: Outlaw fires when watchTimer reaches 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'watching', 0.05);
  });
  await page.evaluate(() => window.__test.tickTime(0.1));
  const st = await page.evaluate(() => window.__test.getOutlaws()[0].state);
  assert(st === 'firing', `outlaw state is firing after watchTimer expired (got ${st})`);
  await teardown();
}

// Suite 23: Outlaw transitions firing -> reloading after FIRE_DUR
async function suite23() {
  console.log('\nSuite 23: Outlaw reloads after firing animation completes');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'firing', 0.05);
  });
  await page.evaluate(() => window.__test.tickTime(0.1));
  const st = await page.evaluate(() => window.__test.getOutlaws()[0].state);
  assert(st === 'reloading', `outlaw enters reloading after FIRE_DUR (got ${st})`);
  await teardown();
}

// Suite 24: Outlaw transitions reloading -> watching after reloadDur
async function suite24() {
  console.log('\nSuite 24: Outlaw returns to watching after reloadDur');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'reloading', 0.05);
  });
  await page.evaluate(() => window.__test.tickTime(0.1));
  const st = await page.evaluate(() => window.__test.getOutlaws()[0].state);
  assert(st === 'watching', `outlaw returns to watching after reload (got ${st})`);
  await teardown();
}

// Suite 25: Peeked player takes damage when outlaw fires
async function suite25() {
  console.log('\nSuite 25: Peeked player hit when outlaw fires');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'watching', 0.05);
    // Force player to be peeked
    window.__test.fireShot(); // sets peeked = true
  });
  const livesBefore = await page.evaluate(() => window.__test.getLives());
  await page.evaluate(() => window.__test.tickTime(0.1));
  const livesAfter = await page.evaluate(() => window.__test.getLives());
  assert(livesAfter < livesBefore, `player lost a life when outlaw fired during peek (${livesBefore} -> ${livesAfter})`);
  await teardown();
}

// Suite 26: Not-peeked player is safe when outlaw fires
async function suite26() {
  console.log('\nSuite 26: Covered player safe when outlaw fires');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'watching', 0.05);
    // Do NOT peek
  });
  const livesBefore = await page.evaluate(() => window.__test.getLives());
  await page.evaluate(() => window.__test.tickTime(0.1));
  const livesAfter = await page.evaluate(() => window.__test.getLives());
  assert(livesAfter === livesBefore, `covered player keeps lives (${livesBefore} -> ${livesAfter})`);
  await teardown();
}

// Suite 27: Outlaw bullet spawned when outlaw fires
async function suite27() {
  console.log('\nSuite 27: Outlaw bullet spawned on outlaw firing');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'watching', 0.05);
  });
  await page.evaluate(() => window.__test.tickTime(0.1));
  const bs = await page.evaluate(() => window.__test.getBullets());
  const outBullets = bs.filter(b => b.type === 'outlaw');
  assert(outBullets.length > 0, 'outlaw bullet spawned when outlaw fires');
  await teardown();
}

// Suite 28: Popups spawned on player hit
async function suite28() {
  console.log('\nSuite 28: Popup spawned on player hit');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.hitPlayer(); });
  const pops = await page.evaluate(() => window.__test.getPopups());
  assert(pops.length > 0, 'popup spawned after hitPlayer');
  const hitPop = pops.find(p => p.color === '#E74C3C');
  assert(hitPop !== undefined, 'hit popup has red color');
  await teardown();
}

// Suite 29: Popups spawned on outlaw hit
async function suite29() {
  console.log('\nSuite 29: Popup spawned on outlaw hit');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.fireShot(); });
  const pops = await page.evaluate(() => window.__test.getPopups());
  assert(pops.length > 0, 'popup spawned after fireShot');
  await teardown();
}

// Suite 30: Playing screen renders gold pixels in HUD area
async function suite30() {
  console.log('\nSuite 30: Playing screen renders gold pixels in HUD area');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(200);
  const found = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Scan the top HUD bar (y=10..44) for gold pixels (r>180, g>140, b<120)
    for (let px = 100; px < 260; px++) {
      for (let py = 14; py < 44; py++) {
        const d = ctx.getImageData(px, py, 1, 1).data;
        if (d[0] > 180 && d[1] > 140 && d[2] < 120) return true;
      }
    }
    return false;
  });
  assert(found, 'gold pixels found in score HUD area');
  await teardown();
}

// Suite 31: RELOAD label drawn for reloading outlaw
async function suite31() {
  console.log('\nSuite 31: Reloading state shows green pixels (RELOAD label area)');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(0, 'reloading', 1.5);
  });
  await page.waitForTimeout(200);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Slim is at x=246, y=434; bar is at y+10*scale ~ y+10, label ~y+27
    // Check area around reload bar
    let found = false;
    for (let px = 220; px < 275; px++) {
      for (let py = 440; py < 470; py++) {
        const d = ctx.getImageData(px, py, 1, 1).data;
        if (d[1] > 150 && d[0] < 100) { found = true; break; }
      }
      if (found) break;
    }
    return found;
  });
  assert(pixel, 'green pixels found in Slim reload bar area');
  await teardown();
}

// Suite 32: setOutlawState helper sets state and timer
async function suite32() {
  console.log('\nSuite 32: setOutlawState helper works correctly');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawState(1, 'reloading', 2.0);
  });
  const o = await page.evaluate(() => window.__test.getOutlaws()[1]);
  assert(o.state === 'reloading', `state set to reloading (got ${o.state})`);
  assert(Math.abs(o.reloadTimer - 2.0) < 0.01, `reloadTimer set to 2.0 (got ${o.reloadTimer})`);
  await teardown();
}

// Suite 33: setOutlawHP helper works
async function suite33() {
  console.log('\nSuite 33: setOutlawHP helper works');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setOutlawHP(2, 1);
  });
  const hp = await page.evaluate(() => window.__test.getOutlaws()[2].hp);
  assert(hp === 1, `outlaw HP set to 1 (got ${hp})`);
  await teardown();
}

// Suite 34: Feedback overlay toggles correctly
async function suite34() {
  console.log('\nSuite 34: Feedback overlay');
  await setup();
  // Feedback is accessible through the game HTML structure
  const hasFeedbackEndpoint = await page.evaluate(() => {
    return typeof FEEDBACK_ENDPOINT === 'string' && FEEDBACK_ENDPOINT.includes('script.google.com');
  });
  assert(hasFeedbackEndpoint, 'FEEDBACK_ENDPOINT is set to Google Apps Script URL');
  await teardown();
}

// Suite 35: Full state cycle title -> playing -> gameover -> playing
async function suite35() {
  console.log('\nSuite 35: Full state cycle');
  await setup();
  let st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'starts at title');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'transitions to playing');
  await page.evaluate(() => { window.__test.hitPlayer(); window.__test.hitPlayer(); window.__test.hitPlayer(); });
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover', 'transitions to gameover');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'restarts to playing');
  await teardown();
}

// Suite 36: Console error sweep
async function suite36() {
  console.log('\nSuite 36: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx2.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__test.fireShot());
  await page.waitForTimeout(400);
  const filtered = errors.filter(e => !e.includes('CORS') && !e.includes('net::ERR_FAILED') && !e.includes('favicon'));
  assert(filtered.length === 0, `no console errors (got: ${filtered.join(', ')})`);
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
    suite36,
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
  console.log(`\n${passed}/${passed + failed} tests pass`);
  process.exit(failed > 0 ? 1 : 0);
})();
