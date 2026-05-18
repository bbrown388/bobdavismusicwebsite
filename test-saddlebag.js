// test-saddlebag.js -- Playwright tests for Game 58: Saddlebag
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'saddlebag.html').replace(/\\/g, '/');
let browser, page;
const consoleErrors = [];

async function setup() {
  browser = await chromium.launch();
  page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}

async function teardown() { await browser.close(); }

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Suite 1: DOM & Canvas ─────────────────────────────────────────────────────
test('canvas element exists', async () => {
  const c = await page.$('canvas#c');
  assert.ok(c, 'canvas#c not found');
});

test('canvas is 360x640', async () => {
  const d = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert.strictEqual(d.w, 360);
  assert.strictEqual(d.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'title');
});

test('test API exposed', async () => {
  const ok = await page.evaluate(() => typeof window.__run === 'object');
  assert.ok(ok);
});

test('feedback endpoint set in page', async () => {
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script:not([src])')).some(s =>
      s.textContent.includes('script.google.com') || s.textContent.includes('formspree.io')
    )
  );
  assert.ok(found, 'FEEDBACK_ENDPOINT not found');
});

test('Google Analytics tag present', async () => {
  const found = await page.evaluate(() =>
    !!document.querySelector('script[src*="googletagmanager"]')
  );
  assert.ok(found, 'GA tag missing');
});

// ── Suite 2: Constants ────────────────────────────────────────────────────────
test('ROUND_CONFIG has 5 entries', async () => {
  const n = await page.evaluate(() => window.__run.ROUND_CONFIG.length);
  assert.strictEqual(n, 5);
});

test('COLS is 6', async () => {
  const n = await page.evaluate(() => window.__run.COLS);
  assert.strictEqual(n, 6);
});

test('ROWS is 8', async () => {
  const n = await page.evaluate(() => window.__run.ROWS);
  assert.strictEqual(n, 8);
});

test('CS (cell size) is positive', async () => {
  const cs = await page.evaluate(() => window.__run.CS);
  assert.ok(cs > 0, 'CS must be positive');
});

test('ITEM_DEFS has all expected shapes', async () => {
  const keys = await page.evaluate(() => Object.keys(window.__run.ITEM_DEFS));
  ['I3','L3','S3','J3','I4','L4','J4','T4','S4','Z4','O4'].forEach(k =>
    assert.ok(keys.includes(k), `Missing shape: ${k}`)
  );
});

test('ITEM_COLORS has at least 7 entries', async () => {
  const n = await page.evaluate(() => window.__run.ITEM_COLORS.length);
  assert.ok(n >= 7, 'Need at least 7 colors for max 7 items');
});

test('each ROUND_CONFIG entry has timer and defs', async () => {
  const cfg = await page.evaluate(() => window.__run.ROUND_CONFIG);
  cfg.forEach((r, i) => {
    assert.ok(r.timer > 0, `Round ${i} timer must be positive`);
    assert.ok(Array.isArray(r.defs) && r.defs.length > 0, `Round ${i} defs must be non-empty`);
  });
});

test('round 5 is hardest (most defs, shortest timer)', async () => {
  const cfg = await page.evaluate(() => window.__run.ROUND_CONFIG);
  const r1 = cfg[0], r5 = cfg[4];
  assert.ok(r5.defs.length > r1.defs.length, 'Round 5 should have more items than round 1');
  assert.ok(r5.timer < r1.timer, 'Round 5 should have less time than round 1');
});

// ── Suite 3: Shape rotation ───────────────────────────────────────────────────
test('rotateCW I4 horizontal → vertical', async () => {
  const result = await page.evaluate(() => {
    const cells = [[0,0],[0,1],[0,2],[0,3]];
    const rot = window.__run.rotateCW(cells);
    return rot;
  });
  // I4 vertical: [[0,0],[1,0],[2,0],[3,0]]
  const sorted = result.slice().sort((a,b) => a[0]-b[0]||a[1]-b[1]);
  assert.deepStrictEqual(sorted, [[0,0],[1,0],[2,0],[3,0]]);
});

test('rotateCW I3 horizontal → vertical', async () => {
  const result = await page.evaluate(() => {
    const cells = [[0,0],[0,1],[0,2]];
    return window.__run.rotateCW(cells);
  });
  const sorted = result.slice().sort((a,b) => a[0]-b[0]||a[1]-b[1]);
  assert.deepStrictEqual(sorted, [[0,0],[1,0],[2,0]]);
});

