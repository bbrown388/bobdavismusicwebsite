// test-cattle-baron.js -- Playwright tests for Game 55: Cattle Baron
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'cattle-baron.html').replace(/\\/g, '/');
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

// ── Suite 1: DOM & canvas ─────────────────────────────────────────────────────
test('canvas element exists', async () => {
  const c = await page.$('canvas#c');
  assert.ok(c, 'canvas#c not found');
});

test('canvas is 360x640', async () => {
  const d = await page.evaluate(() => ({ w: document.getElementById('c').width, h: document.getElementById('c').height }));
  assert.strictEqual(d.w, 360); assert.strictEqual(d.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__baron.state);
  assert.strictEqual(s, 'title');
});

test('test API exposed', async () => {
  const ok = await page.evaluate(() => typeof window.__baron === 'object');
  assert.ok(ok);
});

test('feedback endpoint set in page', async () => {
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script:not([src])')).some(s => s.textContent.includes('script.google.com') || s.textContent.includes('formspree.io'))
  );
  assert.ok(found, 'FEEDBACK_ENDPOINT not found');
});

// ── Suite 2: Constants ────────────────────────────────────────────────────────
test('NUM_ROUNDS is 10', async () => {
  const n = await page.evaluate(() => window.__baron.NUM_ROUNDS);
  assert.strictEqual(n, 10);
});

test('START_GOLD is 1200', async () => {
  const g = await page.evaluate(() => window.__baron.START_GOLD);
  assert.strictEqual(g, 1200);
});

test('ACTIONS_PER_ROUND is 2', async () => {
  const a = await page.evaluate(() => window.__baron.ACTIONS_PER_ROUND);
  assert.strictEqual(a, 2);
});

test('GRAZE_INCOME has 4 entries starting at 0', async () => {
  const ok = await page.evaluate(() => {
    const gi = window.__baron.GRAZE_INCOME;
    return gi.length === 4 && gi[0] === 0 && gi[1] > 0 && gi[2] > gi[1] && gi[3] > gi[2];
  });
  assert.ok(ok, 'GRAZE_INCOME should be [0, ascending...]');
});

test('ROW_PRICES row 3 is 0 (home row free)', async () => {
  const p = await page.evaluate(() => window.__baron.ROW_PRICES[3]);
  assert.strictEqual(p, 0);
});

test('ROW_PRICES row 0 is most expensive', async () => {
  const ok = await page.evaluate(() => {
    const rp = window.__baron.ROW_PRICES;
    return rp[0] > rp[1] && rp[1] > rp[2] && rp[2] > rp[3];
  });
  assert.ok(ok, 'row prices should decrease from row 0 to row 3');
});

test('COLS=4 ROWS=4', async () => {
  const ok = await page.evaluate(() => window.__baron.COLS === 4 && window.__baron.ROWS === 4);
  assert.ok(ok);
});

test('THREAT_POOL has at least 6 entries', async () => {
  const n = await page.evaluate(() => window.__baron.THREAT_POOL.length);
  assert.ok(n >= 6);
});

// ── Suite 3: startGame ────────────────────────────────────────────────────────
test('startGame sets state to playing', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const s = await page.evaluate(() => window.__baron.state);
  assert.strictEqual(s, 'playing');
});

test('startGame sets gold to START_GOLD', async () => {
  await page.evaluate(() => { window.__baron.gold = 999; window.__baron.startGame(); });
  const g = await page.evaluate(() => window.__baron.gold);
  assert.strictEqual(g, 1200);
});

test('startGame sets round to 1', async () => {
  await page.evaluate(() => { window.__baron.round = 7; window.__baron.startGame(); });
  const r = await page.evaluate(() => window.__baron.round);
  assert.strictEqual(r, 1);
});

test('startGame sets actionsLeft to ACTIONS_PER_ROUND', async () => {
  await page.evaluate(() => { window.__baron.actionsLeft = 0; window.__baron.startGame(); });
  const a = await page.evaluate(() => window.__baron.actionsLeft);
  assert.strictEqual(a, 2);
});

test('startGame sets mode to null', async () => {
  await page.evaluate(() => { window.__baron.mode = 'graze'; window.__baron.startGame(); });
  const m = await page.evaluate(() => window.__baron.mode);
  assert.strictEqual(m, null);
});

test('startGame generates 2 threats', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const n = await page.evaluate(() => window.__baron.threats.length);
  assert.strictEqual(n, 2);
});

test('startGame creates 4x4 parcel grid', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() => {
    const p = window.__baron.parcels;
    return p.length === 4 && p.every(row => row.length === 4);
  });
  assert.ok(ok);
});

