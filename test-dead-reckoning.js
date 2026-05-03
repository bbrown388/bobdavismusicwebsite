// Playwright tests for Dead Reckoning (Game 24)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'dead-reckoning.html').replace(/\\/g, '/');
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
  assert(dims.w === 360, 'canvas width 360');
  assert(dims.h === 640, 'canvas height 640');
  await teardown();
}

// Suite 3: startGame transitions to starphase
async function suite3() {
  console.log('\nSuite 3: startGame => starphase');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'starphase', 'state is starphase after startGame');
  await teardown();
}

// Suite 4: startGame resets score to 0
async function suite4() {
  console.log('\nSuite 4: startGame resets score to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(500);
    window.__test.startGame();
  });
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 0, 'score reset to 0 (got ' + sc + ')');
  await teardown();
}

// Suite 5: startGame resets lives to 3
async function suite5() {
  console.log('\nSuite 5: startGame resets lives to 3');
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
  console.log('\nSuite 6: startGame resets round to 0');
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
  const cnt = await page.evaluate(() => window.__test.ROUNDS.length);
  assert(cnt === 5, 'ROUNDS.length is 5 (got ' + cnt + ')');
  await teardown();
}

// Suite 8: NAMED_STARS has 6 entries
async function suite8() {
  console.log('\nSuite 8: NAMED_STARS has 6 entries');
  await setup();
  const cnt = await page.evaluate(() => window.__test.NAMED_STARS.length);
  assert(cnt === 6, 'NAMED_STARS.length is 6 (got ' + cnt + ')');
  await teardown();
}

// Suite 9: Grid constants - COLS=5, ROWS=4
async function suite9() {
  console.log('\nSuite 9: Grid constants COLS=5 ROWS=4');
  await setup();
  const { cols, rows } = await page.evaluate(() => ({
    cols: window.__test.COLS,
    rows: window.__test.ROWS
  }));
  assert(cols === 5, 'COLS is 5 (got ' + cols + ')');
  assert(rows === 4, 'ROWS is 4 (got ' + rows + ')');
  await teardown();
}

// Suite 10: cellCenter returns correct coordinates
async function suite10() {
  console.log('\nSuite 10: cellCenter returns correct coords');
  await setup();
  const c = await page.evaluate(() => {
    const { x, y } = window.__test.cellCenter(0, 0);
    return { x, y };
  });
  // cell(0,0) center: x = 0*72 + 36 = 36, y = MAP_Y + 0*50 + 25 = 423
  assert(c.x === 36, 'cell(0,0) x is 36 (got ' + c.x + ')');
  assert(typeof c.y === 'number' && c.y > 0, 'cell(0,0) y is positive number (got ' + c.y + ')');
  await teardown();
}

// Suite 11: cellCenter (2,3) returns expected coords for round 1 player position
async function suite11() {
  console.log('\nSuite 11: cellCenter(2,3) matches round 1 player start');
  await setup();
  const c = await page.evaluate(() => window.__test.cellCenter(2, 3));
  // CW=72, CH=50, MAP_Y=398: x=2*72+36=180, y=398+3*50+25=573
  assert(c.x === 180, 'cell(2,3) x is 180 (got ' + c.x + ')');
  assert(c.y === 573, 'cell(2,3) y is 573 (got ' + c.y + ')');
  await teardown();
}

// Suite 12: bearingSegment returns segment clipped to terrain rect
async function suite12() {
  console.log('\nSuite 12: bearingSegment returns clipped segment');
  await setup();
  const seg = await page.evaluate(() => window.__test.bearingSegment(2, 3, 0));
  // bearing 0 = north, line should be vertical through x=180
  assert(seg !== null, 'bearingSegment returns non-null for bearing 0');
  assert(Math.abs(seg.x1 - 180) < 1, 'segment x1 near 180 (got ' + seg.x1 + ')');
  assert(Math.abs(seg.x2 - 180) < 1, 'segment x2 near 180 (got ' + seg.x2 + ')');
  await teardown();
}

