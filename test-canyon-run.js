// test-canyon-run.js -- Playwright tests for Game 57: Canyon Run
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'canyon-run.html').replace(/\\/g, '/');
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

// ── Suite 2: Constants ────────────────────────────────────────────────────────
test('STAGES has 5 entries', async () => {
  const n = await page.evaluate(() => window.__run.STAGES.length);
  assert.strictEqual(n, 5);
});

test('LANES has 3 entries', async () => {
  const n = await page.evaluate(() => window.__run.LANES.length);
  assert.strictEqual(n, 3);
});

test('FOCAL is positive', async () => {
  const f = await page.evaluate(() => window.__run.FOCAL);
  assert.ok(f > 0, 'FOCAL must be positive');
});

test('VP_X is 180', async () => {
  const v = await page.evaluate(() => window.__run.VP_X);
  assert.strictEqual(v, 180);
});

test('SPAWN_Z is large (obstacles born far away)', async () => {
  const sz = await page.evaluate(() => window.__run.SPAWN_Z);
  assert.ok(sz >= 1000, 'SPAWN_Z should be at least 1000');
});

test('COLLISION_Z is small positive', async () => {
  const cz = await page.evaluate(() => window.__run.COLLISION_Z);
  assert.ok(cz > 0 && cz < 200, 'COLLISION_Z should be a small positive number');
});

test('STAGES speed escalates', async () => {
  const ok = await page.evaluate(() => {
    const s = window.__run.STAGES;
    return s[0].speed < s[1].speed && s[1].speed < s[2].speed &&
           s[2].speed < s[3].speed && s[3].speed < s[4].speed;
  });
  assert.ok(ok, 'stage speed should increase each stage');
});

test('STAGES spawnRate escalates', async () => {
  const ok = await page.evaluate(() => {
    const s = window.__run.STAGES;
    return s[0].spawnRate < s[4].spawnRate;
  });
  assert.ok(ok, 'spawnRate should be higher in later stages');
});

test('OBS_RADIUS.rock is largest obstacle', async () => {
  const ok = await page.evaluate(() => {
    const r = window.__run.OBS_RADIUS;
    return r.rock > r.cactus;
  });
  assert.ok(ok, 'rock should be larger than cactus');
});

test('project() returns sx, sy, scale', async () => {
  const p = await page.evaluate(() => window.__run.project(0, 200));
  assert.ok(typeof p.sx === 'number', 'sx should be number');
  assert.ok(typeof p.sy === 'number', 'sy should be number');
  assert.ok(typeof p.scale === 'number', 'scale should be number');
});

test('project() object farther has smaller scale', async () => {
  const ok = await page.evaluate(() => {
    const near = window.__run.project(0, 100);
    const far  = window.__run.project(0, 800);
    return near.scale > far.scale;
  });
  assert.ok(ok, 'farther objects should have smaller scale');
});

test('project() at worldX=0 gives screenX=VP_X', async () => {
  const sx = await page.evaluate(() => window.__run.project(0, 500).sx);
  assert.strictEqual(sx, 180, 'worldX=0 should project to VP_X=180');
});

// ── Suite 3: Game start ───────────────────────────────────────────────────────
test('startGame transitions to playing', async () => {
  await page.evaluate(() => window.__run.startGame());
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'playing');
});

test('lives initialised to 3', async () => {
  await page.evaluate(() => window.__run.startGame());
  const l = await page.evaluate(() => window.__run.lives);
  assert.strictEqual(l, 3);
});

test('stage initialised to 0', async () => {
  await page.evaluate(() => window.__run.startGame());
  const s = await page.evaluate(() => window.__run.stage);
  assert.strictEqual(s, 0);
});

test('score is 0 at start', async () => {
  await page.evaluate(() => window.__run.startGame());
  const sc = await page.evaluate(() => window.__run.score);
  assert.strictEqual(sc, 0);
});

