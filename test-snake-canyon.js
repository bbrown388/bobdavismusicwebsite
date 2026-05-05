// Playwright tests for Snake Canyon (Game 35)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'snake-canyon.html').replace(/\\/g, '/');
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
  assert(s === 'title', 'initial state = title');
  await teardown();
}

// Suite 3: Core constants
async function suite3() {
  console.log('\nSuite 3: Core constants');
  await setup();
  const c = await page.evaluate(() => ({
    rows: window.__test.ROWS,
    cols: window.__test.COLS,
    timer: window.__test.TIMER_MAX,
    hearRange: window.__test.SNAKE_HEAR_RANGE,
    alertDur: window.__test.SNAKE_ALERT_DUR,
    loudWindow: window.__test.LOUD_STEP_WINDOW,
    fe: window.__test.FEEDBACK_ENDPOINT,
  }));
  assert(c.rows > 0, 'ROWS > 0');
  assert(c.cols > 0, 'COLS > 0');
  assert(c.timer > 0, 'TIMER_MAX > 0');
  assert(c.hearRange > 0, 'SNAKE_HEAR_RANGE > 0');
  assert(c.alertDur > 0, 'SNAKE_ALERT_DUR > 0');
  assert(c.loudWindow > 0, 'LOUD_STEP_WINDOW > 0');
  assert(typeof c.fe === 'string' && c.fe.startsWith('https'), 'FEEDBACK_ENDPOINT is https URL');
  await teardown();
}

// Suite 4: SLOTS perspective array structure
async function suite4() {
  console.log('\nSuite 4: SLOTS perspective array');
  await setup();
  const r = await page.evaluate(() => {
    const s = window.__test.SLOTS;
    return {
      len: s.length,
      farthestNarrower: s[0][1] - s[0][0] < s[3][1] - s[3][0],
      allFourElements: s.every(sl => sl.length === 4),
    };
  });
  assert(r.len === 4, 'SLOTS has 4 depth levels');
  assert(r.farthestNarrower, 'farthest slot is narrower than nearest');
  assert(r.allFourElements, 'every slot has 4 values [lx,rx,ty,by]');
  await teardown();
}

// Suite 5: startGame() resets all state
async function suite5() {
  console.log('\nSuite 5: startGame() resets all state');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    return {
      state: window.__test.state,
      timeLeft: window.__test.timeLeft,
      stepsTaken: window.__test.stepsTaken,
      snakeAlert: window.__test.snakeAlert,
      hasMaze: window.__test.maze !== null,
      playerR: window.__test.playerR,
      playerC: window.__test.playerC,
    };
  });
  assert(r.state === 'playing', 'state = playing after startGame');
  assert(r.timeLeft > 0, 'timeLeft > 0 after startGame');
  assert(r.stepsTaken === 0, 'stepsTaken = 0 after startGame');
  assert(r.snakeAlert === 0, 'snakeAlert = 0 after startGame');
  assert(r.hasMaze, 'maze is generated');
  assert(r.playerR >= 0, 'playerR is valid');
  assert(r.playerC >= 0, 'playerC is valid');
  await teardown();
}

// Suite 6: generateMaze produces valid connected maze
async function suite6() {
  console.log('\nSuite 6: generateMaze produces a valid maze');
  await setup();
  const r = await page.evaluate(() => {
    const maze = window.__test.generateMaze();
    const ROWS = window.__test.ROWS, COLS = window.__test.COLS;
    const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];
    // BFS from bottom-center to check all cells are reachable
    const start = [ROWS - 1, Math.floor(COLS / 2)];
    const visited = new Set();
    const q = [start];
    while (q.length) {
      const [r, c] = q.shift();
      const k = r * COLS + c;
      if (visited.has(k)) continue;
      visited.add(k);
      for (let d = 0; d < 4; d++) {
        if (!maze[r][c].walls[d]) {
          const nr = r + DR[d], nc = c + DC[d];
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
            q.push([nr, nc]);
        }
      }
    }
    return { totalCells: ROWS * COLS, reachable: visited.size };
  });
  assert(r.reachable === r.totalCells, `all ${r.totalCells} maze cells are reachable from start`);
  await teardown();
}

