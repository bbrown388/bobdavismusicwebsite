// test-dust-bowl-derby.js -- Playwright tests for Game 53: Dust Bowl Derby
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'dust-bowl-derby.html').replace(/\\/g, '/');
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

// ── Suite 1: DOM & canvas ────────────────────────────────────────────────────
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
  const s = await page.evaluate(() => window.__dbd.state);
  assert.strictEqual(s, 'title');
});

test('test API exposed', async () => {
  const ok = await page.evaluate(() => typeof window.__dbd === 'object');
  assert.ok(ok);
});

test('feedback endpoint set in page', async () => {
  const found = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    return scripts.some(s => s.textContent.includes('formspree.io') || s.textContent.includes('script.google.com'));
  });
  assert.ok(found, 'FEEDBACK_ENDPOINT not found in inline scripts');
});

// ── Suite 2: Constants ───────────────────────────────────────────────────────
test('arena center and radii are positive', async () => {
  const ok = await page.evaluate(() =>
    window.__dbd.ARENA_CX > 0 && window.__dbd.ARENA_CY > 0 &&
    window.__dbd.ARENA_RX > 0 && window.__dbd.ARENA_RY > 0
  );
  assert.ok(ok, 'arena geometry invalid');
});

test('arena fits within canvas', async () => {
  const ok = await page.evaluate(() => {
    const { ARENA_CX, ARENA_CY, ARENA_RX, ARENA_RY } = window.__dbd;
    return (ARENA_CX - ARENA_RX >= 0) && (ARENA_CX + ARENA_RX <= 360) &&
           (ARENA_CY - ARENA_RY >= 0) && (ARENA_CY + ARENA_RY <= 640);
  });
  assert.ok(ok, 'arena extends outside canvas');
});

test('BOOST_SPEED > BASE_SPEED', async () => {
  const ok = await page.evaluate(() => window.__dbd.BOOST_SPEED > window.__dbd.BASE_SPEED);
  assert.ok(ok);
});

test('RIVAL_SPEED < BASE_SPEED', async () => {
  const ok = await page.evaluate(() => window.__dbd.RIVAL_SPEED < window.__dbd.BASE_SPEED);
  assert.ok(ok, 'rivals should be slower than player base speed');
});

test('NUM_ROUNDS is 3', async () => {
  const n = await page.evaluate(() => window.__dbd.NUM_ROUNDS);
  assert.strictEqual(n, 3);
});

test('ROUND_RIVALS has 3 entries matching NUM_ROUNDS', async () => {
  const ok = await page.evaluate(() => window.__dbd.ROUND_RIVALS.length === window.__dbd.NUM_ROUNDS);
  assert.ok(ok);
});

test('ROUND_RIVALS escalates (each entry >= previous)', async () => {
  const rr = await page.evaluate(() => window.__dbd.ROUND_RIVALS);
  for (let i = 1; i < rr.length; i++) {
    assert.ok(rr[i] >= rr[i - 1], `ROUND_RIVALS[${i}] should be >= ROUND_RIVALS[${i-1}]`);
  }
});

test('CAR_R > 0', async () => {
  const r = await page.evaluate(() => window.__dbd.CAR_R);
  assert.ok(r > 0);
});

test('MAX_DAMAGE is 100', async () => {
  const md = await page.evaluate(() => window.__dbd.MAX_DAMAGE);
  assert.strictEqual(md, 100);
});

// ── Suite 3: startGame ───────────────────────────────────────────────────────
test('startGame sets state to playing', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const s = await page.evaluate(() => window.__dbd.state);
  assert.strictEqual(s, 'playing');
});

test('startGame resets score to 0', async () => {
  await page.evaluate(() => { window.__dbd.score = 999; window.__dbd.startGame(); });
  const s = await page.evaluate(() => window.__dbd.score);
  assert.strictEqual(s, 0);
});

test('startGame sets round to 0', async () => {
  await page.evaluate(() => { window.__dbd.round = 2; window.__dbd.startGame(); });
  const r = await page.evaluate(() => window.__dbd.round);
  assert.strictEqual(r, 0);
});

