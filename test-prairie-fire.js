// Playwright tests for Prairie Fire (Game 15)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'prairie-fire.html').replace(/\\/g, '/');
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

// Suite 1: Title screen initial state
async function suite1() {
  console.log('\nSuite 1: Title screen initial state');
  await setup();
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'initial state is title');
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

// Suite 3: startGame sets playing state
async function suite3() {
  console.log('\nSuite 3: startGame transitions to playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  await teardown();
}

// Suite 4: Grid initializes with GRASS
async function suite4() {
  console.log('\nSuite 4: Grid initializes with GRASS cells');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const grassCount = await page.evaluate(() => window.__test.countCells(window.__test.GRASS));
  assert(grassCount > 200, 'grid has >200 GRASS cells after init (got ' + grassCount + ')');
  await teardown();
}

// Suite 5: Homestead cells are set correctly
async function suite5() {
  console.log('\nSuite 5: Homestead cells placed at HS_ROW/HS_COL');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ok = await page.evaluate(() => {
    const { HS_ROW, HS_COL, HOMESTEAD, gAt } = window.__test;
    return gAt(HS_ROW, HS_COL) === HOMESTEAD &&
           gAt(HS_ROW, HS_COL + 1) === HOMESTEAD &&
           gAt(HS_ROW + 1, HS_COL) === HOMESTEAD &&
           gAt(HS_ROW + 1, HS_COL + 1) === HOMESTEAD;
  });
  assert(ok, 'all 4 homestead cells are HOMESTEAD state');
  await teardown();
}

// Suite 6: Fire starts at top rows
async function suite6() {
  console.log('\nSuite 6: Fire starts at top rows');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const burning = await page.evaluate(() => {
    const { gAt, COLS, BURNING } = window.__test;
    let n = 0;
    for (let c = 0; c < COLS; c++) {
      if (gAt(0, c) === BURNING || gAt(1, c) === BURNING) n++;
    }
    return n;
  });
  assert(burning > 4, 'fire starts on top rows with >4 burning cells (got ' + burning + ')');
  await teardown();
}

// Suite 7: Wind direction is valid 0-7
async function suite7() {
  console.log('\nSuite 7: Wind direction is valid 0-7');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const wd = await page.evaluate(() => window.__test.getWindDir());
  assert(wd >= 0 && wd <= 7, 'wind direction is 0-7 (got ' + wd + ')');
  await teardown();
}

// Suite 8: Wind starts as south (4)
async function suite8() {
  console.log('\nSuite 8: Wind starts as south (4)');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const wd = await page.evaluate(() => window.__test.getWindDir());
  assert(wd === 4, 'initial wind direction is 4 (south), got ' + wd);
  await teardown();
}

// Suite 9: Fire spreads to adjacent GRASS
async function suite9() {
  console.log('\nSuite 9: Fire tick spreads to adjacent GRASS');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Clear everything, place single burning cell in middle, surround with grass
    const { ROWS, COLS, GRASS, BURNING, BURNED, HOMESTEAD, STONE, EMPTY, WATER, FIREBREAK } = window.__test;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const v = window.__test.gAt(r, c);
        if (v !== HOMESTEAD) window.__test.setCell(r, c, GRASS);
      }
    window.__test.setCell(5, 9, BURNING);
    window.__test.setWindDir(4); // south
    // Run many ticks so fire has high chance to spread
    for (let i = 0; i < 10; i++) window.__test.forceFireTick();
  });
  const burning = await page.evaluate(() => window.__test.countCells(window.__test.BURNING));
  const burned  = await page.evaluate(() => window.__test.countCells(window.__test.BURNED));
  assert(burning + burned > 1, 'fire spread to at least 1 more cell (burning+burned=' + (burning + burned) + ')');
  await teardown();
}

// Suite 10: Fire does not spread to FIREBREAK
async function suite10() {
  console.log('\nSuite 10: Fire does not spread to FIREBREAK');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    const { ROWS, COLS, GRASS, BURNING, HOMESTEAD, FIREBREAK } = window.__test;
    // Clear grid
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (window.__test.gAt(r, c) !== HOMESTEAD) window.__test.setCell(r, c, GRASS);
    // Ring of firebreaks around a central burning cell
    window.__test.setCell(5, 9, BURNING);
    for (let d = -1; d <= 1; d++)
      for (let e = -1; e <= 1; e++)
        if (d !== 0 || e !== 0) window.__test.setCell(5 + d, 9 + e, FIREBREAK);
    window.__test.setWindDir(4);
    for (let i = 0; i < 8; i++) window.__test.forceFireTick();
  });
  const fb = await page.evaluate(() => window.__test.countCells(window.__test.FIREBREAK));
  assert(fb >= 8, 'all 8 firebreak cells are still intact (got ' + fb + ')');
  await teardown();
}