// Suite 7: Player starts at bottom-center facing north
async function suite7() {
  console.log('\nSuite 7: Player starts at bottom-center facing north');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    return {
      row: window.__test.playerR,
      col: window.__test.playerC,
      dir: window.__test.playerDir,
      rows: window.__test.ROWS,
      cols: window.__test.COLS,
    };
  });
  assert(r.row === r.rows - 1, 'player starts at bottom row');
  assert(r.col === Math.floor(r.cols / 2), 'player starts at center column');
  assert(r.dir === 0, 'player starts facing north (dir=0)');
  await teardown();
}

// Suite 8: Snake starts at least 4 cells from player
async function suite8() {
  console.log('\nSuite 8: Snake spawns at least 4 Manhattan cells from player');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const dist = Math.abs(window.__test.snakeR - window.__test.playerR)
               + Math.abs(window.__test.snakeC - window.__test.playerC);
    return { dist };
  });
  assert(r.dist >= 4, `snake-player distance = ${r.dist} >= 4`);
  await teardown();
}

// Suite 9: Turning left changes direction correctly
async function suite9() {
  console.log('\nSuite 9: Turning left rotates direction CCW');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.playerDir = 0; // N
    window.__test.tryMove('left');
    const d1 = window.__test.playerDir; // should be W=3
    window.__test.tryMove('left');
    const d2 = window.__test.playerDir; // S=2
    return { d1, d2 };
  });
  assert(r.d1 === 3, 'turn left from N = W (3)');
  assert(r.d2 === 2, 'turn left from W = S (2)');
  await teardown();
}

// Suite 10: Turning right changes direction correctly
async function suite10() {
  console.log('\nSuite 10: Turning right rotates direction CW');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.playerDir = 0; // N
    window.__test.tryMove('right');
    const d1 = window.__test.playerDir; // E=1
    window.__test.tryMove('right');
    const d2 = window.__test.playerDir; // S=2
    return { d1, d2 };
  });
  assert(r.d1 === 1, 'turn right from N = E (1)');
  assert(r.d2 === 2, 'turn right from E = S (2)');
  await teardown();
}

// Suite 11: Player cannot walk through walls
async function suite11() {
  console.log('\nSuite 11: Player cannot walk through walls');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const r0 = window.__test.playerR, c0 = window.__test.playerC;
    // Find a direction that has a wall
    let wallDir = -1;
    for (let d = 0; d < 4; d++) {
      if (window.__test.maze[r0][c0].walls[d]) { wallDir = d; break; }
    }
    if (wallDir === -1) return { skipped: true };
    window.__test.playerDir = wallDir;
    window.__test.tryMove('forward');
    return {
      skipped: false,
      sameR: window.__test.playerR === r0,
      sameC: window.__test.playerC === c0,
    };
  });
  if (!r.skipped) {
    assert(r.sameR && r.sameC, 'player stays in place when wall blocks forward');
  } else {
    console.log('  SKIP: all directions open (unlikely but possible)');
  }
  await teardown();
}

// Suite 12: bfsPath finds path between adjacent cells
async function suite12() {
  console.log('\nSuite 12: bfsPath finds path to adjacent reachable cell');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const maze = window.__test.maze;
    const ROWS = window.__test.ROWS, COLS = window.__test.COLS;
    // Find a cell with an open North passage
    for (let row = 1; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!maze[row][col].walls[0]) {
          const path = window.__test.bfsPath(row, col, row - 1, col);
          return { pathLen: path.length, firstDir: path[0] };
        }
      }
    }
    return { pathLen: -1 };
  });
  assert(r.pathLen === 1, 'bfsPath to adjacent cell returns 1-step path');
  assert(r.firstDir === 0, 'first step direction is North (0)');
  await teardown();
}