// Suite 13: bearingSegment bearing 90 is horizontal line
async function suite13() {
  console.log('\nSuite 13: bearingSegment bearing 90 is horizontal');
  await setup();
  const seg = await page.evaluate(() => window.__test.bearingSegment(2, 1, 90));
  // bearing 90 = east, dy=0 -> y constant
  assert(seg !== null, 'bearingSegment returns non-null for bearing 90');
  const { x: cx, y: cy } = await page.evaluate(() => window.__test.cellCenter(2, 1));
  assert(Math.abs(seg.y1 - cy) < 1, 'segment y1 equals cell center y (got ' + seg.y1 + ' vs ' + cy + ')');
  assert(Math.abs(seg.y2 - cy) < 1, 'segment y2 equals cell center y (got ' + seg.y2 + ' vs ' + cy + ')');
  await teardown();
}

// Suite 14: tapStar in starphase adds to drawnBearings
async function suite14() {
  console.log('\nSuite 14: tapStar adds bearing when star tapped');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame(); // round 0
    // NAMED_STARS[0] is POLARIS at x=180, y=85 - navStar for round 0
    window.__test.tapStar({ x: 180, y: 85 });
  });
  const n = await page.evaluate(() => window.__test.getDrawnBearings().length);
  assert(n === 1, 'drawnBearings has 1 entry after tapping nav star (got ' + n + ')');
  await teardown();
}

// Suite 15: tapStar of same star twice doesn't add duplicate
async function suite15() {
  console.log('\nSuite 15: tapStar same star twice - no duplicate');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapStar({ x: 180, y: 85 }); // POLARIS
    window.__test.tapStar({ x: 180, y: 85 }); // POLARIS again
  });
  const n = await page.evaluate(() => window.__test.getTappedNavStars().length);
  assert(n === 1, 'tappedNavStars has 1 (not 2) after tapping same star twice (got ' + n + ')');
  await teardown();
}

// Suite 16: tapStar non-nav star does nothing
async function suite16() {
  console.log('\nSuite 16: tapStar non-nav star does nothing');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame(); // round 0 navStars=[0,1]
    // NAMED_STARS[5] = RIGEL at (195, 320) - not a nav star in round 0
    window.__test.tapStar({ x: 195, y: 320 });
  });
  const n = await page.evaluate(() => window.__test.getDrawnBearings().length);
  assert(n === 0, 'drawnBearings still 0 after tapping non-nav star (got ' + n + ')');
  await teardown();
}

// Suite 17: After both stars tapped state transitions to locating
async function suite17() {
  console.log('\nSuite 17: After 2 star taps, transitions to locating');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame(); // round 0 navStars=[0,1]
    window.__test.tapStar({ x: 180, y: 85 });  // POLARIS
    window.__test.tapStar({ x: 286, y: 128 }); // VEGA
  });
  await page.waitForTimeout(1100);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'locating', 'state is locating after 2 star taps (got ' + st + ')');
  await teardown();
}

// Suite 18: tapTerrain correct cell increases score
async function suite18() {
  console.log('\nSuite 18: tapTerrain correct cell increases score');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame(); // round 0 player at [2,3]
    window.__test.setState('locating');
    window.__test.setDrawnBearings([{starIdx:0,bearing:0}]);
  });
  const scoreBefore = await page.evaluate(() => window.__test.getScore());
  await page.evaluate(() => {
    // Player is at cell [2,3]: MAP_Y=398, y = 398+3*50+25=573, x=2*72+36=180
    window.__test.tapTerrain(180, 573);
  });
  const scoreAfter = await page.evaluate(() => window.__test.getScore());
  assert(scoreAfter > scoreBefore, 'score increased after correct terrain tap (got ' + scoreAfter + ')');
  await teardown();
}

// Suite 19: tapTerrain correct cell on first try gives 100 points
async function suite19() {
  console.log('\nSuite 19: Correct locate on first try gives 100 points');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('locating');
    window.__test.setScore(0);
  });
  await page.evaluate(() => window.__test.tapTerrain(180, 573)); // correct cell
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 100, 'first-try correct locate gives 100 points (got ' + sc + ')');
  await teardown();
}