// Suite 11: Fire does not spread to WATER
async function suite11() {
  console.log('\nSuite 11: Fire does not spread to WATER');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    const { ROWS, COLS, GRASS, BURNING, HOMESTEAD, WATER } = window.__test;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (window.__test.gAt(r, c) !== HOMESTEAD) window.__test.setCell(r, c, GRASS);
    window.__test.setCell(5, 9, BURNING);
    for (let d = -1; d <= 1; d++)
      for (let e = -1; e <= 1; e++)
        if (d !== 0 || e !== 0) window.__test.setCell(5 + d, 9 + e, WATER);
    window.__test.setWindDir(4);
    for (let i = 0; i < 8; i++) window.__test.forceFireTick();
  });
  const water = await page.evaluate(() => window.__test.countCells(window.__test.WATER));
  assert(water >= 8, 'water cells remain (got ' + water + ')');
  await teardown();
}

// Suite 12: BURNING becomes BURNED after enough ticks
async function suite12() {
  console.log('\nSuite 12: BURNING cells become BURNED after burn duration');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    const { ROWS, COLS, GRASS, BURNING, FIREBREAK, HOMESTEAD } = window.__test;
    // Isolate one burning cell with firebreaks on all sides
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (window.__test.gAt(r, c) !== HOMESTEAD) window.__test.setCell(r, c, FIREBREAK);
    window.__test.setCell(5, 9, BURNING);
    // Run enough ticks to burn out (BURN_TICKS = 4, max 6)
    for (let i = 0; i < 8; i++) window.__test.forceFireTick();
  });
  const burning = await page.evaluate(() => window.__test.countCells(window.__test.BURNING));
  const burned  = await page.evaluate(() => window.__test.countCells(window.__test.BURNED));
  assert(burning === 0, 'no burning cells remain after 8 ticks (got ' + burning + ')');
  assert(burned >= 1, 'at least 1 burned cell exists');
  await teardown();
}

// Suite 13: Resources start at max
async function suite13() {
  console.log('\nSuite 13: Resources start at max values');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const res = await page.evaluate(() => window.__test.getResources());
  assert(res.breaks === 14, 'firebreaks start at 14 (got ' + res.breaks + ')');
  assert(res.water === 4, 'water starts at 4 (got ' + res.water + ')');
  await teardown();
}

// Suite 14: Placing firebreak decrements resource count
async function suite14() {
  console.log('\nSuite 14: Placing firebreak decrements resource');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTool('firebreak');
    window.__test.placeAt(5, 5);
  });
  const res = await page.evaluate(() => window.__test.getResources());
  assert(res.breaks === 13, 'firebreaks decremented to 13 (got ' + res.breaks + ')');
  await teardown();
}

// Suite 15: Firebreak placed on GRASS cell becomes FIREBREAK
async function suite15() {
  console.log('\nSuite 15: placeAt sets cell to FIREBREAK');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTool('firebreak');
    // Find a GRASS cell
    for (let r = 3; r < 6; r++)
      for (let c = 3; c < 8; c++)
        if (window.__test.gAt(r, c) === window.__test.GRASS) {
          window.__test.placeAt(r, c);
          window._placeR = r; window._placeC = c;
          return;
        }
  });
  const v = await page.evaluate(() => window.__test.gAt(window._placeR, window._placeC));
  assert(v === await page.evaluate(() => window.__test.FIREBREAK), 'cell is FIREBREAK after placement');
  await teardown();
}

// Suite 16: Placing water decrements water resource
async function suite16() {
  console.log('\nSuite 16: Placing water decrements resource');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTool('water');
    window.__test.placeAt(5, 5);
  });
  const res = await page.evaluate(() => window.__test.getResources());
  assert(res.water === 3, 'water decremented to 3 (got ' + res.water + ')');
  await teardown();
}

// Suite 17: Cannot place on non-GRASS cell
async function suite17() {
  console.log('\nSuite 17: Cannot place firebreak on STONE cell');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTool('firebreak');
    // Place on a stone cell (pre-set some in grid at [5,3])
    window.__test.setCell(5, 3, window.__test.STONE);
    window.__test.placeAt(5, 3);
  });
  const res = await page.evaluate(() => window.__test.getResources());
  const v   = await page.evaluate(() => window.__test.gAt(5, 3));
  assert(res.breaks === 14, 'no firebreak used on STONE (breaks still 14)');
  assert(v === await page.evaluate(() => window.__test.STONE), 'stone cell unchanged');
  await teardown();
}