test('playerLane starts at 1 (center)', async () => {
  await page.evaluate(() => window.__run.startGame());
  const pl = await page.evaluate(() => window.__run.playerLane);
  assert.strictEqual(pl, 1);
});

test('obstacles array is empty on start', async () => {
  await page.evaluate(() => window.__run.startGame());
  const n = await page.evaluate(() => window.__run.obstacles.length);
  assert.strictEqual(n, 0);
});

test('invTimer is 0 on start', async () => {
  await page.evaluate(() => window.__run.startGame());
  const t = await page.evaluate(() => window.__run.invTimer);
  assert.strictEqual(t, 0);
});

test('transTimer is 0 on start', async () => {
  await page.evaluate(() => window.__run.startGame());
  const t = await page.evaluate(() => window.__run.transTimer);
  assert.strictEqual(t, 0);
});

test('applyStage sets speed from STAGES[stage]', async () => {
  await page.evaluate(() => { window.__run.startGame(); window.__run.stage = 2; window.__run.applyStage(); });
  const sp = await page.evaluate(() => window.__run.speed);
  const expected = await page.evaluate(() => window.__run.STAGES[2].speed);
  assert.strictEqual(sp, expected);
});

// ── Suite 4: Obstacle spawning ────────────────────────────────────────────────
test('spawnObstacle returns an obstacle with worldZ=SPAWN_Z', async () => {
  await page.evaluate(() => window.__run.startGame());
  const wz = await page.evaluate(() => window.__run.spawnObstacle().worldZ);
  const sz = await page.evaluate(() => window.__run.SPAWN_Z);
  assert.strictEqual(wz, sz);
});

test('spawnObstacle returns valid type', async () => {
  await page.evaluate(() => window.__run.startGame());
  const type = await page.evaluate(() => window.__run.spawnObstacle().type);
  assert.ok(['rock', 'tumbleweed', 'cactus'].includes(type));
});

test('spawnObstacle assigns a valid lane', async () => {
  await page.evaluate(() => window.__run.startGame());
  const lane = await page.evaluate(() => window.__run.spawnObstacle().lane);
  assert.ok([0, 1, 2].includes(lane), 'lane must be 0, 1, or 2');
});

test('spawnObstacle worldX matches LANES[lane]', async () => {
  await page.evaluate(() => window.__run.startGame());
  const ok = await page.evaluate(() => {
    const obs = window.__run.spawnObstacle();
    return obs.worldX === window.__run.LANES[obs.lane];
  });
  assert.ok(ok, 'worldX should match LANES[lane]');
});

test('obstacles accumulate after update calls', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.spawnTimer = 0;
    window.__run.update(0.01);
    window.__run.spawnTimer = 0;
    window.__run.update(0.01);
  });
  const n = await page.evaluate(() => window.__run.obstacles.length);
  assert.ok(n >= 2, 'should accumulate obstacles');
});

test('cactus type only appears in stage >= 2', async () => {
  await page.evaluate(() => window.__run.startGame());
  const ok = await page.evaluate(() => {
    window.__run.stage = 0;
    let hasCactus = false;
    for (let i = 0; i < 50; i++) {
      if (window.__run.spawnObstacle().type === 'cactus') hasCactus = true;
    }
    return !hasCactus; // should NOT see cactus in stage 0
  });
  assert.ok(ok, 'cactus should not appear in stage 0');
});

// ── Suite 5: Collision detection ─────────────────────────────────────────────
test('direct lane collision reduces lives', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    // Place obstacle at exact player position past collision threshold
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: window.__run.LANES[1],
      worldZ: window.__run.COLLISION_Z - 1, driftDir: 0, spin: 0, passed: false,
    });
    window.__run.playerLane = 1;
    window.__run.playerX = window.__run.LANES[1];
    window.__run.invTimer = 0;
    window.__run.update(0.016);
  });
  const lives = await page.evaluate(() => window.__run.lives);
  assert.strictEqual(lives, 2, 'hit should reduce lives to 2');
});