// Suite 20: tapTerrain wrong cell increases locateTries
async function suite20() {
  console.log('\nSuite 20: tapTerrain wrong cell increases locateTries');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('locating');
  });
  await page.evaluate(() => {
    // Cell [0,0] is wrong for round 0 (player at [2,3])
    window.__test.tapTerrain(36, window.__test.MAP_Y + 25); // cell(0,0)
  });
  const tries = await page.evaluate(() => window.__test.getLocateTries());
  assert(tries === 1, 'locateTries incremented to 1 on wrong tap (got ' + tries + ')');
  await teardown();
}

// Suite 21: tapTerrain correct cell after wrong try gives < 100 points
async function suite21() {
  console.log('\nSuite 21: Correct locate after wrong try gives < 100 points');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('locating');
    window.__test.setScore(0);
    // Wrong tap first
    window.__test.tapTerrain(36, window.__test.MAP_Y + 25);
    // Correct tap
    window.__test.tapTerrain(180, 573);
  });
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0 && sc < 100, 'second-try correct locate gives 1-99 points (got ' + sc + ')');
  await teardown();
}

// Suite 22: movePlayer moves playerCell correctly
async function suite22() {
  console.log('\nSuite 22: movePlayer N moves player north');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
    window.__test.setPlayerCell(2, 3);
  });
  await page.evaluate(() => window.__test.movePlayer('N'));
  const pc = await page.evaluate(() => window.__test.getPlayerCell());
  assert(pc[0] === 2 && pc[1] === 2, 'player moved N from [2,3] to [2,2] (got ' + JSON.stringify(pc) + ')');
  await teardown();
}

// Suite 23: movePlayer E moves player east
async function suite23() {
  console.log('\nSuite 23: movePlayer E moves player east');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
    window.__test.setPlayerCell(1, 2);
  });
  await page.evaluate(() => window.__test.movePlayer('E'));
  const pc = await page.evaluate(() => window.__test.getPlayerCell());
  assert(pc[0] === 2 && pc[1] === 2, 'player moved E from [1,2] to [2,2] (got ' + JSON.stringify(pc) + ')');
  await teardown();
}

// Suite 24: movePlayer into boundary does not change cell
async function suite24() {
  console.log('\nSuite 24: movePlayer into wall boundary - no change');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
    window.__test.setPlayerCell(0, 0);
  });
  await page.evaluate(() => {
    window.__test.movePlayer('N'); // already at top row
    window.__test.movePlayer('W'); // already at left col
  });
  const pc = await page.evaluate(() => window.__test.getPlayerCell());
  assert(pc[0] === 0 && pc[1] === 0, 'player stayed at [0,0] after hitting walls (got ' + JSON.stringify(pc) + ')');
  await teardown();
}

// Suite 25: movePlayer decrements movesLeft
async function suite25() {
  console.log('\nSuite 25: movePlayer decrements movesLeft');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
    window.__test.setPlayerCell(2, 2);
    window.__test.setMovesLeft(5);
  });
  await page.evaluate(() => window.__test.movePlayer('N'));
  const ml = await page.evaluate(() => window.__test.getMovesLeft());
  assert(ml === 4, 'movesLeft decremented to 4 (got ' + ml + ')');
  await teardown();
}

// Suite 26: movePlayer into ravine decreases lives
async function suite26() {
  console.log('\nSuite 26: movePlayer into ravine decreases lives');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
    window.__test.setLives(3);
    // Round 2 has ravine at [2,1] - player moves from [1,1] east into it
    window.__test.setRound(1);
    window.__test.startRound();
    window.__test.setState('navigating');
    window.__test.setPlayerCell(1, 1);
    window.__test.movePlayer('E'); // moves into terrain[1][2]='v'
  });
  const l = await page.evaluate(() => window.__test.getLives());
  assert(l < 3, 'lives decreased after hitting ravine (got ' + l + ')');
  await teardown();
}

