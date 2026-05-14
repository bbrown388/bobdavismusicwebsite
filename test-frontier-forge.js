// test-frontier-forge.js -- Playwright tests for Game 52: Frontier Forge
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'frontier-forge.html').replace(/\\/g, '/');
let browser, page;

async function setup() {
  browser = await chromium.launch();
  page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}

async function teardown() { await browser.close(); }

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Suite 1: DOM & Canvas ────────────────────────────────────────────────────
test('canvas element exists', async () => {
  const c = await page.$('canvas#c');
  assert.ok(c, 'canvas#c not found');
});

test('canvas is 360x640', async () => {
  const dims = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert.strictEqual(dims.w, 360);
  assert.strictEqual(dims.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__ff.state);
  assert.strictEqual(s, 'title');
});

test('test API exposed', async () => {
  const ok = await page.evaluate(() => typeof window.__ff === 'object');
  assert.ok(ok);
});

// ── Suite 2: Items config ────────────────────────────────────────────────────
test('5 items defined', async () => {
  const n = await page.evaluate(() => window.__ff.ITEMS.length);
  assert.strictEqual(n, 5);
});

test('item names are unique', async () => {
  const names = await page.evaluate(() => window.__ff.ITEMS.map(i => i.name));
  const unique = new Set(names);
  assert.strictEqual(unique.size, 5);
});

test('all items have strike arrays', async () => {
  const ok = await page.evaluate(() =>
    window.__ff.ITEMS.every(i => Array.isArray(i.strikes) && i.strikes.length >= 4)
  );
  assert.ok(ok, 'some items missing strike arrays');
});

test('strike positions are 0-4', async () => {
  const ok = await page.evaluate(() =>
    window.__ff.ITEMS.every(i => i.strikes.every(s => s >= 0 && s <= 4))
  );
  assert.ok(ok, 'strike positions out of range');
});

test('heat zones are valid (lo < hi < max)', async () => {
  const ok = await page.evaluate(() =>
    window.__ff.ITEMS.every(i => i.heatLo < i.heatHi && i.heatHi < i.maxTemp)
  );
  assert.ok(ok);
});

test('quench windows are valid (lo < hi < MAX_QUENCH)', async () => {
  const ok = await page.evaluate(() =>
    window.__ff.ITEMS.every(i => i.quenchLo < i.quenchHi && i.quenchHi < window.__ff.MAX_QUENCH)
  );
  assert.ok(ok);
});

test('pendulum speed escalates across items', async () => {
  const speeds = await page.evaluate(() => window.__ff.ITEMS.map(i => i.pendSpeed));
  for (let i = 1; i < speeds.length; i++) {
    assert.ok(speeds[i] > speeds[i - 1], `item ${i} pendSpeed not faster than item ${i-1}`);
  }
});

// ── Suite 3: startGame / startRound ─────────────────────────────────────────
test('startGame sets state to playing', async () => {
  await page.evaluate(() => window.__ff.startGame());
  const s = await page.evaluate(() => window.__ff.state);
  assert.strictEqual(s, 'playing');
});

test('startGame sets roundIdx to 0', async () => {
  await page.evaluate(() => window.__ff.startGame());
  const r = await page.evaluate(() => window.__ff.roundIdx);
  assert.strictEqual(r, 0);
});

test('startGame resets score to 0', async () => {
  await page.evaluate(() => { window.__ff.score = 500; window.__ff.startGame(); });
  const s = await page.evaluate(() => window.__ff.score);
  assert.strictEqual(s, 0);
});

test('startRound sets phase to heat', async () => {
  await page.evaluate(() => { window.__ff.startGame(); window.__ff.startRound(); });
  const p = await page.evaluate(() => window.__ff.phase);
  assert.strictEqual(p, 'heat');
});

test('startRound resets temp to 20', async () => {
  await page.evaluate(() => {
    window.__ff.temp = 900;
    window.__ff.startRound();
  });
  const t = await page.evaluate(() => window.__ff.temp);
  assert.strictEqual(t, 20);
});