// Suite 13: bfsPath returns empty array for same cell
async function suite13() {
  console.log('\nSuite 13: bfsPath returns empty when start = end');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const path = window.__test.bfsPath(3, 3, 3, 3);
    return { len: path.length };
  });
  assert(r.len === 0, 'bfsPath returns [] when from=to');
  await teardown();
}

// Suite 14: getCorridorView returns 3 sections
async function suite14() {
  console.log('\nSuite 14: getCorridorView returns 3 sections');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const v = window.__test.getCorridorView();
    return {
      len: v.length,
      allHaveFields: v.every(s => typeof s.leftOpen === 'boolean' && typeof s.rightOpen === 'boolean' && typeof s.backWall === 'boolean'),
    };
  });
  assert(r.len === 3, 'getCorridorView returns 3 sections');
  assert(r.allHaveFields, 'each section has leftOpen, rightOpen, backWall booleans');
  await teardown();
}

// Suite 15: Loud step alerts snake when close
async function suite15() {
  console.log('\nSuite 15: Loud footstep alerts snake when within hearing range');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    // Place snake 2 cells north of player (within SNAKE_HEAR_RANGE)
    window.__test.snakeR = window.__test.playerR - 2;
    window.__test.snakeC = window.__test.playerC;
    window.__test.snakeAlert = 0;
    // Find a forward (north) opening
    const maze = window.__test.maze;
    let pr = window.__test.playerR, pc = window.__test.playerC;
    // Force open the north wall for testing
    maze[pr][pc].walls[0] = false;
    const nr = pr - 1;
    if (nr >= 0) maze[nr][pc].walls[2] = false;
    window.__test.playerDir = 0;
    // Make step loud: set lastStepTime to "just now"
    window.__test.lastStepTime = performance.now() / 1000 - 0.1; // within LOUD window
    window.__test.tryMove('forward');
    return { snakeAlert: window.__test.snakeAlert };
  });
  assert(r.snakeAlert > 0, 'snake becomes alerted after loud footstep within hearing range');
  await teardown();
}

// Suite 16: Quiet step does not alert snake
async function suite16() {
  console.log('\nSuite 16: Quiet footstep does not alert snake');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.snakeAlert = 0;
    // Place snake close
    window.__test.snakeR = window.__test.playerR - 2;
    window.__test.snakeC = window.__test.playerC;
    const maze = window.__test.maze;
    const pr = window.__test.playerR, pc = window.__test.playerC;
    maze[pr][pc].walls[0] = false;
    const nr = pr - 1; if (nr >= 0) maze[nr][pc].walls[2] = false;
    window.__test.playerDir = 0;
    // Quiet step: lastStepTime was 2 seconds ago (beyond LOUD_STEP_WINDOW)
    window.__test.lastStepTime = performance.now() / 1000 - 2.0;
    window.__test.tryMove('forward');
    return { snakeAlert: window.__test.snakeAlert };
  });
  assert(r.snakeAlert === 0, 'snake stays calm after quiet footstep');
  await teardown();
}

// Suite 17: triggerWin sets state to win and saves score
async function suite17() {
  console.log('\nSuite 17: triggerWin() sets state=win and saves score');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.timeLeft = 45;
    localStorage.removeItem('snake_canyon_best');
    window.__test.triggerWin();
    return {
      state: window.__test.state,
      score: window.__test.score,
      stored: localStorage.getItem('snake_canyon_best'),
    };
  });
  assert(r.state === 'win', 'state = win after triggerWin');
  assert(r.score === 45, 'score = timeLeft at time of win');
  assert(r.stored === '45', 'localStorage stores best score');
  await teardown();
}