test('rotateCW O4 (2x2 square) is same after rotation', async () => {
  const result = await page.evaluate(() => {
    const cells = [[0,0],[0,1],[1,0],[1,1]];
    return window.__run.rotateCW(cells);
  });
  const sorted = result.slice().sort((a,b) => a[0]-b[0]||a[1]-b[1]);
  assert.deepStrictEqual(sorted, [[0,0],[0,1],[1,0],[1,1]]);
});

test('rotateCW 4 times returns to original shape', async () => {
  const result = await page.evaluate(() => {
    let cells = [[0,0],[0,1],[0,2],[1,1]]; // T4
    for (let i = 0; i < 4; i++) cells = window.__run.rotateCW(cells);
    return cells.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  });
  const orig = [[0,0],[0,1],[0,2],[1,1]];
  assert.deepStrictEqual(result, orig);
});

test('cellBounds returns correct maxR and maxC', async () => {
  const result = await page.evaluate(() => {
    const cells = [[0,0],[0,1],[0,2],[0,3]]; // I4
    return window.__run.cellBounds(cells);
  });
  assert.strictEqual(result.maxR, 0);
  assert.strictEqual(result.maxC, 3);
});

// ── Suite 4: Placement logic ──────────────────────────────────────────────────
test('canPlace returns true for empty grid', async () => {
  const ok = await page.evaluate(() => {
    window.__run.startRound(0);
    return window.__run.canPlace([[0,0],[0,1]], 0, 0);
  });
  assert.ok(ok, 'Should be able to place on empty grid');
});

test('canPlace returns false when out of bounds right', async () => {
  const ok = await page.evaluate(() => {
    window.__run.startRound(0);
    // I4 at col=4: extends to col 7, but COLS=6
    return window.__run.canPlace([[0,0],[0,1],[0,2],[0,3]], 0, 3);
  });
  assert.strictEqual(ok, false, 'I4 at col=3 should overflow');
});

test('canPlace returns false when out of bounds bottom', async () => {
  const ok = await page.evaluate(() => {
    window.__run.startRound(0);
    // Vertical I4 at row=6: extends to row 9, ROWS=8
    const cells = window.__run.rotateCW([[0,0],[0,1],[0,2],[0,3]]);
    return window.__run.canPlace(cells, 5, 0);
  });
  assert.strictEqual(ok, false, 'Vertical I4 at row 5 should overflow');
});

test('canPlace returns false on occupied cell', async () => {
  const ok = await page.evaluate(() => {
    window.__run.startRound(0);
    window.__run.doPlace(0, 0, 0); // place item 0 at (0,0)
    return window.__run.canPlace([[0,0],[0,1]], 0, 0);
  });
  assert.strictEqual(ok, false, 'Cannot place on occupied cell');
});

test('doPlace fills grid cells', async () => {
  const result = await page.evaluate(() => {
    window.__run.startRound(0);
    window.__run.doPlace(0, 0, 0); // place item 0 (I3=[0,0],[0,1],[0,2]) at (0,0)
    const item = window.__run.items[0];
    const cells = item.cells;
    return cells.every(([dr, dc]) => window.__run.grid[0+dr][0+dc] === 0);
  });
  assert.ok(result, 'doPlace should fill all item cells');
});

test('doPlace sets item.placed = true', async () => {
  const placed = await page.evaluate(() => {
    window.__run.startRound(0);
    window.__run.doPlace(0, 0, 0);
    return window.__run.items[0].placed;
  });
  assert.ok(placed);
});

test('doPlace sets anchorRow and anchorCol', async () => {
  const result = await page.evaluate(() => {
    window.__run.startRound(0);
    window.__run.doPlace(0, 2, 3);
    const it = window.__run.items[0];
    return { r: it.anchorRow, c: it.anchorCol };
  });
  assert.strictEqual(result.r, 2);
  assert.strictEqual(result.c, 3);
});

test('doUnplace clears grid cells', async () => {
  const result = await page.evaluate(() => {
    window.__run.startRound(0);
    window.__run.doPlace(0, 0, 0);
    window.__run.doUnplace(0);
    return window.__run.grid.every(row => row.every(c => c === null));
  });
  assert.ok(result, 'Grid should be empty after unplace');
});

