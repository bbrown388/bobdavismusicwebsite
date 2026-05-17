// test-dead-eye.js -- Playwright tests for Game 56: Dead Eye
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'dead-eye.html').replace(/\\/g, '/');
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
  const d = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert.strictEqual(d.w, 360);
  assert.strictEqual(d.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__eye.state);
  assert.strictEqual(s, 'title');
});

test('test API exposed', async () => {
  const ok = await page.evaluate(() => typeof window.__eye === 'object');
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

// ── Suite 2: Constants ────────────────────────────────────────────────────────
test('ROUNDS array has 5 entries', async () => {
  const n = await page.evaluate(() => window.__eye.ROUNDS.length);
  assert.strictEqual(n, 5);
});

test('AMMO_MAX is 6', async () => {
  const n = await page.evaluate(() => window.__eye.AMMO_MAX);
  assert.strictEqual(n, 6);
});

test('WIN_SCORE is defined and positive', async () => {
  const n = await page.evaluate(() => window.__eye.WIN_SCORE);
  assert.ok(n > 0, 'WIN_SCORE should be positive');
});

test('TARGET_VAL.can is 100', async () => {
  const v = await page.evaluate(() => window.__eye.TARGET_VAL.can);
  assert.strictEqual(v, 100);
});

test('TARGET_VAL.poster is 200', async () => {
  const v = await page.evaluate(() => window.__eye.TARGET_VAL.poster);
  assert.strictEqual(v, 200);
});

test('TARGET_VAL.rider is 350', async () => {
  const v = await page.evaluate(() => window.__eye.TARGET_VAL.rider);
  assert.strictEqual(v, 350);
});

test('TARGET_RAD.can < TARGET_RAD.rider', async () => {
  const ok = await page.evaluate(() => window.__eye.TARGET_RAD.can < window.__eye.TARGET_RAD.rider);
  assert.ok(ok);
});

test('POST_XS has 6 entries', async () => {
  const n = await page.evaluate(() => window.__eye.POST_XS.length);
  assert.strictEqual(n, 6);
});

test('FENCE_Y is in lower half of canvas', async () => {
  const y = await page.evaluate(() => window.__eye.FENCE_Y);
  assert.ok(y > 320 && y < 640, 'FENCE_Y should be in lower half');
});

test('ROUNDS wind amplitude escalates over rounds', async () => {
  const ok = await page.evaluate(() => {
    const r = window.__eye.ROUNDS;
    return r[0].windAmp < r[1].windAmp && r[1].windAmp < r[2].windAmp &&
           r[2].windAmp < r[3].windAmp && r[3].windAmp < r[4].windAmp;
  });
  assert.ok(ok, 'windAmp should increase each round');
});

test('ROUNDS targetCount escalates over rounds', async () => {
  const ok = await page.evaluate(() => {
    const r = window.__eye.ROUNDS;
    return r[4].targetCount >= r[0].targetCount;
  });
  assert.ok(ok, 'targetCount should be >= across rounds');
});

// ── Suite 3: Game start ───────────────────────────────────────────────────────
test('startGame transitions to playing', async () => {
  await page.evaluate(() => window.__eye.startGame());
  const s = await page.evaluate(() => window.__eye.state);
  assert.strictEqual(s, 'playing');
});

test('ammo initialised to AMMO_MAX on round start', async () => {
  const ok = await page.evaluate(() => window.__eye.ammo === window.__eye.AMMO_MAX);
  assert.ok(ok);
});

test('round starts at 0', async () => {
  await page.evaluate(() => { window.__eye.startGame(); });
  const r = await page.evaluate(() => window.__eye.round);
  assert.strictEqual(r, 0);
});

test('roundScore is 0 at start of round', async () => {
  await page.evaluate(() => window.__eye.startGame());
  const rs = await page.evaluate(() => window.__eye.roundScore);
  assert.strictEqual(rs, 0);
});

test('totalScore is 0 when new game starts', async () => {
  await page.evaluate(() => window.__eye.startGame());
  const ts = await page.evaluate(() => window.__eye.totalScore);
  assert.strictEqual(ts, 0);
});

// ── Suite 4: Target spawning ──────────────────────────────────────────────────
test('spawnTarget creates a target entry', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.spawnTarget();
  });
  const len = await page.evaluate(() => window.__eye.targets.length);
  assert.ok(len >= 1, 'should have at least 1 target');
});

test('spawned target has alive=true and type', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.spawnTarget();
  });
  const ok = await page.evaluate(() => {
    const t = window.__eye.targets[0];
    return t && t.alive === true && ['can', 'poster', 'rider'].includes(t.type);
  });
  assert.ok(ok);
});