test('startGame: bottom row (row 3) is owned', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() => {
    const p = window.__baron.parcels;
    return p[3].every(cell => cell.owned === true);
  });
  assert.ok(ok, 'all row 3 parcels should be owned');
});

test('startGame: row 0 parcels are not owned', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() => window.__baron.parcels[0].every(cell => cell.owned === false));
  assert.ok(ok);
});

test('startGame clears roundLog', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.roundLog.push({ text: 'old', color: '#fff' });
    window.__baron.startGame();
  });
  const n = await page.evaluate(() => window.__baron.roundLog.length);
  assert.strictEqual(n, 0);
});

// ── Suite 4: makeParcels / isAdjacent ─────────────────────────────────────────
test('all parcels start with grazeTurns=0', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() =>
    window.__baron.parcels.every(row => row.every(p => p.grazeTurns === 0))
  );
  assert.ok(ok);
});

test('all parcels start not damaged', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() =>
    window.__baron.parcels.every(row => row.every(p => !p.damaged))
  );
  assert.ok(ok);
});

test('row 2 parcels have price 160', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() => window.__baron.parcels[2].every(p => p.price === 160));
  assert.ok(ok);
});

test('isAdjacent: row2,col0 is adjacent to owned row3', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() => window.__baron.isAdjacent(2, 0));
  assert.ok(ok, 'row2 should be adjacent to owned row3');
});

test('isAdjacent: row0,col0 is not adjacent to row3', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const ok = await page.evaluate(() => window.__baron.isAdjacent(0, 0));
  assert.strictEqual(ok, false);
});

test('isAdjacent: after buying row2, row1 becomes adjacent', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[2][0].owned = true;
  });
  const ok = await page.evaluate(() => window.__baron.isAdjacent(1, 0));
  assert.ok(ok);
});

// ── Suite 5: calcIncome ───────────────────────────────────────────────────────
test('calcIncome: all ungrazed = 0', async () => {
  await page.evaluate(() => window.__baron.startGame());
  const inc = await page.evaluate(() => window.__baron.calcIncome());
  assert.strictEqual(inc, 0);
});

test('calcIncome: one grazed parcel (grazeTurns=1) = 120', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 1;
  });
  const inc = await page.evaluate(() => window.__baron.calcIncome());
  assert.strictEqual(inc, 120);
});

test('calcIncome: grazeTurns=2 earns 200', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 2;
  });
  const inc = await page.evaluate(() => window.__baron.calcIncome());
  assert.strictEqual(inc, 200);
});

test('calcIncome: grazeTurns=3 earns 260', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 3;
  });
  const inc = await page.evaluate(() => window.__baron.calcIncome());
  assert.strictEqual(inc, 260);
});

test('calcIncome: damaged parcel earns 0', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 2;
    window.__baron.parcels[3][0].damaged = true;
  });
  const inc = await page.evaluate(() => window.__baron.calcIncome());
  assert.strictEqual(inc, 0);
});

test('calcIncome: two grazed parcels sum correctly', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 1;
    window.__baron.parcels[3][1].grazeTurns = 2;
  });
  const inc = await page.evaluate(() => window.__baron.calcIncome());
  assert.strictEqual(inc, 320);
});

// ── Suite 6: applyAction - buy ────────────────────────────────────────────────
test('buy valid adjacent parcel deducts price', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'buy';
  });
  const g0 = await page.evaluate(() => window.__baron.gold);
  await page.evaluate(() => window.__baron.applyAction(2, 0));
  const g1 = await page.evaluate(() => window.__baron.gold);
  assert.strictEqual(g1, g0 - 160);
});

test('buy marks parcel as owned', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'buy';
    window.__baron.applyAction(2, 0);
  });
  const owned = await page.evaluate(() => window.__baron.parcels[2][0].owned);
  assert.ok(owned);
});

test('buy decrements actionsLeft', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'buy';
    window.__baron.applyAction(2, 0);
  });
  const a = await page.evaluate(() => window.__baron.actionsLeft);
  assert.strictEqual(a, 1);
});

test('buy non-adjacent parcel returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'buy';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(0, 0));
  assert.strictEqual(ok, false);
});

test('buy when gold insufficient returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.gold = 50;
    window.__baron.mode = 'buy';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(2, 0));
  assert.strictEqual(ok, false);
});

test('buy already-owned parcel returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'buy';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(3, 0));
  assert.strictEqual(ok, false);
});