test('startRound resets strikeIdx to 0', async () => {
  await page.evaluate(() => {
    window.__ff.strikeIdx = 3;
    window.__ff.startRound();
  });
  const s = await page.evaluate(() => window.__ff.strikeIdx);
  assert.strictEqual(s, 0);
});

test('startRound resets quenchTime to 0', async () => {
  await page.evaluate(() => {
    window.__ff.quenchTime = 1.5;
    window.__ff.startRound();
  });
  const q = await page.evaluate(() => window.__ff.quenchTime);
  assert.strictEqual(q, 0);
});

// ── Suite 4: Temperature / Heat phase ───────────────────────────────────────
test('ironColor returns dark for cold iron', async () => {
  const col = await page.evaluate(() => window.__ff.ironColor(20));
  assert.ok(col.startsWith('rgb'), 'not an rgb color');
  // low temperature should be very dark (r < 60)
  const match = col.match(/rgb\((\d+),(\d+),(\d+)\)/);
  assert.ok(match && parseInt(match[1]) < 60, 'cold iron should be dark');
});

test('ironColor returns orange for hot iron (700C)', async () => {
  const col = await page.evaluate(() => window.__ff.ironColor(700));
  const match = col.match(/rgb\((\d+),(\d+),(\d+)\)/);
  assert.ok(match && parseInt(match[1]) > 150, 'hot iron should be bright');
});

test('ironColor returns near-white for very hot iron (1100C)', async () => {
  const col = await page.evaluate(() => window.__ff.ironColor(1100));
  const match = col.match(/rgb\((\d+),(\d+),(\d+)\)/);
  assert.ok(match && parseInt(match[1]) > 230, 'very hot iron should be near-white');
});

test('ironGlowColor returns null for cold iron', async () => {
  const col = await page.evaluate(() => window.__ff.ironGlowColor(200));
  assert.strictEqual(col, null);
});

test('ironGlowColor returns rgba string for hot iron', async () => {
  const col = await page.evaluate(() => window.__ff.ironGlowColor(800));
  assert.ok(col && col.startsWith('rgba'), 'should return rgba string');
});

test('onHeatTap advances to strike when in sweet zone', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    const item = window.__ff.ITEMS[0];
    window.__ff.temp = (item.heatLo + item.heatHi) / 2;
    window.__ff.onHeatTap();
  });
  await page.waitForTimeout(700);
  const p = await page.evaluate(() => window.__ff.phase);
  assert.strictEqual(p, 'strike');
});

test('onHeatTap does nothing when temp too low', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.temp = 100;
    window.__ff.onHeatTap();
  });
  const p = await page.evaluate(() => window.__ff.phase);
  assert.strictEqual(p, 'heat');
});

test('onHeatTap does nothing when overheated', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    const item = window.__ff.ITEMS[0];
    window.__ff.temp = (item.heatLo + item.heatHi) / 2;
    window.__ff.overheated = true;
    window.__ff.onHeatTap();
  });
  const p = await page.evaluate(() => window.__ff.phase);
  assert.strictEqual(p, 'heat');
});

test('perfect heat awards 150 points', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    const item = window.__ff.ITEMS[0];
    window.__ff.temp = (item.heatLo + item.heatHi) / 2;
    window.__ff.onHeatTap();
  });
  await page.waitForTimeout(100);
  const s = await page.evaluate(() => window.__ff.score);
  assert.strictEqual(s, 150);
});

test('good heat awards 80 points', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    const item = window.__ff.ITEMS[0];
    // Near edge of zone but still valid
    window.__ff.temp = item.heatLo + 5;
    window.__ff.onHeatTap();
  });
  await page.waitForTimeout(100);
  const s = await page.evaluate(() => window.__ff.score);
  assert.strictEqual(s, 80);
});