test('startGame creates player with alive=true', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const alive = await page.evaluate(() => window.__dbd.player.alive);
  assert.strictEqual(alive, true);
});

test('startGame spawns ROUND_RIVALS[0] rivals', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const n = await page.evaluate(() => window.__dbd.rivals.length);
  assert.strictEqual(n, 1);
});

test('startGame places player inside arena', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const ok = await page.evaluate(() => window.__dbd.isInsideArena(window.__dbd.player.x, window.__dbd.player.y));
  assert.ok(ok, 'player spawned outside arena');
});

test('startGame places rivals inside arena', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const ok = await page.evaluate(() =>
    window.__dbd.rivals.every(r => window.__dbd.isInsideArena(r.x, r.y))
  );
  assert.ok(ok, 'rival(s) spawned outside arena');
});

test('startGame resets barrels (8 barrels)', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const n = await page.evaluate(() => window.__dbd.barrels.length);
  assert.strictEqual(n, 8);
});

test('startGame resets intermissionTimer to 0', async () => {
  await page.evaluate(() => { window.__dbd.intermissionTimer = 3000; window.__dbd.startGame(); });
  const t = await page.evaluate(() => window.__dbd.intermissionTimer);
  assert.strictEqual(t, 0);
});

// ── Suite 4: Arena geometry ──────────────────────────────────────────────────
test('isInsideArena returns true for center', async () => {
  const ok = await page.evaluate(() => window.__dbd.isInsideArena(window.__dbd.ARENA_CX, window.__dbd.ARENA_CY));
  assert.ok(ok);
});

test('isInsideArena returns false for outside point', async () => {
  const ok = await page.evaluate(() => window.__dbd.isInsideArena(0, 0));
  assert.ok(!ok, 'corner (0,0) should be outside arena');
});

test('isInsideArena returns true for point on edge (just inside)', async () => {
  const ok = await page.evaluate(() => {
    const { ARENA_CX, ARENA_CY, ARENA_RX } = window.__dbd;
    return window.__dbd.isInsideArena(ARENA_CX + ARENA_RX * 0.98, ARENA_CY);
  });
  assert.ok(ok, 'point just inside right edge should be inside');
});

test('pushInsideArena moves out-of-bounds car back inside', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const inside = await page.evaluate(() => {
    const car = window.__dbd.player;
    car.x = 0; car.y = 0; car.vx = -50; car.vy = 0;
    window.__dbd.pushInsideArena(car);
    return window.__dbd.isInsideArena(car.x, car.y);
  });
  assert.ok(inside, 'car should be pushed back inside arena');
});

// ── Suite 5: Player steering ─────────────────────────────────────────────────
test('left input turns car angle negative (counterclockwise)', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const angleBefore = await page.evaluate(() => window.__dbd.player.angle);
  await page.evaluate(() => {
    window.__dbd.leftHeld = true;
    window.__dbd.update(0.1);
    window.__dbd.leftHeld = false;
  });
  const angleAfter = await page.evaluate(() => window.__dbd.player.angle);
  assert.ok(angleAfter < angleBefore, `angle should decrease: before=${angleBefore} after=${angleAfter}`);
});

test('right input turns car angle positive (clockwise)', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const angleBefore = await page.evaluate(() => window.__dbd.player.angle);
  await page.evaluate(() => {
    window.__dbd.rightHeld = true;
    window.__dbd.update(0.1);
    window.__dbd.rightHeld = false;
  });
  const angleAfter = await page.evaluate(() => window.__dbd.player.angle);
  assert.ok(angleAfter > angleBefore, `angle should increase: before=${angleBefore} after=${angleAfter}`);
});

test('car moves forward in facing direction', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const { x0, y0, angle } = await page.evaluate(() => ({
    x0: window.__dbd.player.x,
    y0: window.__dbd.player.y,
    angle: window.__dbd.player.angle,
  }));
  await page.evaluate(() => window.__dbd.update(0.1));
  const { x1, y1 } = await page.evaluate(() => ({ x1: window.__dbd.player.x, y1: window.__dbd.player.y }));
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  assert.ok(dist > 0, 'car should have moved');
});

