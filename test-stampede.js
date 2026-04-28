// Playwright tests for Stampede (Game 12)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'stampede.html').replace(/\\/g, '/');
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
    const d = document.getElementById('c').getContext('2d').getImageData(W/2, 220, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 30, 'title screen renders visible content');
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

// Suite 3: Game starts on tap
async function suite3() {
  console.log('\nSuite 3: Game starts on tap');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  await teardown();
}

// Suite 4: Player starts in center lane
async function suite4() {
  console.log('\nSuite 4: Player starts in center lane');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const lane = await page.evaluate(() => window.__test.getPlayerLane());
  assert(lane === 1, 'player starts in lane 1 (center)');
  await teardown();
}

// Suite 5: Lives start at 3
async function suite5() {
  console.log('\nSuite 5: Lives start at 3');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives === 3, 'lives start at 3');
  await teardown();
}

// Suite 6: Signal uses start at 3
async function suite6() {
  console.log('\nSuite 6: Signal uses start at 3');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const sig = await page.evaluate(() => window.__test.getSigUses());
  assert(sig === 3, 'signal uses start at 3');
  await teardown();
}

// Suite 7: Dodge left
async function suite7() {
  console.log('\nSuite 7: Dodge left');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.dodgeLeft());
  await page.waitForTimeout(60);
  const lane = await page.evaluate(() => window.__test.getPlayerLane());
  assert(lane === 0, 'dodging left from center goes to lane 0');
  await teardown();
}

// Suite 8: Dodge right
async function suite8() {
  console.log('\nSuite 8: Dodge right');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.dodgeRight());
  await page.waitForTimeout(60);
  const lane = await page.evaluate(() => window.__test.getPlayerLane());
  assert(lane === 2, 'dodging right from center goes to lane 2');
  await teardown();
}

// Suite 9: Cannot dodge past edge lanes
async function suite9() {
  console.log('\nSuite 9: Cannot dodge past edge lanes');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  // Dodge far left
  await page.evaluate(() => { window.__test.dodgeLeft(); window.__test.dodgeLeft(); window.__test.dodgeLeft(); });
  await page.waitForTimeout(60);
  const laneL = await page.evaluate(() => window.__test.getPlayerLane());
  assert(laneL === 0, 'lane stays at 0 when dodging left repeatedly');
  // Dodge far right
  await page.evaluate(() => { window.__test.dodgeRight(); window.__test.dodgeRight(); window.__test.dodgeRight(); window.__test.dodgeRight(); });
  await page.waitForTimeout(60);
  const laneR = await page.evaluate(() => window.__test.getPlayerLane());
  assert(laneR === 2, 'lane stays at 2 when dodging right repeatedly');
  await teardown();
}

// Suite 10: Distance increases during play
async function suite10() {
  console.log('\nSuite 10: Distance increases during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const d0 = await page.evaluate(() => window.__test.getDistance());
  await page.waitForTimeout(500);
  const d1 = await page.evaluate(() => window.__test.getDistance());
  assert(d1 > d0, 'distance increases over time during gameplay');
  await teardown();
}

// Suite 11: Buffalo management (add and query)
async function suite11() {
  console.log('\nSuite 11: Buffalo management');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => { window.__test.clearBuffalos(); window.__test.addBuffalo(500, 2); window.__test.addBuffalo(400, 0); });
  await page.waitForTimeout(60);
  const bufs = await page.evaluate(() => window.__test.getBuffalos());
  assert(bufs.length >= 2, 'buffalos array contains added buffalos');
  const lanes = bufs.map(b => b.lane);
  assert(lanes.includes(0) && lanes.includes(2), 'both added buffalo lanes present');
  await teardown();
}

// Suite 12: Collision reduces lives
async function suite12() {
  console.log('\nSuite 12: Collision reduces lives');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearBuffalos();
    window.__test.addBuffalo(72, 1); // z < Z_HIT(75), in player lane (1)
  });
  await page.waitForTimeout(200);
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives < 3, 'lives decreased after buffalo collision');
  await teardown();
}

// Suite 13: Invulnerability after hit
async function suite13() {
  console.log('\nSuite 13: Invulnerability after hit');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearBuffalos();
    window.__test.addBuffalo(72, 1); // trigger collision
  });
  await page.waitForTimeout(150);
  const livesAfterHit = await page.evaluate(() => window.__test.getLives());
  // Add another buffalo in same lane at same z - should NOT trigger (still invuln)
  await page.evaluate(() => { window.__test.addBuffalo(72, 1); });
  await page.waitForTimeout(60);
  const livesAfterSecond = await page.evaluate(() => window.__test.getLives());
  assert(livesAfterHit === livesAfterSecond, 'invulnerability prevents double-hit in same window');
  await teardown();
}