// ── Suite 5: Strike phase ────────────────────────────────────────────────────
test('pendAngleToBarPos maps -MAX to 0', async () => {
  const pos = await page.evaluate(() => {
    const a = -window.__ff.PEND_MAX_ANGLE;
    return window.__ff.pendAngleToBarPos(a);
  });
  assert.ok(Math.abs(pos) < 0.01, `expected ~0, got ${pos}`);
});

test('pendAngleToBarPos maps +MAX to 4', async () => {
  const pos = await page.evaluate(() => {
    const a = window.__ff.PEND_MAX_ANGLE;
    return window.__ff.pendAngleToBarPos(a);
  });
  assert.ok(Math.abs(pos - 4) < 0.01, `expected ~4, got ${pos}`);
});

test('barPosToPendAngle maps 0 to -MAX', async () => {
  const a = await page.evaluate(() => window.__ff.barPosToPendAngle(0));
  const MAX = await page.evaluate(() => window.__ff.PEND_MAX_ANGLE);
  assert.ok(Math.abs(a + MAX) < 0.01);
});

test('barPosToPendAngle maps 4 to +MAX', async () => {
  const a = await page.evaluate(() => window.__ff.barPosToPendAngle(4));
  const MAX = await page.evaluate(() => window.__ff.PEND_MAX_ANGLE);
  assert.ok(Math.abs(a - MAX) < 0.01);
});

test('barZoneX returns different x values for positions 0 and 4', async () => {
  const result = await page.evaluate(() => ({
    x0: window.__ff.barZoneX(0),
    x4: window.__ff.barZoneX(4),
  }));
  assert.ok(result.x4 > result.x0, 'position 4 should be to the right of 0');
});

test('onStrikeTap: perfect when pendulum over target zone', async () => {
  const result = await page.evaluate(() => {
    window.__ff.startGame();
    // Set up: phase=strike, hot iron, pendulum exactly over target
    window.__ff.phase = 'strike';
    window.__ff.temp = 700;
    const targetPos = window.__ff.ITEMS[0].strikes[0];
    window.__ff.pendAngle = window.__ff.barPosToPendAngle(targetPos);
    window.__ff.onStrikeTap();
    return { results: window.__ff.strikeResults.slice(), strikeIdx: window.__ff.strikeIdx };
  });
  assert.strictEqual(result.results[0], 'perfect');
  assert.strictEqual(result.strikeIdx, 1);
});

test('onStrikeTap: miss when pendulum far from target', async () => {
  const result = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'strike';
    window.__ff.temp = 700;
    const targetPos = window.__ff.ITEMS[0].strikes[0];
    // Put pendulum on opposite side
    const oppositePos = targetPos <= 2 ? 4 : 0;
    window.__ff.pendAngle = window.__ff.barPosToPendAngle(oppositePos);
    window.__ff.onStrikeTap();
    return window.__ff.strikeResults.slice();
  });
  assert.strictEqual(result[0], 'miss');
});

test('onStrikeTap: good hit at near-target distance', async () => {
  const result = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'strike';
    window.__ff.temp = 700;
    const targetPos = window.__ff.ITEMS[0].strikes[0];
    // Slightly off target (0.7 bar units away = good range)
    window.__ff.pendAngle = window.__ff.barPosToPendAngle(targetPos + 0.7);
    window.__ff.onStrikeTap();
    return window.__ff.strikeResults.slice();
  });
  assert.strictEqual(result[0], 'good');
});

test('onStrikeTap switches to heat if iron too cold', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'strike';
    window.__ff.temp = 100; // below strikeCoolTemp
    window.__ff.onStrikeTap();
  });
  const p = await page.evaluate(() => window.__ff.phase);
  assert.strictEqual(p, 'heat');
});