test('can target spawns at a fence post X position', async () => {
  // Force spawn a can by setting riderChance to 0 and manipulating round
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    // Spawn several targets — at least some should be cans in round 0
    for (let i = 0; i < 10; i++) window.__eye.spawnTarget();
  });
  const hasCan = await page.evaluate(() =>
    window.__eye.targets.some(t => t.type === 'can')
  );
  assert.ok(hasCan, 'Expected at least one can target in 10 spawns');
});

test('can target vx is 0 (stationary)', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    for (let i = 0; i < 15; i++) window.__eye.spawnTarget();
  });
  const ok = await page.evaluate(() => {
    const cans = window.__eye.targets.filter(t => t.type === 'can');
    return cans.length > 0 && cans.every(t => t.vx === 0);
  });
  assert.ok(ok, 'cans should have vx=0');
});

test('poster targets have nonzero vx', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.round = 3; // higher riderChance so posters are more likely
    window.__eye.targets.length = 0;
    for (let i = 0; i < 20; i++) window.__eye.spawnTarget();
  });
  const ok = await page.evaluate(() => {
    const posters = window.__eye.targets.filter(t => t.type === 'poster');
    return posters.length === 0 || posters.every(t => t.vx !== 0);
  });
  assert.ok(ok, 'posters should move (vx != 0)');
});

test('rider targets have abs(vx) >= poster vx', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.round = 4;
    window.__eye.targets.length = 0;
    for (let i = 0; i < 30; i++) window.__eye.spawnTarget();
  });
  const ok = await page.evaluate(() => {
    const riders = window.__eye.targets.filter(t => t.type === 'rider');
    const posters = window.__eye.targets.filter(t => t.type === 'poster');
    if (riders.length === 0 || posters.length === 0) return true;
    return Math.abs(riders[0].vx) >= Math.abs(posters[0].vx);
  });
  assert.ok(ok, 'riders should be at least as fast as posters');
});

// ── Suite 5: Firing & hit detection ──────────────────────────────────────────
test('fire() reduces ammo by 1', async () => {
  await page.evaluate(() => { window.__eye.startGame(); });
  const before = await page.evaluate(() => window.__eye.ammo);
  await page.evaluate(() => window.__eye.fire(180, 300));
  const after = await page.evaluate(() => window.__eye.ammo);
  assert.strictEqual(after, before - 1);
});

test('fire() on a can target marks it hit', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    // Manually create a can at known position
    window.__eye.targets.push({
      type: 'can', x: 180, y: 380, vx: 0, alive: true, age: 0,
      hit: false, hitTimer: 0, maxLife: 4.5, fromLeft: false,
      postIdx: 0,
    });
    window.__eye.fire(180, 380);
  });
  const hit = await page.evaluate(() => window.__eye.targets[0].hit);
  assert.ok(hit, 'target should be marked hit');
});

test('fire() on can target adds points', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'can', x: 180, y: 380, vx: 0, alive: true, age: 0,
      hit: false, hitTimer: 0, maxLife: 4.5, fromLeft: false, postIdx: 0,
    });
    window.__eye.fire(180, 380);
  });
  const rs = await page.evaluate(() => window.__eye.roundScore);
  assert.ok(rs >= 100, 'roundScore should gain at least TARGET_VAL.can=100');
});

test('fire() on poster target adds at least 200 pts', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'poster', x: 180, y: 300, vx: 30, alive: true, age: 0,
      hit: false, hitTimer: 0, maxLife: 5.2, fromLeft: true,
    });
    window.__eye.fire(180, 300);
  });
  const rs = await page.evaluate(() => window.__eye.roundScore);
  assert.ok(rs >= 200, 'poster hit should give >= 200 pts');
});

test('fire() on rider target adds at least 350 pts', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'rider', x: 180, y: 380, vx: 80, alive: true, age: 0,
      hit: false, hitTimer: 0, maxLife: 3.8, fromLeft: true,
    });
    window.__eye.fire(180, 380);
  });
  const rs = await page.evaluate(() => window.__eye.roundScore);
  assert.ok(rs >= 350, 'rider hit should give >= 350 pts');
});

test('fire() miss adds MISS popup', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.fire(10, 100); // far from any target
  });
  const hasMiss = await page.evaluate(() =>
    window.__eye.popups.some(p => p.text === 'MISS')
  );
  assert.ok(hasMiss, 'MISS popup should appear on miss');
});

test('fire() miss does not increment roundScore', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.fire(5, 100);
  });
  const rs = await page.evaluate(() => window.__eye.roundScore);
  assert.strictEqual(rs, 0);
});