// ── Suite 7: applyAction - graze ──────────────────────────────────────────────
test('graze owned parcel increments grazeTurns', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'graze';
    window.__baron.applyAction(3, 0);
  });
  const gt = await page.evaluate(() => window.__baron.parcels[3][0].grazeTurns);
  assert.strictEqual(gt, 1);
});

test('graze decrements actionsLeft', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'graze';
    window.__baron.applyAction(3, 0);
  });
  const a = await page.evaluate(() => window.__baron.actionsLeft);
  assert.strictEqual(a, 1);
});

test('graze unowned parcel returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'graze';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(0, 0));
  assert.strictEqual(ok, false);
});

test('graze damaged parcel returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].damaged = true;
    window.__baron.mode = 'graze';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(3, 0));
  assert.strictEqual(ok, false);
});

test('graze max (grazeTurns=3) returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 3;
    window.__baron.mode = 'graze';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(3, 0));
  assert.strictEqual(ok, false);
});

test('graze with 0 actionsLeft returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.actionsLeft = 0;
    window.__baron.mode = 'graze';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(3, 0));
  assert.strictEqual(ok, false);
});

// ── Suite 8: applyAction - defend / repair ────────────────────────────────────
test('defend marks parcel as defended', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'defend';
    window.__baron.applyAction(3, 0);
  });
  const def = await page.evaluate(() => window.__baron.parcels[3][0].defended);
  assert.ok(def);
});

test('defend deducts DEFEND_COST from gold', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'defend';
  });
  const g0 = await page.evaluate(() => window.__baron.gold);
  await page.evaluate(() => window.__baron.applyAction(3, 0));
  const g1 = await page.evaluate(() => window.__baron.gold);
  assert.strictEqual(g1, g0 - 80);
});

test('defend already-defended parcel returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].defended = true;
    window.__baron.mode = 'defend';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(3, 0));
  assert.strictEqual(ok, false);
});

test('repair damaged parcel restores it', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].damaged = true;
    window.__baron.mode = 'repair';
    window.__baron.applyAction(3, 0);
  });
  const d = await page.evaluate(() => window.__baron.parcels[3][0].damaged);
  assert.strictEqual(d, false);
});

test('repair deducts REPAIR_COST', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].damaged = true;
    window.__baron.mode = 'repair';
  });
  const g0 = await page.evaluate(() => window.__baron.gold);
  await page.evaluate(() => window.__baron.applyAction(3, 0));
  const g1 = await page.evaluate(() => window.__baron.gold);
  assert.strictEqual(g1, g0 - 120);
});

test('repair undamaged parcel returns false', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'repair';
  });
  const ok = await page.evaluate(() => window.__baron.applyAction(3, 0));
  assert.strictEqual(ok, false);
});

// ── Suite 9: endTurn / income ─────────────────────────────────────────────────
test('endTurn increments round', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.round = 3;
    window.__baron.threats = [
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'),
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful')
    ];
    window.__baron.endTurn();
  });
  const r = await page.evaluate(() => window.__baron.round);
  assert.strictEqual(r, 4);
});

test('endTurn resets actionsLeft', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.actionsLeft = 1;
    window.__baron.threats = [
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'),
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful')
    ];
    window.__baron.endTurn();
  });
  const a = await page.evaluate(() => window.__baron.actionsLeft);
  assert.strictEqual(a, 2);
});

test('endTurn collects income from grazed parcels', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 1;
    window.__baron.gold = 1000;
    window.__baron.threats = [
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'),
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful')
    ];
    window.__baron.endTurn();
  });
  const g = await page.evaluate(() => window.__baron.gold);
  assert.strictEqual(g, 1120);
});

test('endTurn clears defenses', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].defended = true;
    window.__baron.threats = [
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'),
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful')
    ];
    window.__baron.endTurn();
  });
  const d = await page.evaluate(() => window.__baron.parcels[3][0].defended);
  assert.strictEqual(d, false);
});

test('endTurn resets mode to null', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.mode = 'graze';
    window.__baron.threats = [
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'),
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful')
    ];
    window.__baron.endTurn();
  });
  const m = await page.evaluate(() => window.__baron.mode);
  assert.strictEqual(m, null);
});

test('endTurn after round 10 calls finishGame -> win state', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.round = 10;
    window.__baron.threats = [
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'),
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful')
    ];
    window.__baron.endTurn();
  });
  const s = await page.evaluate(() => window.__baron.state);
  assert.strictEqual(s, 'win');
});