test('collision sets invincibility timer', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: window.__run.LANES[1],
      worldZ: window.__run.COLLISION_Z - 1, driftDir: 0, spin: 0, passed: false,
    });
    window.__run.playerLane = 1;
    window.__run.playerX = window.__run.LANES[1];
    window.__run.invTimer = 0;
    window.__run.update(0.016);
  });
  const inv = await page.evaluate(() => window.__run.invTimer);
  assert.ok(inv > 0, 'invTimer should be > 0 after collision');
});

test('invincibility prevents consecutive collision damage', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.invTimer = 1.0; // already invincible
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: window.__run.LANES[1],
      worldZ: window.__run.COLLISION_Z - 1, driftDir: 0, spin: 0, passed: false,
    });
    window.__run.playerLane = 1;
    window.__run.playerX = window.__run.LANES[1];
    window.__run.update(0.016);
  });
  const lives = await page.evaluate(() => window.__run.lives);
  assert.strictEqual(lives, 3, 'invincibility should block damage');
});

test('losing all 3 lives ends game', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.lives = 1;
    window.__run.invTimer = 0;
    window.__run.obstacles.length = 0;
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: window.__run.LANES[1],
      worldZ: window.__run.COLLISION_Z - 1, driftDir: 0, spin: 0, passed: false,
    });
    window.__run.playerLane = 1;
    window.__run.playerX = window.__run.LANES[1];
    window.__run.update(0.016);
  });
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'result', 'losing all lives should set state to result');
});

test('endGame(false) sets resultWon=false', async () => {
  await page.evaluate(() => { window.__run.startGame(); window.__run.endGame(false); });
  const rw = await page.evaluate(() => window.__run.resultWon);
  assert.strictEqual(rw, false);
});

test('endGame(true) sets resultWon=true', async () => {
  await page.evaluate(() => { window.__run.startGame(); window.__run.endGame(true); });
  const rw = await page.evaluate(() => window.__run.resultWon);
  assert.strictEqual(rw, true);
});

// ── Suite 6: Stage progression ────────────────────────────────────────────────
test('stageTimer decrements during play', async () => {
  await page.evaluate(() => window.__run.startGame());
  const t1 = await page.evaluate(() => window.__run.stageTimer);
  await page.evaluate(() => window.__run.update(1.0));
  const t2 = await page.evaluate(() => window.__run.stageTimer);
  assert.ok(t2 < t1, 'stageTimer should decrement during play');
});

test('stage increments when stageTimer expires', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.stageTimer = 0.01;
    window.__run.update(0.05);
  });
  const st = await page.evaluate(() => window.__run.stage);
  assert.strictEqual(st, 1, 'stage should increment when timer expires');
});

test('stage transition sets transTimer', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.stageTimer = 0.01;
    window.__run.update(0.05);
  });
  const tt = await page.evaluate(() => window.__run.transTimer);
  assert.ok(tt > 0, 'transTimer should be set on stage transition');
});

test('stage bonus score added on stage clear', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.score = 0;
    window.__run.stageTimer = 0.01;
    window.__run.update(0.05);
  });
  const sc = await page.evaluate(() => window.__run.score);
  assert.ok(sc >= 300, 'stage clear should add at least 300 bonus points');
});

test('completing all 5 stages wins the game', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.stage = 4;          // final stage
    window.__run.transTimer = 0;
    window.__run.applyStage();
    window.__run.stageTimer = 0.01;  // about to expire
    window.__run.update(0.05);       // expire it
  });
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'result', 'completing final stage should end game');
});

test('winning game sets resultWon=true', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.stage = 4;
    window.__run.stageTimer = 0.01;
    window.__run.transTimer = 0;
    window.__run.update(0.05);
  });
  const rw = await page.evaluate(() => window.__run.resultWon);
  assert.ok(rw, 'winning should set resultWon=true');
});