test('doUnplace sets item.placed = false', async () => {
  const placed = await page.evaluate(() => {
    window.__run.startRound(0);
    window.__run.doPlace(0, 0, 0);
    window.__run.doUnplace(0);
    return window.__run.items[0].placed;
  });
  assert.strictEqual(placed, false);
});

test('getAnchor clamps anchor to keep piece in bounds', async () => {
  const result = await page.evaluate(() => {
    const cells = [[0,0],[0,1],[0,2],[0,3]]; // I4, maxC=3
    // tap at col=5, COLS=6 → clamped to 6-1-3=2
    return window.__run.getAnchor(cells, 0, 5);
  });
  assert.strictEqual(result[1], 2, 'Anchor col should be clamped to 2');
});

test('canPlace at clamped anchor is valid', async () => {
  const ok = await page.evaluate(() => {
    window.__run.startRound(0);
    const cells = [[0,0],[0,1],[0,2],[0,3]];
    const [r0, c0] = window.__run.getAnchor(cells, 0, 5);
    return window.__run.canPlace(cells, r0, c0);
  });
  assert.ok(ok, 'Clamped placement should be valid');
});

// ── Suite 5: Game state machine ───────────────────────────────────────────────
test('startGame sets state to playing', async () => {
  const s = await page.evaluate(() => {
    window.__run.startGame();
    return window.__run.state;
  });
  assert.strictEqual(s, 'playing');
});

test('startGame resets totalScore to 0', async () => {
  const s = await page.evaluate(() => {
    window.__run.totalScore = 999;
    window.__run.startGame();
    return window.__run.totalScore;
  });
  assert.strictEqual(s, 0);
});

test('startRound initializes grid to all null', async () => {
  const ok = await page.evaluate(() => {
    window.__run.startRound(0);
    return window.__run.grid.every(row => row.every(c => c === null));
  });
  assert.ok(ok, 'Grid should start empty');
});

test('startRound creates correct number of items', async () => {
  const counts = await page.evaluate(() => {
    return window.__run.ROUND_CONFIG.map((cfg, i) => {
      window.__run.startRound(i);
      return window.__run.items.length;
    });
  });
  const expected = await page.evaluate(() => window.__run.ROUND_CONFIG.map(c => c.defs.length));
  assert.deepStrictEqual(counts, expected);
});

test('startRound sets timer from config', async () => {
  const timer = await page.evaluate(() => {
    window.__run.startRound(1);
    return window.__run.timer;
  });
  const expected = await page.evaluate(() => window.__run.ROUND_CONFIG[1].timer);
  assert.strictEqual(timer, expected);
});

test('startRound sets selectedItem to 0', async () => {
  const sel = await page.evaluate(() => {
    window.__run.startRound(0);
    return window.__run.selectedItem;
  });
  assert.strictEqual(sel, 0);
});

test('items have correct name, value, color, placed=false', async () => {
  const ok = await page.evaluate(() => {
    window.__run.startRound(0);
    return window.__run.items.every(it =>
      typeof it.name === 'string' && it.name.length > 0 &&
      typeof it.value === 'number' && it.value > 0 &&
      typeof it.color === 'string' && it.color.startsWith('#') &&
      it.placed === false
    );
  });
  assert.ok(ok, 'All items should have name, value, color, placed=false');
});

// ── Suite 6: endRound and scoring ─────────────────────────────────────────────
test('endRound transitions state to roundEnd', async () => {
  const s = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.endRound();
    return window.__run.state;
  });
  assert.strictEqual(s, 'roundEnd');
});

test('endRound adds correct value for placed items', async () => {
  const result = await page.evaluate(() => {
    window.__run.startGame();
    // Place first two items
    window.__run.doPlace(0, 0, 0);
    window.__run.doPlace(1, 1, 0);
    const val0 = window.__run.items[0].value;
    const val1 = window.__run.items[1].value;
    window.__run.timer = 0; // no time bonus
    window.__run.endRound();
    return { roundScore: window.__run.roundScore, val0, val1 };
  });
  assert.ok(result.roundScore >= result.val0 + result.val1,
    'roundScore should include placed item values');
});