// Suite 18: forceWin sets state to win
async function suite18() {
  console.log('\nSuite 18: forceWin transitions to win state');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceWin(); });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win after forceWin');
  await teardown();
}

// Suite 19: forceLose sets state to lose
async function suite19() {
  console.log('\nSuite 19: forceLose transitions to lose state');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceLose(); });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose after forceLose');
  await teardown();
}

// Suite 20: Score is 0 before game ends
async function suite20() {
  console.log('\nSuite 20: Score is 0 before game ends');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const s = await page.evaluate(() => window.__test.getScore());
  assert(s === 0, 'score starts at 0 (got ' + s + ')');
  await teardown();
}

// Suite 21: Win score is higher than lose score
async function suite21() {
  console.log('\nSuite 21: Win score > lose score (same grid state)');
  await setup();
  const scores = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.forceWin();
    const winScore = window.__test.getScore();
    window.__test.startGame();
    window.__test.forceLose();
    const loseScore = window.__test.getScore();
    return { winScore, loseScore };
  });
  assert(scores.winScore > scores.loseScore, 'win score (' + scores.winScore + ') > lose score (' + scores.loseScore + ')');
  await teardown();
}

// Suite 22: Tool toggles between firebreak and water
async function suite22() {
  console.log('\nSuite 22: Tool selection toggles correctly');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTool('water');
  });
  const t1 = await page.evaluate(() => window.__test.getTool());
  assert(t1 === 'water', 'tool is water after setTool');
  await page.evaluate(() => window.__test.setTool('firebreak'));
  const t2 = await page.evaluate(() => window.__test.getTool());
  assert(t2 === 'firebreak', 'tool switches back to firebreak');
  await teardown();
}

// Suite 23: Water extinguishes adjacent BURNING on tick
async function suite23() {
  console.log('\nSuite 23: WATER extinguishes adjacent BURNING on fire tick');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    const { ROWS, COLS, GRASS, BURNING, WATER, FIREBREAK, HOMESTEAD } = window.__test;
    // Isolate setup
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (window.__test.gAt(r, c) !== HOMESTEAD) window.__test.setCell(r, c, FIREBREAK);
    window.__test.setCell(5, 9, BURNING);
    window.__test.setCell(5, 10, WATER);   // adjacent water
    window.__test.forceFireTick();         // water should extinguish burning neighbor
  });
  const burning = await page.evaluate(() => window.__test.countCells(window.__test.BURNING));
  assert(burning === 0, 'BURNING cell extinguished by adjacent WATER (got ' + burning + ')');
  await teardown();
}

// Suite 24: Wind direction change via setWindDir
async function suite24() {
  console.log('\nSuite 24: setWindDir changes wind direction');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.setWindDir(2); });
  const wd = await page.evaluate(() => window.__test.getWindDir());
  assert(wd === 2, 'wind direction is 2 (E) after setWindDir (got ' + wd + ')');
  await teardown();
}

// Suite 25: Fire does not start on homestead cells
async function suite25() {
  console.log('\nSuite 25: Fire never starts on homestead cells');
  await setup();
  const ok = await page.evaluate(() => {
    for (let i = 0; i < 5; i++) {
      window.__test.startGame();
      const { HS_ROW, HS_COL, HOMESTEAD, gAt } = window.__test;
      for (let dr = 0; dr < 2; dr++)
        for (let dc = 0; dc < 2; dc++)
          if (gAt(HS_ROW + dr, HS_COL + dc) !== HOMESTEAD) return false;
    }
    return true;
  });
  assert(ok, 'homestead cells always HOMESTEAD after 5 inits');
  await teardown();
}

// Suite 26: Grid dimensions are correct
async function suite26() {
  console.log('\nSuite 26: Grid is COLS x ROWS');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const dims = await page.evaluate(() => ({
    cols: window.__test.COLS,
    rows: window.__test.ROWS,
    total: window.__test.countCells(window.__test.GRASS) +
           window.__test.countCells(window.__test.BURNING) +
           window.__test.countCells(window.__test.BURNED) +
           window.__test.countCells(window.__test.FIREBREAK) +
           window.__test.countCells(window.__test.WATER) +
           window.__test.countCells(window.__test.HOMESTEAD) +
           window.__test.countCells(window.__test.STONE) +
           window.__test.countCells(window.__test.EMPTY),
  }));
  assert(dims.cols === 18, 'COLS is 18');
  assert(dims.rows === 26, 'ROWS is 26');
  assert(dims.total === 18 * 26, 'all cells accounted for (' + dims.total + ')');
  await teardown();
}

