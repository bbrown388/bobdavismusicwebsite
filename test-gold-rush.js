// Playwright tests for Gold Rush (Game 10)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'gold-rush.html').replace(/\\/g, '/');
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
async function teardown() { if (browser) await browser.close(); }
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
    const d = document.getElementById('c').getContext('2d').getImageData(W/2, 200, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 20, 'title screen renders content');
  await teardown();
}

// Suite 2: Start game
async function suite2() {
  console.log('\nSuite 2: Start game');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  const pl = await page.evaluate(() => window.__test.getPlayer());
  assert(pl.col === 4 && pl.row === 13, 'player starts at col=4 row=13');
  await teardown();
}

// Suite 3: Grid initialised correctly
async function suite3() {
  console.log('\nSuite 3: Grid initialisation');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const info = await page.evaluate(() => {
    const g = window.__test.getGrid();
    const T = window.__test.T;
    const exitOk  = g[0][4] === T.EXIT;
    const startOk = g[13][4] === T.EMPTY;
    let goldCount = 0, oilCount = 0, pickCount = 0;
    for (let r=0;r<14;r++) for (let c=0;c<9;c++) {
      if (g[r][c] === T.GOLD) goldCount++;
      if (g[r][c] === T.OIL)  oilCount++;
      if (g[r][c] === T.PICK) pickCount++;
    }
    return { exitOk, startOk, goldCount, oilCount, pickCount };
  });
  assert(info.exitOk,  'exit tile at row=0 col=4');
  assert(info.startOk, 'start tile is empty');
  assert(info.goldCount === 6, 'grid has 6 gold tiles (got ' + info.goldCount + ')');
  assert(info.oilCount  === 3, 'grid has 3 oil tiles');
  assert(info.pickCount === 2, 'grid has 2 pick tiles');
  await teardown();
}

// Suite 4: Mining a rock
async function suite4() {
  console.log('\nSuite 4: Mining');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  // Row 12 col 4 is a rock (player is at 13,4 — adjacent)
  await page.evaluate(() => {
    window.__test.setTile(4, 12, window.__test.T.ROCK);
    window.__test.doMine(4, 12);
  });
  const tp = await page.evaluate(() => window.__test.getTile(4, 12));
  assert(tp === 0, 'mined tile becomes EMPTY (0), got ' + tp);
  const pk = await page.evaluate(() => window.__test.getPick());
  assert(pk < 24, 'pickaxe durability decremented (PICK_START=24, got ' + pk + ')');
  await teardown();
}

// Suite 5: Mining gold increments gold counter
async function suite5() {
  console.log('\nSuite 5: Gold collection');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.setTile(4, 12, window.__test.T.GOLD);
    window.__test.doMine(4, 12);
  });
  const g = await page.evaluate(() => window.__test.getGold());
  assert(g === 1, 'gold counter is 1 after mining gold tile');
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc >= 100, 'score increased by at least 100');
  await teardown();
}

// Suite 6: Mining oil refills fuel
async function suite6() {
  console.log('\nSuite 6: Oil refill');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.setFuel(20);
    window.__test.setTile(4, 12, window.__test.T.OIL);
    window.__test.doMine(4, 12);
  });
  const f = await page.evaluate(() => window.__test.getFuel());
  assert(f > 20, 'fuel increased after mining oil');
  await teardown();
}

// Suite 7: Mining pick refills durability
async function suite7() {
  console.log('\nSuite 7: Pickaxe refill');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.setPick(5);
    window.__test.setTile(4, 12, window.__test.T.PICK);
    window.__test.doMine(4, 12);
  });
  const pk = await page.evaluate(() => window.__test.getPick());
  assert(pk > 5, 'pickaxe durability increased');
  await teardown();
}

// Suite 8: No pickaxe blocks mining
async function suite8() {
  console.log('\nSuite 8: No pickaxe');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.setPick(0);
    window.__test.setTile(4, 12, window.__test.T.ROCK);
    window.__test.doMine(4, 12);
  });
  const tp = await page.evaluate(() => window.__test.getTile(4, 12));
  assert(tp === 1, 'rock not mined when pickaxe=0 (got ' + tp + ')');
  await teardown();
}

// Suite 9: Fuel drain causes lose
async function suite9() {
  console.log('\nSuite 9: Fuel exhaustion');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.setFuel(0));
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when fuel=0');
  await teardown();
}

// Suite 10: Collapse causes lose
async function suite10() {
  console.log('\nSuite 10: Tunnel collapse');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.skipCollapse());
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when collapseT=0');
  await teardown();
}

// Suite 11: Win condition — reach exit with enough gold
async function suite11() {
  console.log('\nSuite 11: Win condition');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.setGold(window.__test.GOLD_TARGET);
    window.__test.setPlayerPos(4, 0);
  });
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win when player reaches exit with enough gold');
  await teardown();
}

// Suite 12: Blocked from exit without enough gold
async function suite12() {
  console.log('\nSuite 12: Exit blocked without gold');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.setGold(0);
    window.__test.setPlayerPos(4, 0);
  });
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state stays playing when exit reached without enough gold');
  await teardown();
}

// Suite 13: Score increases with bonus on win
async function suite13() {
  console.log('\nSuite 13: Win score bonus');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.setGold(window.__test.GOLD_TARGET);
    window.__test.setFuel(50);
    window.__test.skipCollapse = undefined; // keep collapse alive
    window.__test.setPlayerPos(4, 0);
  });
  await page.waitForTimeout(200);
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0, 'score > 0 on win');
  await teardown();
}

// Suite 14: localStorage best score persisted
async function suite14() {
  console.log('\nSuite 14: Best score persistence');
  await setup();
  await page.evaluate(() => {
    window.__test.resetBest();
    window.__test.startGame();
    window.__test.setGold(window.__test.GOLD_TARGET);
    window.__test.setPlayerPos(4, 0);
  });
  await page.waitForTimeout(200);
  const saved = await page.evaluate(() => localStorage.getItem('gold_rush_best'));
  assert(saved !== null && parseInt(saved) > 0, 'best score saved in localStorage');
  await teardown();
}

// Suite 15: No console errors during normal gameplay
async function suite15() {
  console.log('\nSuite 15: No console errors');
  await setup();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__test.setTile(4,12,window.__test.T.GOLD);
    window.__test.doMine(4,12);
  });
  await page.waitForTimeout(300);
  assert(errors.length === 0, 'no console errors during gameplay (got: ' + errors.join(', ') + ')');
  await teardown();
}

// Suite 16: Title screen tap starts game
async function suite16() {
  console.log('\nSuite 16: Title tap starts game');
  await setup();
  await page.evaluate(() => window.__test.resetBest());
  await page.click('canvas');
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'tapping title starts game');
  await teardown();
}

// ── Runner ────────────────────────────────────────────────────
(async () => {
  const suites = [suite1,suite2,suite3,suite4,suite5,suite6,suite7,suite8,
                  suite9,suite10,suite11,suite12,suite13,suite14,suite15,suite16];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try { await s(); passed++; }
    catch(e) { console.error(e.message); failed++; if (browser) { try { await browser.close(); } catch(_){} browser=null; } }
  }
  console.log('\n' + (failed===0?'ALL PASS':'FAILURES: '+failed) + '  (' + passed + '/' + suites.length + ')');
  process.exit(failed > 0 ? 1 : 0);
})();