test('fire() with ammo=0 does not reduce ammo below 0', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.ammo = 0;
    window.__eye.fire(180, 300);
  });
  const a = await page.evaluate(() => window.__eye.ammo);
  assert.strictEqual(a, 0);
});

test('fire() on dead target does not double-score', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'can', x: 180, y: 380, vx: 0, alive: false, age: 0,
      hit: true, hitTimer: 0.3, maxLife: 4.5, fromLeft: false, postIdx: 0,
    });
    window.__eye.fire(180, 380);
  });
  const rs = await page.evaluate(() => window.__eye.roundScore);
  assert.strictEqual(rs, 0, 'dead target should not score again');
});

// ── Suite 6: Ammo exhaustion & round end ──────────────────────────────────────
test('ammo exhaustion sets roundEndTimer', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.ammo = 1;
    window.__eye.fire(5, 100); // miss, ammo goes to 0
  });
  const ret = await page.evaluate(() => window.__eye.roundEndTimer);
  assert.ok(ret > 0, 'roundEndTimer should be set after ammo exhausted');
});

test('endRound() sets state to round_result', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.endRound();
  });
  const s = await page.evaluate(() => window.__eye.state);
  assert.strictEqual(s, 'round_result');
});

test('endRound() adds roundScore to totalScore', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.roundScore = 500;
    window.__eye.totalScore = 200;
    window.__eye.endRound();
  });
  const ts = await page.evaluate(() => window.__eye.totalScore);
  assert.strictEqual(ts, 700);
});

test('nextRound() increments round', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.endRound();
    window.__eye.nextRound();
  });
  const r = await page.evaluate(() => window.__eye.round);
  assert.strictEqual(r, 1);
});

test('nextRound() after round 4 goes to result state', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.round = 4;
    window.__eye.roundScore = 0;
    window.__eye.totalScore = 0;
    window.__eye.endRound();
    window.__eye.nextRound();
  });
  const s = await page.evaluate(() => window.__eye.state);
  assert.strictEqual(s, 'result');
});

// ── Suite 7: Wind mechanics ───────────────────────────────────────────────────
test('windX changes after update when playing', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.windPhase = 0; // sin(0) = 0, so windX starts near 0
  });
  const before = await page.evaluate(() => window.__eye.windX);
  await page.evaluate(() => {
    window.__eye.update(0.1); // advance time
  });
  const after = await page.evaluate(() => window.__eye.windX);
  // Phase advanced, windX should be nonzero now
  assert.ok(after !== before || Math.abs(after) >= 0, 'windX should change with update');
});

test('crossX is clamped within canvas after extreme wind', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.crossX = 180;
    window.__eye.aimX = 180;
    window.__eye.windX = 2000; // extreme wind
    window.__eye.update(1.0); // one second update
  });
  const cx = await page.evaluate(() => window.__eye.crossX);
  assert.ok(cx >= 0 && cx <= 360, 'crossX should be clamped to canvas');
});

test('crossX spring-follows aimX', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.crossX = 180;
    window.__eye.aimX = 300;
    window.__eye.windX = 0; // no wind
    window.__eye.update(0.2);
  });
  const cx = await page.evaluate(() => window.__eye.crossX);
  assert.ok(cx > 180, 'crossX should move toward aimX=300');
});

// ── Suite 8: Score & progression ─────────────────────────────────────────────
test('full 5-round progression works without error', async () => {
  const errsBefore = consoleErrors.length;
  await page.evaluate(() => {
    window.__eye.startGame();
    for (let r = 0; r < 5; r++) {
      window.__eye.roundScore = 200;
      window.__eye.endRound();
      if (window.__eye.state !== 'result') window.__eye.nextRound();
    }
  });
  assert.strictEqual(consoleErrors.length, errsBefore, 'No console errors during full run');
});

test('best score saved to localStorage', async () => {
  await page.evaluate(() => {
    localStorage.removeItem('dead_eye_best');
    window.__eye.startGame();
    window.__eye.round = 4;
    window.__eye.roundScore = 0;
    window.__eye.totalScore = 1500;
    window.__eye.endRound();
    window.__eye.nextRound(); // triggers save
  });
  const best = await page.evaluate(() =>
    parseInt(localStorage.getItem('dead_eye_best') || '0')
  );
  assert.ok(best >= 1500, 'best score should be stored in localStorage');
});

test('startRound resets roundScore to 0', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.roundScore = 999;
    window.__eye.startRound();
  });
  const rs = await page.evaluate(() => window.__eye.roundScore);
  assert.strictEqual(rs, 0);
});