// Suite 27: HUD grid height is 520px (26 * 20)
async function suite27() {
  console.log('\nSuite 27: GRID_H is 520');
  await setup();
  const gh = await page.evaluate(() => window.__test.GRID_H);
  assert(gh === 520, 'GRID_H is 520 (got ' + gh + ')');
  await teardown();
}

// Suite 28: Cannot use more resources than available
async function suite28() {
  console.log('\nSuite 28: Resource capped at 0 — no negative usage');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTool('water');
    // Drain all water
    for (let r = 3; r < 6; r++)
      for (let c = 2; c < 8; c++) {
        window.__test.setCell(r, c, window.__test.GRASS);
        window.__test.placeAt(r, c);
      }
  });
  const res = await page.evaluate(() => window.__test.getResources());
  assert(res.water >= 0, 'water resource never negative (got ' + res.water + ')');
  await teardown();
}

// Suite 29: Canvas renders visible content during title
async function suite29() {
  console.log('\nSuite 29: Title screen renders visible content');
  await setup();
  await page.waitForTimeout(200);
  // Scan a row near the fire glow for any bright pixel
  const px = await page.evaluate(() => {
    const data = document.getElementById('c').getContext('2d').getImageData(0, 310, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i] + data[i+1] + data[i+2]);
    return max;
  });
  assert(px > 30, 'title screen renders visible fire glow (max row brightness=' + px + ')');
  await teardown();
}

// Suite 30: Canvas renders grid during playing
async function suite30() {
  console.log('\nSuite 30: Grid renders during playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(150);
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 100, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 10, 'playing screen renders visible grid content');
  await teardown();
}

// Suite 31: Win screen renders after forceWin
async function suite31() {
  console.log('\nSuite 31: Win screen renders');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceWin(); });
  await page.waitForTimeout(150);
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 185, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 20, 'win screen renders visible content');
  await teardown();
}

// Suite 32: Lose screen renders after forceLose
async function suite32() {
  console.log('\nSuite 32: Lose screen renders');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.forceLose(); });
  await page.waitForTimeout(150);
  // Check the score area (bold 50px text at y=338, scan row for any bright yellow pixel)
  const px = await page.evaluate(() => {
    const data = document.getElementById('c').getContext('2d').getImageData(0, 330, W, 1).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i] + data[i+1] + data[i+2]);
    return max;
  });
  assert(px > 30, 'lose screen score area renders visible content (max=' + px + ')');
  await teardown();
}

// Suite 33: Feedback overlay opens and closes
async function suite33() {
  console.log('\nSuite 33: Feedback overlay opens and closes');
  await setup();
  const visible = await page.evaluate(() => {
    document.getElementById('fb-ov').style.display = 'flex';
    return document.getElementById('fb-ov').style.display;
  });
  assert(visible === 'flex', 'feedback overlay shows');
  const hidden = await page.evaluate(() => {
    document.getElementById('fb-cancel').click();
    return document.getElementById('fb-ov').style.display;
  });
  assert(hidden === 'none', 'feedback overlay closes on cancel');
  await teardown();
}

// Suite 34: Full state cycle title -> playing -> win -> title
async function suite34() {
  console.log('\nSuite 34: Full state cycle');
  await setup();
  let st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'starts at title');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'transitions to playing');
  await page.evaluate(() => window.__test.forceWin());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'transitions to win');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'restarts to playing');
  await teardown();
}

// Suite 35: Console error sweep
async function suite35() {
  console.log('\nSuite 35: Console error sweep');
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTool('firebreak');
    window.__test.placeAt(5, 5);
    window.__test.setTool('water');
    window.__test.placeAt(6, 6);
    for (let i = 0; i < 5; i++) window.__test.forceFireTick();
    window.__test.forceWin();
  });
  await page.waitForTimeout(200);
  const nonCorsErrors = errs.filter(e => !e.includes('CORS') && !e.includes('cross-origin') && !e.includes('net::ERR'));
  assert(nonCorsErrors.length === 0, 'no console errors: ' + JSON.stringify(nonCorsErrors));
  await teardown();
}

// ---- Run all suites -------------------------------------------------------
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15, suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25, suite26, suite27, suite28, suite29, suite30,
    suite31, suite32, suite33, suite34, suite35,
  ];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try { await s(); passed++; }
    catch (e) {
      console.error(e.message); failed++;
      if (browser) { try { await browser.close(); } catch {} browser = null; page = null; }
    }
  }
  console.log('\n--- Results ---');
  console.log('Passed: ' + passed + '/' + suites.length);
  if (failed > 0) console.log('Failed: ' + failed);
  process.exit(failed > 0 ? 1 : 0);
})();