test('endRound gives +300 pack bonus when all items placed', async () => {
  const roundScore = await page.evaluate(() => {
    window.__run.startGame();
    // Place all items in round 0 (4 small items)
    const items = window.__run.items;
    let row = 0;
    items.forEach((it, idx) => {
      window.__run.doPlace(idx, row, 0);
      row += window.__run.cellBounds(it.cells).maxR + 1;
    });
    window.__run.timer = 0;
    window.__run.endRound();
    return window.__run.roundScore;
  });
  assert.ok(roundScore >= 300, 'Pack bonus should add 300 when all items placed');
});

test('endRound time bonus = floor(timer) * 5', async () => {
  const result = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.timer = 10;
    window.__run.endRound();
    return window.__run.roundScore;
  });
  assert.ok(result >= 50, 'Time bonus at 10s should be +50 minimum');
});

test('nextRound advances round counter', async () => {
  const r = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.endRound();
    window.__run.nextRound();
    return window.__run.round;
  });
  assert.strictEqual(r, 1);
});

test('after 5 rounds state becomes gameover', async () => {
  const s = await page.evaluate(() => {
    window.__run.startGame();
    for (let i = 0; i < 5; i++) {
      window.__run.endRound();
      window.__run.nextRound();
    }
    return window.__run.state;
  });
  assert.strictEqual(s, 'gameover');
});

test('totalScore accumulates across rounds', async () => {
  const score = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.timer = 5;
    window.__run.endRound();
    const r1 = window.__run.roundScore;
    window.__run.nextRound();
    window.__run.timer = 5;
    window.__run.endRound();
    return window.__run.totalScore;
  });
  assert.ok(score > 0, 'Total score should accumulate across rounds');
});

// ── Suite 7: Timer mechanics ──────────────────────────────────────────────────
test('update reduces timer', async () => {
  const timer = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.timer = 30;
    window.__run.update(1.0);
    return window.__run.timer;
  });
  assert.ok(timer < 30, 'Timer should decrease after update');
  assert.ok(timer >= 29, 'Timer should decrease by roughly dt');
});

test('timer reaching 0 triggers endRound', async () => {
  const s = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.timer = 0.01;
    window.__run.update(0.05);
    return window.__run.state;
  });
  assert.strictEqual(s, 'roundEnd');
});

test('placing all items triggers endRound', async () => {
  const s = await page.evaluate(() => {
    window.__run.startGame();
    // Place all items
    let row = 0;
    window.__run.items.forEach((it, idx) => {
      window.__run.doPlace(idx, row, 0);
      row += window.__run.cellBounds(it.cells).maxR + 1;
    });
    window.__run.update(0.01); // one tick to detect completion
    return window.__run.state;
  });
  assert.strictEqual(s, 'roundEnd');
});

// ── Suite 8: Input handling ───────────────────────────────────────────────────
test('tap on title starts game', async () => {
  const s = await page.evaluate(() => {
    window.__run.state = 'title';
    window.__run.handleTap(180, 320);
    return window.__run.state;
  });
  assert.strictEqual(s, 'playing');
});

test('tap on grid places selected item', async () => {
  const result = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.selectedItem = 0;
    // Tap at grid cell (0,0) → GX=158, GY=92, CS=32 → px=158+16=174, py=92+16=108
    window.__run.handleTap(158 + 16, 92 + 16);
    return window.__run.items[0].placed;
  });
  assert.ok(result, 'Item should be placed after tap on grid');
});

test('tap on occupied cell unplaces item', async () => {
  const placed = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.doPlace(0, 0, 0);
    // Tap on cell (0,0)
    window.__run.handleTap(158 + 16, 92 + 16);
    return window.__run.items[0].placed;
  });
  assert.strictEqual(placed, false, 'Tap on occupied cell should unplace item');
});

test('tap on tray selects item', async () => {
  const sel = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.selectedItem = null;
    const cardH = window.__run.getCardH();
    // Tap on item 1 in tray
    window.__run.handleTap(TX + 50, 90 + cardH * 1 + cardH / 2);
    return window.__run.selectedItem;
  });
  // TX is 4
  assert.strictEqual(sel, 1, 'Tapping item 1 in tray should select it');
});