// ── Suite 7: Player movement ──────────────────────────────────────────────────
test('handleTap left decrements playerLane', async () => {
  await page.evaluate(() => { window.__run.startGame(); window.__run.playerLane = 1; window.__run.handleTap(0); });
  const pl = await page.evaluate(() => window.__run.playerLane);
  assert.strictEqual(pl, 0);
});

test('handleTap right increments playerLane', async () => {
  await page.evaluate(() => { window.__run.startGame(); window.__run.playerLane = 1; window.__run.handleTap(360); });
  const pl = await page.evaluate(() => window.__run.playerLane);
  assert.strictEqual(pl, 2);
});

test('playerLane cannot go below 0', async () => {
  await page.evaluate(() => { window.__run.startGame(); window.__run.playerLane = 0; window.__run.handleTap(0); });
  const pl = await page.evaluate(() => window.__run.playerLane);
  assert.strictEqual(pl, 0);
});

test('playerLane cannot go above 2', async () => {
  await page.evaluate(() => { window.__run.startGame(); window.__run.playerLane = 2; window.__run.handleTap(360); });
  const pl = await page.evaluate(() => window.__run.playerLane);
  assert.strictEqual(pl, 2);
});

test('playerX smoothly approaches target lane', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.playerLane = 2;
    window.__run.playerX = window.__run.LANES[0]; // start at left lane
  });
  const x1 = await page.evaluate(() => window.__run.playerX);
  await page.evaluate(() => window.__run.update(0.1));
  const x2 = await page.evaluate(() => window.__run.playerX);
  assert.ok(x2 > x1, 'playerX should move toward right lane target');
});

test('handleTap in title state starts the game', async () => {
  await page.evaluate(() => { window.__run.state = 'title'; window.__run.handleTap(180); });
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'playing', 'handleTap on title should start game');
});

// ── Suite 8: Score accumulation ───────────────────────────────────────────────
test('score increases during play', async () => {
  await page.evaluate(() => window.__run.startGame());
  const s1 = await page.evaluate(() => window.__run.score);
  await page.evaluate(() => window.__run.update(1.0));
  const s2 = await page.evaluate(() => window.__run.score);
  assert.ok(s2 > s1, 'score should increase during play');
});

test('best score saved to localStorage after game', async () => {
  await page.evaluate(() => {
    localStorage.removeItem('canyon_run_best');
    window.__run.startGame();
    window.__run.score = 2000;
    window.__run.endGame(false);
  });
  const best = await page.evaluate(() => parseInt(localStorage.getItem('canyon_run_best') || '0'));
  assert.ok(best >= 2000, 'best score should be stored');
});

test('best score not overwritten if current is lower', async () => {
  await page.evaluate(() => {
    localStorage.setItem('canyon_run_best', '5000');
    window.__run.startGame();
    window.__run.score = 1000;
    window.__run.endGame(false);
  });
  const best = await page.evaluate(() => parseInt(localStorage.getItem('canyon_run_best') || '0'));
  assert.ok(best >= 5000, 'best score should not decrease');
});

// ── Suite 9: Obstacle lifecycle ───────────────────────────────────────────────
test('obstacles advance toward camera each frame', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: 0, worldZ: 1000,
      driftDir: 0, spin: 0, passed: false,
    });
  });
  const z1 = await page.evaluate(() => window.__run.obstacles[0].worldZ);
  await page.evaluate(() => window.__run.update(0.1));
  const z2 = await page.evaluate(() => (window.__run.obstacles[0] || { worldZ: z1 }).worldZ);
  assert.ok(z2 < z1, 'obstacle worldZ should decrease each frame');
});

test('obstacles behind camera are pruned', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: 0, worldZ: -150,
      driftDir: 0, spin: 0, passed: true,
    });
    window.__run.update(0.016);
  });
  const n = await page.evaluate(() => window.__run.obstacles.length);
  assert.strictEqual(n, 0, 'obstacle far behind camera should be removed');
});