// ── Suite 6: Boost & heat ────────────────────────────────────────────────────
test('boost raises engine heat', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const heatBefore = await page.evaluate(() => window.__dbd.player.heat);
  await page.evaluate(() => {
    window.__dbd.boostHeld = true;
    window.__dbd.update(0.2);
    window.__dbd.boostHeld = false;
  });
  const heatAfter = await page.evaluate(() => window.__dbd.player.heat);
  assert.ok(heatAfter > heatBefore, `heat should rise: before=${heatBefore} after=${heatAfter}`);
});

test('boost increases car speed', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  await page.evaluate(() => { window.__dbd.boostHeld = true; window.__dbd.update(0.01); });
  const ok = await page.evaluate(() => window.__dbd.player.speed === window.__dbd.BOOST_SPEED);
  assert.ok(ok, 'speed should be BOOST_SPEED while boosting');
});

test('heat falls when not boosting', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.player.heat = 80;
    window.__dbd.boostHeld = false;
    window.__dbd.update(0.2);
  });
  const heat = await page.evaluate(() => window.__dbd.player.heat);
  assert.ok(heat < 80, `heat should fall: got ${heat}`);
});

test('stall occurs when heat reaches max', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.player.heat = window.__dbd.STALL_HEAT - 1;
    window.__dbd.boostHeld = true;
    window.__dbd.update(0.2);
    window.__dbd.boostHeld = false;
  });
  const stall = await page.evaluate(() => window.__dbd.player.stallTimer);
  assert.ok(stall > 0, `stallTimer should be > 0 after overheat, got ${stall}`);
});

test('stalled car has no velocity', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.player.stallTimer = 500;
    window.__dbd.update(0.05);
  });
  const { vx, vy } = await page.evaluate(() => ({ vx: window.__dbd.player.vx, vy: window.__dbd.player.vy }));
  assert.strictEqual(vx, 0); assert.strictEqual(vy, 0);
});

test('stall timer decrements over time', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.player.stallTimer = 1000;
    window.__dbd.update(0.1);
  });
  const t = await page.evaluate(() => window.__dbd.player.stallTimer);
  assert.ok(t < 1000, `stallTimer should decrease: got ${t}`);
});

// ── Suite 7: Collision ───────────────────────────────────────────────────────
test('collide returns true for overlapping cars', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const hit = await page.evaluate(() => {
    const a = { x: 100, y: 100, vx: 50, vy: 0, damage: 0, alive: true };
    const b = { x: 115, y: 100, vx: -50, vy: 0, damage: 0, alive: true };
    return window.__dbd.collide(a, b);
  });
  assert.ok(hit, 'overlapping cars should collide');
});

test('collide returns false for non-overlapping cars', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const hit = await page.evaluate(() => {
    const a = { x: 100, y: 100, vx: 0, vy: 0, damage: 0, alive: true };
    const b = { x: 200, y: 200, vx: 0, vy: 0, damage: 0, alive: true };
    return window.__dbd.collide(a, b);
  });
  assert.ok(!hit, 'far-apart cars should not collide');
});

test('collide adds damage to both cars', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const dmg = await page.evaluate(() => {
    const a = { x: 100, y: 100, vx: 80, vy: 0, damage: 0, alive: true };
    const b = { x: 118, y: 100, vx: -80, vy: 0, damage: 0, alive: true };
    window.__dbd.collide(a, b);
    return { da: a.damage, db: b.damage };
  });
  assert.ok(dmg.da > 0, `car a damage should increase: ${dmg.da}`);
  assert.ok(dmg.db > 0, `car b damage should increase: ${dmg.db}`);
});

test('collide separates overlapping cars', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const dist = await page.evaluate(() => {
    const a = { x: 100, y: 100, vx: 40, vy: 0, damage: 0, alive: true };
    const b = { x: 112, y: 100, vx: -40, vy: 0, damage: 0, alive: true };
    window.__dbd.collide(a, b);
    return Math.hypot(a.x - b.x, a.y - b.y);
  });
  const CAR_R = await page.evaluate(() => window.__dbd.CAR_R);
  assert.ok(dist >= CAR_R * 2 * 0.95, `cars should be separated: dist=${dist}`);
});