// Suite 14: Signal scatters buffalos
async function suite14() {
  console.log('\nSuite 14: Signal scatters buffalos');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearBuffalos();
    window.__test.addBuffalo(400, 0);
    window.__test.addBuffalo(300, 2);
    window.__test.useSignal();
  });
  await page.waitForTimeout(100);
  const bufs = await page.evaluate(() => window.__test.getBuffalos());
  const scattered = bufs.filter(b => b.scattered);
  assert(scattered.length >= 2, 'signal scatters nearby buffalos');
  await teardown();
}

// Suite 15: Signal decrements uses and sets cooldown
async function suite15() {
  console.log('\nSuite 15: Signal decrements uses and sets cooldown');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.useSignal(); });
  await page.waitForTimeout(60);
  const uses = await page.evaluate(() => window.__test.getSigUses());
  const cd   = await page.evaluate(() => window.__test.getSigCooldown());
  assert(uses === 2, 'signal uses decremented from 3 to 2');
  assert(cd > 0, 'signal cooldown is active after use');
  await teardown();
}

// Suite 16: Signal cannot be used on cooldown
async function suite16() {
  console.log('\nSuite 16: Signal blocked during cooldown');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.useSignal(); // uses one, starts cooldown
    window.__test.useSignal(); // should be blocked by cooldown
  });
  await page.waitForTimeout(60);
  const uses = await page.evaluate(() => window.__test.getSigUses());
  assert(uses === 2, 'second signal blocked by cooldown (still 2 uses remaining)');
  await teardown();
}

// Suite 17: Game over when lives reach 0
async function suite17() {
  console.log('\nSuite 17: Game over at zero lives');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.endGame(); });
  await page.waitForTimeout(60);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'dead', 'state is dead after endGame');
  await teardown();
}

// Suite 18: Dead screen renders content
async function suite18() {
  console.log('\nSuite 18: Dead screen renders content');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.setDistance(5000); window.__test.endGame(); });
  await page.waitForTimeout(200);
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W/2, 210, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 50, 'dead screen renders visible content');
  await teardown();
}

// Suite 19: localStorage best score
async function suite19() {
  console.log('\nSuite 19: localStorage best score');
  await setup();
  await page.evaluate(() => {
    localStorage.removeItem('stampede_best');
    window.__test.startGame();
    window.__test.setDistance(10000); // 10000 * 0.1 = 1000 yards
    window.__test.endGame();
  });
  await page.waitForTimeout(100);
  const stored = await page.evaluate(() => parseInt(localStorage.getItem('stampede_best') || '0'));
  assert(stored === 1000, 'best score of 1000 yards saved to localStorage');
  const best = await page.evaluate(() => window.__test.getBest());
  assert(best === 1000, 'getBest() returns stored best');
  await teardown();
}

// Suite 20: Feedback overlay opens and closes
async function suite20() {
  console.log('\nSuite 20: Feedback overlay');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.endGame(); });
  await page.waitForTimeout(60);
  await page.evaluate(() => window.__test.openFeedback());
  const visible = await page.evaluate(() => document.getElementById('fb-ov').style.display);
  assert(visible === 'flex', 'feedback overlay opens');
  await page.evaluate(() => window.__test.closeFeedback());
  const hidden = await page.evaluate(() => document.getElementById('fb-ov').style.display);
  assert(hidden === 'none', 'feedback overlay closes');
  await teardown();
}

// Suite 21: Signal button zone detection
async function suite21() {
  console.log('\nSuite 21: Signal button zone detection');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const inZone    = await page.evaluate(() => window.__test.isSignalBtn(180, 640 - 36));
  const outLeft   = await page.evaluate(() => window.__test.isSignalBtn(50, 640 - 36));
  const outTop    = await page.evaluate(() => window.__test.isSignalBtn(180, 640 - 80));
  assert(inZone  === true,  'center of signal button is in zone');
  assert(outLeft === false, 'far left is outside signal zone');
  assert(outTop  === false, 'above signal button is outside zone');
  await teardown();
}

// Suite 22: Speed increases over time
async function suite22() {
  console.log('\nSuite 22: Speed increases over time');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const spd0 = await page.evaluate(() => window.__test.getSpeed());
  await page.waitForTimeout(1500);
  const spd1 = await page.evaluate(() => window.__test.getSpeed());
  assert(spd1 > spd0, 'speed increases as game progresses');
  await teardown();
}

// Suite 23: Console error sweep
async function suite23() {
  console.log('\nSuite 23: Console error sweep');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.dodgeLeft();
    window.__test.dodgeRight();
    window.__test.addBuffalo(300, 0);
    window.__test.useSignal();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__test.endGame(); });
  await page.waitForTimeout(200);
  assert(consoleErrors.length === 0, 'no console errors during gameplay (' + consoleErrors.join(', ') + ')');
  await teardown();
}

// Run all suites
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15,
    suite16, suite17, suite18, suite19, suite20, suite21, suite22, suite23
  ];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try {
      await s();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      await teardown();
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