test('endTurn adds income entry to roundLog', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 1;
    window.__baron.threats = [
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'),
      window.__baron.THREAT_POOL.find(t => t.id === 'peaceful')
    ];
    window.__baron.endTurn();
  });
  const ok = await page.evaluate(() => window.__baron.roundLog.some(e => e.text.includes('Income')));
  assert.ok(ok);
});

// ── Suite 10: resolveThreat ───────────────────────────────────────────────────
test('drought_mild damages undefended overgrazed parcel (seeded)', async () => {
  const damaged = await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 2;
    // Run many times to ensure it damages at least once (50% chance)
    let count = 0;
    for (let i = 0; i < 30; i++) {
      window.__baron.startGame();
      window.__baron.parcels[3][0].grazeTurns = 2;
      window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'drought_mild'));
      if (window.__baron.parcels[3][0].damaged) count++;
    }
    return count > 0;
  });
  assert.ok(damaged, 'drought_mild should damage overgrazed parcel at some point');
});

test('drought_mild does not damage defended parcel', async () => {
  const ok = await page.evaluate(() => {
    let neverDamaged = true;
    for (let i = 0; i < 20; i++) {
      window.__baron.startGame();
      window.__baron.parcels[3][0].grazeTurns = 3;
      window.__baron.parcels[3][0].defended = true;
      window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'drought_mild'));
      if (window.__baron.parcels[3][0].damaged) { neverDamaged = false; break; }
    }
    return neverDamaged;
  });
  assert.ok(ok, 'defended parcel should never be damaged by drought_mild');
});

test('rustlers reduces grazeTurns on hit parcel', async () => {
  const changed = await page.evaluate(() => {
    let hit = false;
    for (let i = 0; i < 10; i++) {
      window.__baron.startGame();
      window.__baron.parcels[3][0].grazeTurns = 2;
      const before = window.__baron.parcels[3][0].grazeTurns;
      window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'rustlers'));
      if (window.__baron.parcels[3][0].grazeTurns < before) { hit = true; break; }
    }
    return hit;
  });
  assert.ok(changed, 'rustlers should reduce grazeTurns');
});

test('rustlers deducts gold', async () => {
  const deducted = await page.evaluate(() => {
    let hit = false;
    for (let i = 0; i < 10; i++) {
      window.__baron.startGame();
      window.__baron.parcels[3][0].grazeTurns = 1;
      const before = window.__baron.gold;
      window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'rustlers'));
      if (window.__baron.gold < before) { hit = true; break; }
    }
    return hit;
  });
  assert.ok(deducted, 'rustlers should deduct gold when a target exists');
});

test('rustlers does not hit defended parcel', async () => {
  const ok = await page.evaluate(() => {
    let neverHit = true;
    for (let i = 0; i < 15; i++) {
      window.__baron.startGame();
      window.__baron.parcels[3][0].grazeTurns = 2;
      window.__baron.parcels[3][0].defended = true;
      const before = window.__baron.parcels[3][0].grazeTurns;
      window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'rustlers'));
      if (window.__baron.parcels[3][0].grazeTurns < before) { neverHit = false; break; }
    }
    return neverHit;
  });
  assert.ok(ok, 'defended parcel should not be hit by rustlers');
});

test('wildfire threat damages parcels in one column', async () => {
  const damaged = await page.evaluate(() => {
    let hit = false;
    for (let i = 0; i < 20; i++) {
      window.__baron.startGame();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        window.__baron.parcels[r][c].owned = true;
        window.__baron.parcels[r][c].grazeTurns = 1;
      }
      window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'wildfire'));
      const anyDamaged = window.__baron.parcels.some(row => row.some(p => p.damaged));
      if (anyDamaged) { hit = true; break; }
    }
    return hit;
  });
  assert.ok(damaged, 'wildfire should damage at least one parcel');
});

test('peaceful threat adds log entry', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.roundLog = [];
    window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'peaceful'));
  });
  const n = await page.evaluate(() => window.__baron.roundLog.length);
  assert.ok(n >= 1);
});

test('good_grazing adds gold bonus for grazed parcels', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.parcels[3][0].grazeTurns = 1;
    window.__baron.parcels[3][1].grazeTurns = 1;
  });
  const g0 = await page.evaluate(() => window.__baron.gold);
  await page.evaluate(() => {
    window.__baron.resolveThreat(window.__baron.THREAT_POOL.find(t => t.id === 'good_grazing'));
  });
  const g1 = await page.evaluate(() => window.__baron.gold);
  assert.ok(g1 > g0, 'good_grazing should increase gold');
});