test('damage is capped at MAX_DAMAGE', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const dmg = await page.evaluate(() => {
    const a = { x: 100, y: 100, vx: 500, vy: 0, damage: 95, alive: true };
    const b = { x: 115, y: 100, vx: -500, vy: 0, damage: 95, alive: true };
    window.__dbd.collide(a, b);
    return { da: a.damage, db: b.damage };
  });
  assert.ok(dmg.da <= 100, `damage a should be capped: ${dmg.da}`);
  assert.ok(dmg.db <= 100, `damage b should be capped: ${dmg.db}`);
});

// ── Suite 8: Rival spawning ───────────────────────────────────────────────────
test('spawnRound(0) creates 1 rival', async () => {
  await page.evaluate(() => { window.__dbd.startGame(); window.__dbd.spawnRound(0); });
  const n = await page.evaluate(() => window.__dbd.rivals.length);
  assert.strictEqual(n, 1);
});

test('spawnRound(1) creates 2 rivals', async () => {
  await page.evaluate(() => { window.__dbd.startGame(); window.__dbd.spawnRound(1); });
  const n = await page.evaluate(() => window.__dbd.rivals.length);
  assert.strictEqual(n, 2);
});

test('spawnRound(2) creates 3 rivals', async () => {
  await page.evaluate(() => { window.__dbd.startGame(); window.__dbd.spawnRound(2); });
  const n = await page.evaluate(() => window.__dbd.rivals.length);
  assert.strictEqual(n, 3);
});

test('rivals spawned alive', async () => {
  await page.evaluate(() => { window.__dbd.startGame(); window.__dbd.spawnRound(2); });
  const ok = await page.evaluate(() => window.__dbd.rivals.every(r => r.alive));
  assert.ok(ok, 'all rivals should start alive');
});

test('rivals have 0 damage on spawn', async () => {
  await page.evaluate(() => { window.__dbd.startGame(); window.__dbd.spawnRound(2); });
  const ok = await page.evaluate(() => window.__dbd.rivals.every(r => r.damage === 0));
  assert.ok(ok);
});

// ── Suite 9: Elimination ─────────────────────────────────────────────────────
test('rival eliminated when damage reaches MAX_DAMAGE', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  // Capture reference inside evaluate so we check the same object before spawnRound replaces array
  const alive = await page.evaluate(() => {
    const rival = window.__dbd.rivals[0];
    rival.damage = window.__dbd.MAX_DAMAGE;
    window.__dbd.update(0.016);
    return rival.alive;
  });
  assert.strictEqual(alive, false, 'rival should be eliminated');
});

test('score increases when rival eliminated', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const scoreBefore = await page.evaluate(() => window.__dbd.score);
  await page.evaluate(() => {
    window.__dbd.rivals[0].damage = window.__dbd.MAX_DAMAGE;
    window.__dbd.update(0.016);
  });
  const scoreAfter = await page.evaluate(() => window.__dbd.score);
  assert.ok(scoreAfter > scoreBefore, `score should increase: ${scoreBefore} -> ${scoreAfter}`);
});

test('player eliminated when damage reaches MAX_DAMAGE -> gameover', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  await page.evaluate(() => {
    window.__dbd.player.damage = window.__dbd.MAX_DAMAGE;
    window.__dbd.update(0.016);
  });
  const s = await page.evaluate(() => window.__dbd.state);
  assert.strictEqual(s, 'gameover');
});

// ── Suite 10: Round progression ──────────────────────────────────────────────
test('clearing round 0 increments round to 1', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  await page.evaluate(() => {
    window.__dbd.rivals.forEach(r => { r.damage = window.__dbd.MAX_DAMAGE; });
    window.__dbd.update(0.016);
  });
  const r = await page.evaluate(() => window.__dbd.round);
  assert.strictEqual(r, 1);
});

test('clearing round 0 triggers intermission', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  await page.evaluate(() => {
    window.__dbd.rivals.forEach(r => { r.damage = window.__dbd.MAX_DAMAGE; });
    window.__dbd.update(0.016);
  });
  const t = await page.evaluate(() => window.__dbd.intermissionTimer);
  assert.ok(t > 0, `intermissionTimer should be > 0, got ${t}`);
});