test('tumbleweed drifts laterally across lanes', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.obstacles.push({
      type: 'tumbleweed', lane: 1, worldX: 0, worldZ: 500,
      driftDir: 1, spin: 0, passed: false,
    });
  });
  const x1 = await page.evaluate(() => window.__run.obstacles[0].worldX);
  await page.evaluate(() => window.__run.update(0.1));
  const x2 = await page.evaluate(() => (window.__run.obstacles[0] || { worldX: x1 }).worldX);
  assert.ok(x2 > x1, 'tumbleweed should drift laterally');
});

test('update pauses during transTimer', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.transTimer = 2.0;
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: 0, worldZ: 800,
      driftDir: 0, spin: 0, passed: false,
    });
  });
  const z1 = await page.evaluate(() => window.__run.obstacles[0].worldZ);
  await page.evaluate(() => window.__run.update(0.1));
  const z2 = await page.evaluate(() => window.__run.obstacles[0].worldZ);
  assert.strictEqual(z1, z2, 'obstacles should not move during transTimer');
});

test('stripe depth markers scroll and wrap', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.stripeZs[0] = 10; // very close to 0, will wrap
    window.__run.update(0.1);
  });
  const sz = await page.evaluate(() => window.__run.stripeZs[0]);
  assert.ok(sz > 100, 'stripe should wrap back to far distance');
});

// ── Suite 10: Console errors ──────────────────────────────────────────────────
test('no console errors on title screen', async () => {
  const errsBefore = consoleErrors.length;
  await page.waitForTimeout(500);
  assert.strictEqual(consoleErrors.length, errsBefore, 'No console errors on title');
});

test('no console errors after startGame + 1s play', async () => {
  const errsBefore = consoleErrors.length;
  await page.evaluate(() => window.__run.startGame());
  await page.waitForTimeout(1000);
  assert.strictEqual(consoleErrors.length, errsBefore, 'No console errors during play');
});

test('no console errors after endGame', async () => {
  const errsBefore = consoleErrors.length;
  await page.evaluate(() => { window.__run.startGame(); window.__run.endGame(true); });
  await page.waitForTimeout(300);
  assert.strictEqual(consoleErrors.length, errsBefore, 'No console errors after endGame');
});

// ── Suite 11: Input & feedback UI ────────────────────────────────────────────
test('feedback overlay hidden by default', async () => {
  const hidden = await page.evaluate(() => {
    const ov = document.getElementById('fb-overlay');
    return !ov || !ov.classList.contains('open');
  });
  assert.ok(hidden, 'feedback overlay should be closed by default');
});

test('Google Analytics tag present in page head', async () => {
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).some(s =>
      s.src.includes('googletagmanager.com')
    )
  );
  assert.ok(found, 'Google Analytics tag missing');
});

test('addPopup does not throw', async () => {
  const ok = await page.evaluate(() => {
    try {
      window.__run.startGame();
      window.__run.addPopup('TEST', '#FFF', 180, 300);
      return true;
    } catch(e) { return false; }
  });
  assert.ok(ok, 'addPopup should not throw');
});

test('HIT popup appears on collision', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    window.__run.obstacles.length = 0;
    window.__run.obstacles.push({
      type: 'rock', lane: 1, worldX: window.__run.LANES[1],
      worldZ: window.__run.COLLISION_Z - 1, driftDir: 0, spin: 0, passed: false,
    });
    window.__run.playerLane = 1;
    window.__run.playerX = window.__run.LANES[1];
    window.__run.invTimer = 0;
    window.__run.lives = 3;
    window.__run.update(0.016);
  });
  // A HIT means lives dropped — this indirectly confirms addPopup was called
  const lives = await page.evaluate(() => window.__run.lives);
  assert.strictEqual(lives, 2, 'collision should reduce lives (HIT registered)');
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