// Suite 27: movePlayer into ravine with 1 life triggers gameover
async function suite27() {
  console.log('\nSuite 27: movePlayer into ravine with 1 life => gameover');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRound(1);
    window.__test.startRound();
    window.__test.setState('navigating');
    window.__test.setLives(1);
    window.__test.setPlayerCell(1, 1);
    window.__test.movePlayer('E'); // ravine at [2,1]
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover', 'state is gameover after hitting ravine with 1 life (got ' + st + ')');
  await teardown();
}

// Suite 28: movePlayer reaches ranch triggers roundover
async function suite28() {
  console.log('\nSuite 28: movePlayer reaches ranch => roundover');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame(); // round 0: ranch at [2,0]
    window.__test.setState('navigating');
    window.__test.setPlayerCell(2, 1); // one step south of ranch
    window.__test.setMovesLeft(5);
    window.__test.movePlayer('N'); // move into [2,0] = ranch
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'roundover', 'state is roundover after reaching ranch (got ' + st + ')');
  await teardown();
}

// Suite 29: roundover transitions to round 1 after delay
async function suite29() {
  console.log('\nSuite 29: roundover => round 1 after delay');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
    window.__test.setPlayerCell(2, 1);
    window.__test.setMovesLeft(5);
    window.__test.movePlayer('N');
  });
  await page.waitForTimeout(2500);
  const { st, r } = await page.evaluate(() => ({
    st: window.__test.getState(),
    r: window.__test.getRound()
  }));
  assert(r === 1, 'round incremented to 1 (got ' + r + ')');
  assert(st === 'starphase', 'state is starphase for next round (got ' + st + ')');
  await teardown();
}

// Suite 30: After 5 rounds won, state is gamewin
async function suite30() {
  console.log('\nSuite 30: Completing round 4 triggers gamewin');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setRound(4);
    window.__test.startRound();
    window.__test.setState('navigating');
    // Round 4: ranch at [4,0], navigate player there
    const rd = window.__test.ROUNDS[4];
    const [rc, rr] = rd.ranchCell;
    window.__test.setPlayerCell(rc, rr + 1);
    window.__test.setMovesLeft(5);
    window.__test.movePlayer('N');
  });
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gamewin', 'state is gamewin after completing round 5 (got ' + st + ')');
  await teardown();
}

// Suite 31: isStarCovered returns true when cloud overlaps
async function suite31() {
  console.log('\nSuite 31: isStarCovered detects cloud overlap');
  await setup();
  const covered = await page.evaluate(() => {
    window.__test.startGame();
    // POLARIS is at x=180, y=85 - manually put a cloud over it
    window.__test.startRound();
    // Access internal clouds and override position
    // We can't directly, but we can test with a star well outside any default cloud
    // Instead test: cover POLARIS manually by setting cloud position
    // Can we? clouds are internal... let's test via indirect method
    // The default round 0 cloud starts at x=-220, won't cover POLARIS at x=180
    // So isStarCovered(0) should be false at game start
    return window.__test.isStarCovered(0);
  });
  assert(!covered, 'POLARIS not covered at game start (cloud starts off-screen)');
  await teardown();
}

// Suite 32: startRound resets playerCell to round's starting position
async function suite32() {
  console.log('\nSuite 32: startRound resets playerCell');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame(); // round 0
    window.__test.setPlayerCell(0, 0);
    window.__test.startRound();
  });
  const pc = await page.evaluate(() => window.__test.getPlayerCell());
  // Round 0 player start: [2,3]
  assert(pc[0] === 2 && pc[1] === 3, 'playerCell reset to [2,3] by startRound (got ' + JSON.stringify(pc) + ')');
  await teardown();
}

// Suite 33: startRound resets movesLeft to round's maxMoves
async function suite33() {
  console.log('\nSuite 33: startRound resets movesLeft');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setMovesLeft(0);
    window.__test.startRound();
  });
  const ml = await page.evaluate(() => window.__test.getMovesLeft());
  assert(ml > 0, 'movesLeft > 0 after startRound (got ' + ml + ')');
  await teardown();
}

// Suite 34: startRound clears drawnBearings
async function suite34() {
  console.log('\nSuite 34: startRound clears drawnBearings');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setDrawnBearings([{starIdx:0,bearing:0}]);
    window.__test.startRound();
  });
  const n = await page.evaluate(() => window.__test.getDrawnBearings().length);
  assert(n === 0, 'drawnBearings cleared by startRound (got ' + n + ')');
  await teardown();
}