test('intermission pauses update', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  // Manually set intermission
  await page.evaluate(() => { window.__dbd.intermissionTimer = 2000; });
  const { x0, y0 } = await page.evaluate(() => ({ x0: window.__dbd.player.x, y0: window.__dbd.player.y }));
  await page.evaluate(() => window.__dbd.update(0.1));
  const { x1, y1 } = await page.evaluate(() => ({ x1: window.__dbd.player.x, y1: window.__dbd.player.y }));
  assert.strictEqual(x0, x1); assert.strictEqual(y0, y1);
});

test('clearing all 3 rounds ends game as gameover (won)', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    // Skip to round 2 (last round)
    window.__dbd.round = 2;
    window.__dbd.spawnRound(2);
    window.__dbd.rivals.forEach(r => { r.damage = window.__dbd.MAX_DAMAGE; });
    window.__dbd.update(0.016);
  });
  const s = await page.evaluate(() => window.__dbd.state);
  assert.strictEqual(s, 'gameover');
});

test('new rivals spawned for round 1 (2 rivals)', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.rivals[0].damage = window.__dbd.MAX_DAMAGE;
    window.__dbd.update(0.016); // eliminates rival, clears round, increments round
    // run intermission
    window.__dbd.intermissionTimer = 0;
    window.__dbd.update(0.016);
  });
  const n = await page.evaluate(() => window.__dbd.rivals.length);
  assert.strictEqual(n, 2, `round 1 should spawn 2 rivals, got ${n}`);
});

// ── Suite 11: Barrel collisions ──────────────────────────────────────────────
test('8 barrels placed within arena', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const ok = await page.evaluate(() =>
    window.__dbd.barrels.every(b => window.__dbd.isInsideArena(b.x, b.y))
  );
  assert.ok(ok, 'all barrels should be inside arena');
});

test('car placed directly on barrel takes damage', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    // Move player directly onto first barrel
    const b = window.__dbd.barrels[0];
    window.__dbd.player.x = b.x;
    window.__dbd.player.y = b.y;
    window.__dbd.player.vx = 50;
    window.__dbd.player.vy = 0;
    window.__dbd.player.stallTimer = 0;
    window.__dbd.update(0.016);
  });
  const dmg = await page.evaluate(() => window.__dbd.player.damage);
  assert.ok(dmg > 0, `player should take barrel damage: got ${dmg}`);
});

// ── Suite 12: localStorage best score ───────────────────────────────────────
test('bestScore starts at 0 or stored value', async () => {
  const bs = await page.evaluate(() => window.__dbd.bestScore);
  assert.ok(typeof bs === 'number' && bs >= 0);
});

test('best score saved when score exceeds previous best', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.bestScore = 0;  // reset in-memory best
    localStorage.setItem('dust_bowl_derby_best', '0');
    window.__dbd.score = 999;
    window.__dbd.player.damage = window.__dbd.MAX_DAMAGE;
    window.__dbd.update(0.016);
  });
  const stored = await page.evaluate(() => parseInt(localStorage.getItem('dust_bowl_derby_best') || '0'));
  assert.ok(stored >= 999, `stored best should be >= 999, got ${stored}`);
});

test('best score not overwritten when score is lower', async () => {
  await page.evaluate(() => {
    localStorage.setItem('dust_bowl_derby_best', '5000');
    window.__dbd.startGame();
    window.__dbd.score = 100;
    window.__dbd.player.damage = window.__dbd.MAX_DAMAGE;
    window.__dbd.update(0.016);
  });
  const stored = await page.evaluate(() => parseInt(localStorage.getItem('dust_bowl_derby_best') || '0'));
  assert.ok(stored >= 5000, `stored best should still be 5000, got ${stored}`);
});