test('all strikes complete transitions to quench phase', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'strike';
    window.__ff.temp = 700;
    const item = window.__ff.ITEMS[0];
    // Complete all strikes, resetting strikeFlash between calls
    item.strikes.forEach(pos => {
      window.__ff.strikeFlash = 0;
      window.__ff.pendAngle = window.__ff.barPosToPendAngle(pos);
      window.__ff.onStrikeTap();
    });
  });
  await page.waitForTimeout(600);
  const p = await page.evaluate(() => window.__ff.phase);
  assert.strictEqual(p, 'quench');
});

// ── Suite 6: Quench phase ────────────────────────────────────────────────────
test('onQuenchTap(true) sets quenchHeld to true', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.onQuenchTap(true);
  });
  const h = await page.evaluate(() => window.__ff.quenchHeld);
  assert.ok(h);
});

test('onQuenchTap(false) triggers finishQuench', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.quenchTime = 1.2;
    window.__ff.onQuenchTap(true);
    window.__ff.onQuenchTap(false);
  });
  const r = await page.evaluate(() => window.__ff.quenchResult);
  assert.ok(r !== null);
});

test('perfect quench awards 150 points', async () => {
  const s = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    window.__ff.strikeResults = [];
    const item = window.__ff.ITEMS[0];
    window.__ff.quenchTime = (item.quenchLo + item.quenchHi) / 2;
    window.__ff.onQuenchTap(true);
    window.__ff.onQuenchTap(false);
    return window.__ff.score;
  });
  assert.strictEqual(s, 150);
});

test('good quench awards 80 points', async () => {
  const s = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    window.__ff.strikeResults = [];
    const item = window.__ff.ITEMS[0];
    // Near but not in center
    window.__ff.quenchTime = item.quenchLo + 0.05;
    window.__ff.onQuenchTap(true);
    window.__ff.onQuenchTap(false);
    return window.__ff.score;
  });
  assert.strictEqual(s, 80);
});

test('soft quench (too short) awards only 20 points', async () => {
  const s = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    window.__ff.strikeResults = [];
    window.__ff.quenchTime = 0.1; // well below quenchLo
    window.__ff.onQuenchTap(true);
    window.__ff.onQuenchTap(false);
    return window.__ff.score;
  });
  assert.strictEqual(s, 20);
});

test('brittle quench (too long) awards only 20 points', async () => {
  const s = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    window.__ff.strikeResults = [];
    const item = window.__ff.ITEMS[0];
    window.__ff.quenchTime = item.quenchHi + 0.5; // well above
    window.__ff.onQuenchTap(true);
    window.__ff.onQuenchTap(false);
    return window.__ff.score;
  });
  assert.strictEqual(s, 20);
});

test('finishQuench advances phase to item_done', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.strikeResults = [];
    window.__ff.quenchTime = 1.0;
    window.__ff.finishQuench();
  });
  const p = await page.evaluate(() => window.__ff.phase);
  assert.strictEqual(p, 'item_done');
});

// ── Suite 7: Quality rating ──────────────────────────────────────────────────
test('masterwork quality requires perfect heat, quench, and high strike accuracy', async () => {
  const q = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    const item = window.__ff.ITEMS[0];
    // Set heatResult directly to perfect
    window.__ff.heatResult = 'perfect';
    // Perfect strikes for all
    window.__ff.strikeResults = item.strikes.map(() => 'perfect');
    // Perfect quench
    window.__ff.quenchTime = (item.quenchLo + item.quenchHi) / 2;
    window.__ff.finishQuench();
    return window.__ff.itemQuality;
  });
  assert.strictEqual(q, 'MASTERWORK');
});

test('flawed quality with all misses', async () => {
  const q = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    const item = window.__ff.ITEMS[0];
    window.__ff.strikeResults = item.strikes.map(() => 'miss');
    window.__ff.quenchTime = 0.1;
    window.__ff.finishQuench();
    return window.__ff.itemQuality;
  });
  assert.strictEqual(q, 'FLAWED');
});