// Suite 18: triggerLose sets state to lose
async function suite18() {
  console.log('\nSuite 18: triggerLose() sets state=lose');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.triggerLose();
    return { state: window.__test.state };
  });
  assert(r.state === 'lose', 'state = lose after triggerLose');
  await teardown();
}

// Suite 19: Timer decrements during play (simulated via direct mutation)
async function suite19() {
  console.log('\nSuite 19: timeLeft starts at TIMER_MAX on startGame');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    return {
      timeLeft: window.__test.timeLeft,
      timerMax: window.__test.TIMER_MAX,
    };
  });
  assert(Math.abs(r.timeLeft - r.timerMax) < 0.01, 'timeLeft = TIMER_MAX on start');
  await teardown();
}

// Suite 20: Click on title starts game
async function suite20() {
  console.log('\nSuite 20: Click on title canvas starts game');
  await setup();
  await page.evaluate(() => { document.getElementById('c').click(); });
  const s = await page.evaluate(() => window.__test.state);
  assert(s === 'playing', 'click on title transitions to playing state');
  await teardown();
}

// Suite 21: No console errors on load
async function suite21() {
  console.log('\nSuite 21: No console errors on load');
  await setup();
  await page.waitForTimeout(500);
  assert(consoleErrors.length === 0, 'no console errors (got: ' + consoleErrors.join(', ') + ')');
  await teardown();
}

// Suite 22: Background pixel is not white
async function suite22() {
  console.log('\nSuite 22: Background pixel is not white');
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

// Suite 23: FEEDBACK_ENDPOINT is Google Apps Script URL
async function suite23() {
  console.log('\nSuite 23: FEEDBACK_ENDPOINT is valid Google Apps Script URL');
  await setup();
  const fe = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(fe.includes('script.google.com'), 'FEEDBACK_ENDPOINT points to script.google.com');
  assert(fe.startsWith('https://'), 'FEEDBACK_ENDPOINT starts with https://');
  await teardown();
}

// Suite 24: Maze exit is open at top
async function suite24() {
  console.log('\nSuite 24: Maze exit cell has open north wall');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const COLS = window.__test.COLS;
    const exitC = Math.floor(COLS / 2);
    return { northWallOpen: !window.__test.maze[0][exitC].walls[0] };
  });
  assert(r.northWallOpen, 'exit cell (row 0) has open north wall');
  await teardown();
}

// Suite 25: getCorridorView backWall is true when wall blocks
async function suite25() {
  console.log('\nSuite 25: getCorridorView reports backWall=true when forward is blocked');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    // Close all forward walls from player position
    const maze = window.__test.maze;
    const pr = window.__test.playerR, pc = window.__test.playerC;
    const dir = window.__test.playerDir;
    maze[pr][pc].walls[dir] = true; // seal forward wall
    const view = window.__test.getCorridorView();
    // Nearest section (index 2) should have backWall=true
    return { backWall: view[2].backWall };
  });
  assert(r.backWall === true, 'nearest section has backWall=true when forward is walled');
  await teardown();
}

// Suite 26: stepsTaken increments on forward movement
async function suite26() {
  console.log('\nSuite 26: stepsTaken increments on each forward step');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const maze = window.__test.maze;
    const pr = window.__test.playerR, pc = window.__test.playerC;
    const dir = window.__test.playerDir;
    // Ensure forward is open
    maze[pr][pc].walls[dir] = false;
    const nr = pr - 1;
    if (nr >= 0) maze[nr][pc].walls[2] = false;
    window.__test.lastStepTime = -9; // quiet step
    window.__test.tryMove('forward');
    return { steps: window.__test.stepsTaken };
  });
  assert(r.steps === 1, 'stepsTaken = 1 after one forward move');
  await teardown();
}

// === RUNNER ===
(async () => {
  const suites = [
    suite1,  suite2,  suite3,  suite4,  suite5,
    suite6,  suite7,  suite8,  suite9,  suite10,
    suite11, suite12, suite13, suite14, suite15,
    suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25,
    suite26,
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