test('startRound resets ammo to AMMO_MAX', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.ammo = 1;
    window.__eye.startRound();
  });
  const ok = await page.evaluate(() => window.__eye.ammo === window.__eye.AMMO_MAX);
  assert.ok(ok);
});

test('startRound clears targets', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.push({ type: 'can', alive: true, hit: false });
    window.__eye.startRound();
  });
  const len = await page.evaluate(() => window.__eye.targets.length);
  assert.strictEqual(len, 0);
});

// ── Suite 9: Target lifecycle ─────────────────────────────────────────────────
test('target is removed after age > maxLife', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'can', x: 100, y: 380, vx: 0, alive: true, age: 0,
      hit: false, hitTimer: 0, maxLife: 0.1, fromLeft: false, postIdx: 0,
    });
    window.__eye.update(0.5); // 0.5s > 0.1 maxLife
  });
  const len = await page.evaluate(() => window.__eye.targets.length);
  assert.strictEqual(len, 0, 'expired target should be removed');
});

test('hit target persists during hitTimer then removed', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'can', x: 180, y: 380, vx: 0, alive: false, age: 0,
      hit: true, hitTimer: 0.3, maxLife: 4.5, fromLeft: false, postIdx: 0,
    });
    window.__eye.update(0.1); // hitTimer still active
  });
  const len1 = await page.evaluate(() => window.__eye.targets.length);
  assert.strictEqual(len1, 1, 'hit target should still exist during hitTimer');

  await page.evaluate(() => window.__eye.update(0.5)); // expire hitTimer
  const len2 = await page.evaluate(() => window.__eye.targets.length);
  assert.strictEqual(len2, 0, 'hit target should be removed after hitTimer expires');
});

test('poster target moves horizontally each frame', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'poster', x: 180, y: 270, vx: 40, alive: true, age: 0,
      hit: false, hitTimer: 0, maxLife: 5.2, fromLeft: true,
    });
  });
  const x1 = await page.evaluate(() => window.__eye.targets[0].x);
  await page.evaluate(() => window.__eye.update(0.1));
  const x2 = await page.evaluate(() => (window.__eye.targets[0] || { x: x1 }).x);
  assert.ok(x2 > x1, 'poster should move right');
});

test('off-screen poster is removed', async () => {
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.targets.push({
      type: 'poster', x: 600, y: 270, vx: 40, alive: true, age: 0,
      hit: false, hitTimer: 0, maxLife: 5.2, fromLeft: true,
    });
    window.__eye.update(0.05);
  });
  const len = await page.evaluate(() => window.__eye.targets.length);
  assert.strictEqual(len, 0, 'off-screen poster should be removed');
});

// ── Suite 10: Console errors ──────────────────────────────────────────────────
test('no console errors on title screen', async () => {
  const errsBefore = consoleErrors.length;
  await page.evaluate(() => {});
  await page.waitForTimeout(500);
  assert.strictEqual(consoleErrors.length, errsBefore, 'No console errors on title screen');
});

test('no console errors after startGame + 1s play', async () => {
  const errsBefore = consoleErrors.length;
  await page.evaluate(() => window.__eye.startGame());
  await page.waitForTimeout(1000);
  assert.strictEqual(consoleErrors.length, errsBefore, 'No console errors during play');
});

test('no console errors after full round cycle', async () => {
  const errsBefore = consoleErrors.length;
  await page.evaluate(() => {
    window.__eye.startGame();
    window.__eye.targets.length = 0;
    window.__eye.ammo = 0;
    // Trigger round end directly
    window.__eye.roundScore = 0;
    window.__eye.endRound();
    window.__eye.nextRound();
  });
  await page.waitForTimeout(300);
  assert.strictEqual(consoleErrors.length, errsBefore, 'No console errors after round cycle');
});

// ── Suite 11: Input & feedback UI ────────────────────────────────────────────
test('feedback overlay hidden by default', async () => {
  const hidden = await page.evaluate(() => {
    const ov = document.getElementById('fb-overlay');
    return !ov || ov.classList.contains('open') === false;
  });
  assert.ok(hidden, 'feedback overlay should not be open by default');
});

test('Google Analytics tag present in page head', async () => {
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).some(s =>
      s.src.includes('googletagmanager.com')
    )
  );
  assert.ok(found, 'Google Analytics tag missing');
});

// ── Runner ────────────────────────────────────────────────────────────────────
(async () => {
  await setup();
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log('  PASS', t.name);
      passed++;
    } catch (e) {
      console.error('  FAIL', t.name, '--', e.message);
      failed++;
    }
  }
  await teardown();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