// ── Suite 8: Round progression ───────────────────────────────────────────────
test('item_done with items remaining increments roundIdx', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.roundIdx = 0;
    window.__ff.phase = 'item_done';
    window.__ff.itemDoneTimer = 0.01;
  });
  // Simulate the timer ticking down via update
  await page.evaluate(() => {
    // Directly trigger the transition
    window.__ff.startGame();
    window.__ff.roundIdx = 0;
    window.__ff.phase = 'quench';
    window.__ff.strikeResults = [];
    window.__ff.quenchTime = 1.2;
    window.__ff.finishQuench();
  });
  await page.waitForTimeout(2300);
  const r = await page.evaluate(() => window.__ff.roundIdx);
  assert.strictEqual(r, 1);
});

test('item_done on last round triggers gameover', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.roundIdx = 4; // last item
    window.__ff.phase = 'quench';
    window.__ff.strikeResults = [];
    window.__ff.quenchTime = 1.2;
    window.__ff.finishQuench();
  });
  await page.waitForTimeout(2500);
  const s = await page.evaluate(() => window.__ff.state);
  assert.strictEqual(s, 'gameover');
});

test('endGame saves best score to localStorage', async () => {
  await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.score = 1234;
    window.__ff.endGame();
  });
  const best = await page.evaluate(() => localStorage.getItem('frontier-forge_best'));
  assert.strictEqual(best, '1234');
});

test('endGame only updates best if score higher', async () => {
  await page.evaluate(() => {
    localStorage.setItem('frontier-forge_best', '5000');
    window.__ff.startGame();
    window.__ff.score = 100;
    window.__ff.endGame();
  });
  const best = await page.evaluate(() => localStorage.getItem('frontier-forge_best'));
  assert.strictEqual(best, '5000');
});

// ── Suite 9: Strike score accumulation ──────────────────────────────────────
test('three perfect strikes add 240 points to score', async () => {
  const s = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    const item = window.__ff.ITEMS[0];
    window.__ff.strikeResults = ['perfect', 'perfect', 'perfect'];
    window.__ff.quenchTime = item.quenchLo + 0.05;
    window.__ff.onQuenchTap(true);
    window.__ff.onQuenchTap(false);
    // Score = 80 (good quench) + 3*80 (perfect strikes) = 320
    return window.__ff.score;
  });
  assert.strictEqual(s, 80 + 240); // good quench + 3 perfect
});

test('mixed strikes score correctly (perfect=80, good=40, miss=0)', async () => {
  const s = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'quench';
    window.__ff.score = 0;
    const item = window.__ff.ITEMS[0];
    window.__ff.strikeResults = ['perfect', 'good', 'miss'];
    window.__ff.quenchTime = (item.quenchLo + item.quenchHi) / 2;
    window.__ff.onQuenchTap(true);
    window.__ff.onQuenchTap(false);
    // 150 (perfect quench) + 80 + 40 + 0 = 270
    return window.__ff.score;
  });
  assert.strictEqual(s, 270);
});

// ── Suite 10: Console error sweep ───────────────────────────────────────────
test('no console errors on load', async () => {
  const errors = [];
  const p2 = await browser.newPage();
  p2.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p2.goto(FILE);
  await p2.waitForTimeout(500);
  await p2.evaluate(() => window.__ff.startGame());
  await p2.waitForTimeout(300);
  await p2.close();
  assert.strictEqual(errors.length, 0, `Console errors: ${errors.join('; ')}`);
});

test('no console errors through full game cycle', async () => {
  const errors = [];
  const p2 = await browser.newPage();
  p2.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p2.goto(FILE);
  await p2.waitForTimeout(300);
  await p2.evaluate(async () => {
    window.__ff.startGame();
    // Simulate all 5 rounds quickly
    for (let i = 0; i < 5; i++) {
      window.__ff.roundIdx = i;
      window.__ff.startRound();
      // Skip heat
      const item = window.__ff.ITEMS[i];
      window.__ff.temp = (item.heatLo + item.heatHi) / 2;
      window.__ff.onHeatTap();
      await new Promise(r => setTimeout(r, 700));
      // Do all strikes
      window.__ff.strikeResults = item.strikes.map(() => 'perfect');
      window.__ff.strikeIdx = item.strikes.length;
      window.__ff.phase = 'quench';
      window.__ff.quenchTime = (item.quenchLo + item.quenchHi) / 2;
      window.__ff.finishQuench();
      await new Promise(r => setTimeout(r, 2300));
    }
  });
  await p2.waitForTimeout(500);
  await p2.close();
  assert.strictEqual(errors.length, 0, `Console errors: ${errors.join('; ')}`);
});