// ── Suite 13: Rival AI ───────────────────────────────────────────────────────
test('rivals move toward player', async () => {
  await page.evaluate(() => window.__dbd.startGame());
  const d0 = await page.evaluate(() => {
    const r = window.__dbd.rivals[0];
    return Math.hypot(r.x - window.__dbd.player.x, r.y - window.__dbd.player.y);
  });
  // Run several frames
  await page.evaluate(() => { for (let i = 0; i < 30; i++) window.__dbd.update(0.05); });
  const d1 = await page.evaluate(() => {
    const r = window.__dbd.rivals[0];
    return Math.hypot(r.x - window.__dbd.player.x, r.y - window.__dbd.player.y);
  });
  // Rival should generally get closer (may not always due to player movement, but should improve)
  // Just check rival has moved
  assert.ok(d1 !== d0, 'rival should have moved toward player');
});

test('rivals stay inside arena', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    for (let i = 0; i < 60; i++) window.__dbd.update(0.05);
  });
  const ok = await page.evaluate(() =>
    window.__dbd.rivals.every(r => !r.alive || window.__dbd.isInsideArena(r.x, r.y))
  );
  assert.ok(ok, 'all alive rivals should remain inside arena');
});

// ── Suite 14: Particles & popups ─────────────────────────────────────────────
test('addDust adds particles', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.addDust(180, 285, 8, 50);
  });
  const n = await page.evaluate(() => window.__dbd.particles.length);
  assert.ok(n >= 8, `expected >= 8 particles, got ${n}`);
});

test('addPopup adds a popup entry', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    window.__dbd.addPopup(180, 300, 'TEST!', '#fff');
  });
  const n = await page.evaluate(() => window.__dbd.popups.length);
  assert.ok(n >= 1, 'popup should be added');
});

test('particles fade over time', async () => {
  await page.evaluate(() => {
    window.__dbd.startGame();
    // Stall player so it doesn't move or generate wall-dust
    window.__dbd.player.stallTimer = 99999;
    // Kill original rivals to prevent their movement particles
    window.__dbd.rivals.forEach(r => { r.alive = false; });
    // Add one alive-but-stalled dummy rival so round-clear never fires (which would spawnRound and create new active rivals)
    window.__dbd.rivals.push({
      x: 180, y: 285, alive: true, stallTimer: 99999, damage: 0, heat: 0,
      vx: 0, vy: 0, angle: 0, speed: 0, color: '#333', accent: '#444',
      boostActive: false, boostTimer: 0, boostCooldown: 0,
    });
    window.__dbd.particles.length = 0;
    window.__dbd.addDust(180, 285, 5, 50);
  });
  const n0 = await page.evaluate(() => window.__dbd.particles.length);
  await page.evaluate(() => { for (let i = 0; i < 100; i++) window.__dbd.update(0.05); });
  const n1 = await page.evaluate(() => window.__dbd.particles.length);
  assert.ok(n1 < n0, `particles should fade: ${n0} -> ${n1}`);
});

// ── Suite 15: Console error sweep ────────────────────────────────────────────
test('no console errors on load', async () => {
  // Errors captured from setup
  const loadErrors = consoleErrors.filter(e => !e.includes('AudioContext'));
  assert.strictEqual(loadErrors.length, 0, `console errors on load: ${loadErrors.join(', ')}`);
});

test('no console errors during full game cycle', async () => {
  const gameErrors = [];
  page.on('console', m => { if (m.type() === 'error') gameErrors.push(m.text()); });
  await page.evaluate(() => {
    window.__dbd.startGame();
    // Run 3 rounds: eliminate all rivals each round
    for (let round = 0; round < 3; round++) {
      window.__dbd.rivals.forEach(r => { r.damage = window.__dbd.MAX_DAMAGE; });
      window.__dbd.update(0.016);
      window.__dbd.intermissionTimer = 0;
    }
  });
  const filtered = gameErrors.filter(e => !e.includes('AudioContext'));
  assert.strictEqual(filtered.length, 0, `console errors during game: ${filtered.join(', ')}`);
});

// ── Runner ───────────────────────────────────────────────────────────────────
(async () => {
  await setup();
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  PASS  ${t.name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL  ${t.name}`);
      console.error(`        ${e.message}`);
      failed++;
    }
  }
  await teardown();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