// ── Suite 11: drawThreats ─────────────────────────────────────────────────────
test('drawThreats produces 2 threats', async () => {
  await page.evaluate(() => { window.__baron.startGame(); window.__baron.drawThreats(); });
  const n = await page.evaluate(() => window.__baron.threats.length);
  assert.strictEqual(n, 2);
});

test('drawThreats on round 10 gives good_grazing and peaceful', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.round = 10;
    window.__baron.drawThreats();
  });
  const ids = await page.evaluate(() => window.__baron.threats.map(t => t.id));
  assert.ok(ids.includes('good_grazing'), 'round 10 should have good_grazing');
  assert.ok(ids.includes('peaceful'), 'round 10 should have peaceful');
});

test('each threat has id, label, color', async () => {
  await page.evaluate(() => { window.__baron.startGame(); window.__baron.drawThreats(); });
  const ok = await page.evaluate(() =>
    window.__baron.threats.every(t => t.id && t.label && t.color)
  );
  assert.ok(ok);
});

// ── Suite 12: finishGame ──────────────────────────────────────────────────────
test('finishGame sets state to win', async () => {
  await page.evaluate(() => { window.__baron.startGame(); window.__baron.finishGame(); });
  const s = await page.evaluate(() => window.__baron.state);
  assert.strictEqual(s, 'win');
});

test('finishGame calculates score from gold + territory', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.gold = 2000;
    // 4 owned parcels at start (row 3), 0 grazed
    window.__baron.finishGame();
  });
  const score = await page.evaluate(() => window.__baron.score);
  // score = 2000 + 4*50 + 0*100 = 2200
  assert.strictEqual(score, 2200);
});

test('finishGame: active grazed parcels add 100 each to score', async () => {
  await page.evaluate(() => {
    window.__baron.startGame();
    window.__baron.gold = 1000;
    window.__baron.parcels[3][0].grazeTurns = 1;
    window.__baron.finishGame();
  });
  const score = await page.evaluate(() => window.__baron.score);
  // 1000 + 4*50 + 1*100 = 1300
  assert.strictEqual(score, 1300);
});

test('finishGame saves best score when higher', async () => {
  await page.evaluate(() => {
    localStorage.setItem('cattle_baron_best', '0');
    window.__baron.startGame();
    window.__baron.gold = 5000;
    window.__baron.finishGame();
  });
  const stored = await page.evaluate(() => parseInt(localStorage.getItem('cattle_baron_best') || '0'));
  assert.ok(stored >= 5000 + 4*50, 'best score should be saved');
});

// ── Suite 13: console error sweep ─────────────────────────────────────────────
test('no console errors on load', async () => {
  const errs = consoleErrors.filter(e => !e.includes('AudioContext'));
  assert.strictEqual(errs.length, 0, 'load errors: ' + errs.join(', '));
});

test('no errors during full game cycle simulation', async () => {
  const gameErrors = [];
  page.on('console', m => { if (m.type() === 'error') gameErrors.push(m.text()); });
  await page.evaluate(() => {
    window.__baron.startGame();
    const peaceful = window.__baron.THREAT_POOL.find(t => t.id === 'peaceful');
    // Simulate 10 rounds peacefully
    for (let i = 0; i < 10; i++) {
      window.__baron.threats = [peaceful, peaceful];
      window.__baron.parcels[3][0].grazeTurns = 1;
      window.__baron.endTurn();
    }
  });
  const filtered = gameErrors.filter(e => !e.includes('AudioContext'));
  assert.strictEqual(filtered.length, 0, 'game cycle errors: ' + filtered.join(', '));
});

test('no errors when all threat types resolve', async () => {
  const threatErrors = [];
  page.on('console', m => { if (m.type() === 'error') threatErrors.push(m.text()); });
  await page.evaluate(() => {
    window.__baron.startGame();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      window.__baron.parcels[r][c].owned = true;
      window.__baron.parcels[r][c].grazeTurns = 2;
    }
    for (const threat of window.__baron.THREAT_POOL) {
      window.__baron.resolveThreat(threat);
      // Reset state for next threat
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        window.__baron.parcels[r][c].damaged = false;
        window.__baron.parcels[r][c].grazeTurns = 2;
      }
    }
  });
  const filtered = threatErrors.filter(e => !e.includes('AudioContext'));
  assert.strictEqual(filtered.length, 0, 'threat errors: ' + filtered.join(', '));
});

// ── Runner ────────────────────────────────────────────────────────────────────
(async () => {
  await setup();
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log('  PASS  ' + t.name);
      passed++;
    } catch(e) {
      console.error('  FAIL  ' + t.name);
      console.error('        ' + e.message);
      failed++;
    }
  }
  await teardown();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