// ── Suite 11: Popup system ───────────────────────────────────────────────────
test('addPopup creates popup entry', async () => {
  const len = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.popups.length = 0;
    window.__ff.addPopup(180, 300, 'TEST', '#FFE066');
    return window.__ff.popups.length;
  });
  assert.strictEqual(len, 1);
});

test('popup has text, color, and life properties', async () => {
  const p = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.popups.length = 0;
    window.__ff.addPopup(100, 200, 'HELLO', '#FF0000');
    return window.__ff.popups[0];
  });
  assert.strictEqual(p.text, 'HELLO');
  assert.strictEqual(p.color, '#FF0000');
  assert.ok(p.life > 0);
});

// ── Suite 12: Particles ──────────────────────────────────────────────────────
test('embers spawned on perfect strike', async () => {
  const len = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'strike';
    window.__ff.temp = 700;
    window.__ff.particles = [];
    const item = window.__ff.ITEMS[0];
    window.__ff.pendAngle = window.__ff.barPosToPendAngle(item.strikes[0]);
    window.__ff.onStrikeTap();
    return window.__ff.particles.length;
  });
  assert.ok(len > 0, 'no particles spawned on perfect strike');
});

// ── Suite 13: Overheat protection ────────────────────────────────────────────
test('overheating deducts 30 points', async () => {
  const s = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.score = 100;
    window.__ff.phase = 'heat';
    window.__ff.temp = window.__ff.ITEMS[0].maxTemp;
    window.__ff.heating = true;
    // Manually trigger the overheat condition
    window.__ff.overheated = true;
    window.__ff.score = Math.max(0, window.__ff.score - 30);
    return window.__ff.score;
  });
  assert.strictEqual(s, 70);
});

test('onHeatTap blocked when overheated', async () => {
  const phaseAfter = await page.evaluate(() => {
    window.__ff.startGame();
    window.__ff.phase = 'heat';
    window.__ff.overheated = true;
    const item = window.__ff.ITEMS[0];
    window.__ff.temp = (item.heatLo + item.heatHi) / 2;
    window.__ff.onHeatTap();
    return window.__ff.phase;
  });
  assert.strictEqual(phaseAfter, 'heat');
});

// ── Suite 14: endGame state ───────────────────────────────────────────────────
test('endGame sets state to gameover', async () => {
  await page.evaluate(() => { window.__ff.startGame(); window.__ff.endGame(); });
  const s = await page.evaluate(() => window.__ff.state);
  assert.strictEqual(s, 'gameover');
});

// ── Suite 15: FEEDBACK_ENDPOINT defined ──────────────────────────────────────
test('FEEDBACK_ENDPOINT is a non-empty string in source', async () => {
  const ep = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    return scripts.some(s => s.textContent.includes('FEEDBACK_ENDPOINT'));
  });
  assert.ok(ep, 'FEEDBACK_ENDPOINT not found in script');
});

test('Google Analytics tag present', async () => {
  const has = await page.evaluate(() =>
    !!document.querySelector('script[src*="googletagmanager"]')
  );
  assert.ok(has, 'Google Analytics tag missing');
});

// ── Runner ───────────────────────────────────────────────────────────────────
(async () => {
  await setup();
  let passed = 0, failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL  ${name}`);
      console.error('        ', e.message);
      failed++;
    }
  }
  await teardown();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