test('tap on already-selected tray item rotates it', async () => {
  const result = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.selectedItem = 0;
    const before = JSON.parse(JSON.stringify(window.__run.items[0].cells));
    // Item 0 in round 0 is I3=[0,0],[0,1],[0,2] -- rotation changes it
    const cardH = window.__run.getCardH();
    window.__run.handleTap(4 + 50, 90 + cardH * 0 + cardH / 2);
    const after = window.__run.items[0].cells;
    // I3 rotated should be vertical
    const sameAsBefore = JSON.stringify(before) === JSON.stringify(after);
    return !sameAsBefore;
  });
  assert.ok(result, 'Tapping selected item again should rotate it');
});

test('rotate button rotates selected item', async () => {
  const changed = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.selectedItem = 0;
    const before = JSON.stringify(window.__run.items[0].cells);
    // Rotate button: x=4, y=566, w=148, h=36
    window.__run.handleTap(4 + 74, 566 + 18);
    return JSON.stringify(window.__run.items[0].cells) !== before;
  });
  assert.ok(changed, 'Rotate button should change item cells');
});

test('after placing item, selectedItem advances to next unplaced', async () => {
  const sel = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.selectedItem = 0;
    // Place item 0 at (0,0)
    window.__run.handleTap(158 + 16, 92 + 16);
    return window.__run.selectedItem;
  });
  // Should auto-advance to 1 (or higher unplaced)
  assert.ok(sel !== 0, 'selectedItem should advance after placing');
});

test('placing item at invalid position shows NO FIT popup', async () => {
  const popupsLen = await page.evaluate(() => {
    window.__run.startGame();
    window.__run.selectedItem = 0;
    // Force an invalid placement: fill (0,0) and (0,1) with item 1
    window.__run.doPlace(1, 0, 0);
    // Now try to place I3 at (0,0) -- won't fit since cells are occupied
    const before = window.__run.popups.length;
    window.__run.handleTap(158 + 16, 92 + 16);
    return window.__run.popups.length;
  });
  assert.ok(popupsLen > 0, 'Should show popup on invalid placement attempt');
});

// ── Suite 9: getGridCell / getTrayIdx ─────────────────────────────────────────
test('getGridCell returns correct row and col', async () => {
  const result = await page.evaluate(() => {
    // GX=158, GY=92, CS=32
    // Cell (2,3): px=158+3*32+16=262, py=92+2*32+16=172
    return window.__run.getGridCell(262, 172);
  });
  assert.strictEqual(result.row, 2);
  assert.strictEqual(result.col, 3);
});

test('getGridCell returns null outside grid', async () => {
  const result = await page.evaluate(() => window.__run.getGridCell(10, 300));
  assert.strictEqual(result, null);
});

test('getTrayIdx returns correct index', async () => {
  const idx = await page.evaluate(() => {
    window.__run.startGame();
    const cardH = window.__run.getCardH();
    return window.__run.getTrayIdx(4 + 50, 90 + cardH * 2 + cardH / 2);
  });
  assert.strictEqual(idx, 2);
});

test('getTrayIdx returns null outside tray x range', async () => {
  const idx = await page.evaluate(() => {
    window.__run.startGame();
    return window.__run.getTrayIdx(200, 150);
  });
  assert.strictEqual(idx, null);
});

// ── Suite 10: Console errors ──────────────────────────────────────────────────
test('no console errors during normal play', async () => {
  await page.evaluate(async () => {
    window.__run.startGame();
    for (let i = 0; i < 5; i++) {
      // Run 50 update ticks
      for (let j = 0; j < 50; j++) window.__run.update(0.1);
    }
    window.__run.startGame();
    window.__run.doPlace(0, 0, 0);
    window.__run.doPlace(1, 2, 0);
    window.__run.endRound();
  });
  await page.waitForTimeout(200);
  const errs = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('AudioContext')
  );
  assert.strictEqual(errs.length, 0, 'Console errors: ' + errs.join('; '));
});

// ── Runner ────────────────────────────────────────────────────────────────────
async function run() {
  await setup();
  let passed = 0, failed = 0;
  const failures = [];
  for (const t of tests) {
    try {
      await t.fn();
      console.log('  PASS', t.name);
      passed++;
    } catch(e) {
      console.error('  FAIL', t.name, '--', e.message);
      failures.push({ name: t.name, err: e.message });
      failed++;
    }
  }
  await teardown();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failures.length) {
    failures.forEach(f => console.error('  FAILED:', f.name, '--', f.err));
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