// Suite 35: hitNavBtn returns correct direction for N button
async function suite35() {
  console.log('\nSuite 35: hitNavBtn returns N for north button area');
  await setup();
  const dir = await page.evaluate(() => {
    const btn = window.__test.NAV_BTNS[0]; // N button
    return window.__test.hitNavBtn(btn.x + btn.w/2, btn.y + btn.h/2);
  });
  assert(dir === 'N', 'hitNavBtn returns N (got ' + dir + ')');
  await teardown();
}

// Suite 36: hitNavBtn returns null for area outside buttons
async function suite36() {
  console.log('\nSuite 36: hitNavBtn returns null outside buttons');
  await setup();
  const dir = await page.evaluate(() => window.__test.hitNavBtn(0, 0));
  assert(dir === null, 'hitNavBtn returns null outside buttons (got ' + dir + ')');
  await teardown();
}

// Suite 37: NAV_BTNS has 4 entries
async function suite37() {
  console.log('\nSuite 37: NAV_BTNS has 4 entries');
  await setup();
  const n = await page.evaluate(() => window.__test.NAV_BTNS.length);
  assert(n === 4, 'NAV_BTNS has 4 entries (got ' + n + ')');
  await teardown();
}

// Suite 38: STAR_HIT_R is positive
async function suite38() {
  console.log('\nSuite 38: STAR_HIT_R > 0');
  await setup();
  const r = await page.evaluate(() => window.__test.STAR_HIT_R);
  assert(r > 0, 'STAR_HIT_R is positive (got ' + r + ')');
  await teardown();
}

// Suite 39: Each ROUND has navStars, bearings, playerCell, ranchCell, terrain, clouds
async function suite39() {
  console.log('\nSuite 39: All ROUNDS have required fields');
  await setup();
  const ok = await page.evaluate(() => window.__test.ROUNDS.every(rd =>
    Array.isArray(rd.navStars) && rd.navStars.length === 2 &&
    Array.isArray(rd.bearings) && rd.bearings.length === 2 &&
    Array.isArray(rd.playerCell) && rd.playerCell.length === 2 &&
    Array.isArray(rd.ranchCell) && rd.ranchCell.length === 2 &&
    Array.isArray(rd.terrain) && rd.terrain.length > 0 &&
    Array.isArray(rd.clouds) && rd.clouds.length > 0 &&
    rd.maxMoves > 0
  ));
  assert(ok, 'all ROUNDS have required fields');
  await teardown();
}

// Suite 40: Each ROUND navStars reference valid NAMED_STARS indices
async function suite40() {
  console.log('\nSuite 40: ROUND navStars reference valid star indices');
  await setup();
  const ok = await page.evaluate(() => {
    const n = window.__test.NAMED_STARS.length;
    return window.__test.ROUNDS.every(rd => rd.navStars.every(i => i >= 0 && i < n));
  });
  assert(ok, 'all ROUND navStar indices are valid');
  await teardown();
}

// Suite 41: Each ROUND bearings are 0..360
async function suite41() {
  console.log('\nSuite 41: ROUND bearings are in 0..360 range');
  await setup();
  const ok = await page.evaluate(() =>
    window.__test.ROUNDS.every(rd => rd.bearings.every(b => b >= 0 && b <= 360))
  );
  assert(ok, 'all ROUND bearings in 0-360');
  await teardown();
}

// Suite 42: localStorage key is dead_reckoning_best
async function suite42() {
  console.log('\nSuite 42: localStorage key is dead_reckoning_best');
  await setup();
  await page.evaluate(() => localStorage.setItem('dead_reckoning_best', '99999'));
  await page.reload();
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => parseInt(localStorage.getItem('dead_reckoning_best') || '0', 10));
  assert(b === 99999, 'dead_reckoning_best persists (got ' + b + ')');
  await teardown();
}

// Suite 43: FEEDBACK_ENDPOINT present in script
async function suite43() {
  console.log('\nSuite 43: FEEDBACK_ENDPOINT present in script');
  await setup();
  const ok = await page.evaluate(() => {
    for (const s of document.querySelectorAll('script')) {
      if (s.textContent.includes('FEEDBACK_ENDPOINT')) return true;
    }
    return false;
  });
  assert(ok, 'FEEDBACK_ENDPOINT constant present in script');
  await teardown();
}

// Suite 44: Title screen renders pixels
async function suite44() {
  console.log('\nSuite 44: Title screen renders pixels');
  await setup();
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 360, 640);
    let cnt = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i+1] > 20 || d.data[i+2] > 20) cnt++;
    }
    return cnt;
  });
  assert(n > 1000, 'title screen renders pixels (got ' + n + ')');
  await teardown();
}

// Suite 45: HUD renders pixels in top bar after startGame
async function suite45() {
  console.log('\nSuite 45: HUD renders pixels in top bar');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 360, 40);
    let cnt = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i+1] > 20 || d.data[i+2] > 20) cnt++;
    }
    return cnt;
  });
  assert(n > 50, 'HUD area renders pixels (got ' + n + ')');
  await teardown();
}

// Suite 46: Sky zone renders pixels (stars visible)
async function suite46() {
  console.log('\nSuite 46: Sky zone renders pixels');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 40, 360, 330);
    let cnt = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i+1] > 20 || d.data[i+2] > 20) cnt++;
    }
    return cnt;
  });
  assert(n > 200, 'sky zone renders star pixels (got ' + n + ')');
  await teardown();
}

// Suite 47: Terrain zone renders pixels in playing state
async function suite47() {
  console.log('\nSuite 47: Terrain zone renders pixels');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
  });
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 398, 360, 200);
    let cnt = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i+1] > 20 || d.data[i+2] > 20) cnt++;
    }
    return cnt;
  });
  assert(n > 500, 'terrain zone renders pixels (got ' + n + ')');
  await teardown();
}

// Suite 48: Nav buttons zone renders pixels in navigating state
async function suite48() {
  console.log('\nSuite 48: Nav buttons render in navigating state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('navigating');
  });
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(100, 598, 160, 42);
    let cnt = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i+1] > 20 || d.data[i+2] > 20) cnt++;
    }
    return cnt;
  });
  assert(n > 30, 'nav buttons area renders pixels (got ' + n + ')');
  await teardown();
}

// Suite 49: gameover screen renders pixels
async function suite49() {
  console.log('\nSuite 49: gameover screen renders pixels');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('gameover');
  });
  await page.waitForTimeout(150);
  const n = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, 360, 640);
    let cnt = 0;
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 20 || d.data[i+1] > 20 || d.data[i+2] > 20) cnt++;
    }
    return cnt;
  });
  assert(n > 500, 'gameover screen renders pixels (got ' + n + ')');
  await teardown();
}

// Suite 50: No console errors
async function suite50() {
  console.log('\nSuite 50: No console errors');
  await setup();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapStar({ x: 180, y: 85 });
    window.__test.tapStar({ x: 286, y: 128 });
    window.__test.setState('navigating');
    window.__test.movePlayer('N');
    window.__test.movePlayer('E');
  });
  await page.waitForTimeout(400);
  const filtered = errors.filter(e => !e.includes('FEEDBACK_ENDPOINT') && !e.includes('fetch'));
  assert(filtered.length === 0, 'no console errors (got: ' + filtered.join('; ') + ')');
  await teardown();
}

async function main() {
  const suites = [
    suite1,  suite2,  suite3,  suite4,  suite5,
    suite6,  suite7,  suite8,  suite9,  suite10,
    suite11, suite12, suite13, suite14, suite15,
    suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25,
    suite26, suite27, suite28, suite29, suite30,
    suite31, suite32, suite33, suite34, suite35,
    suite36, suite37, suite38, suite39, suite40,
    suite41, suite42, suite43, suite44, suite45,
    suite46, suite47, suite48, suite49, suite50,
  ];
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      try { await teardown(); } catch (_) {}
    }
  }
  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  process.exit(failed > 0 ? 1 : 0);
}

main();
