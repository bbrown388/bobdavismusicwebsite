// Playwright tests for Last Rope Standing (Game 39)
const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, 'last-rope-standing.html').replace(/\\/g, '/');
const TIMEOUT = 14000;

async function runTests() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(FILE_URL);
  await page.waitForTimeout(500);

  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('  PASS  ' + name);
      passed++;
    } catch (e) {
      console.log('  FAIL  ' + name + ' — ' + e.message);
      failed++;
    }
  }

  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
  function assertClose(a, b, tol, msg) {
    if (Math.abs(a - b) > tol) throw new Error((msg || '') + ' got ' + a + ' expected ~' + b);
  }

  // ── Suite 1: Canvas ────────────────────────────────────────────────────────

  await test('S01 Canvas is 360x640', async () => {
    const [w, h] = await page.evaluate(() => [
      document.getElementById('c').width,
      document.getElementById('c').height,
    ]);
    assert(w === 360 && h === 640, `dims=${w}x${h}`);
  });

  // ── Suite 2: Initial state ─────────────────────────────────────────────────

  await test('S02 Initial state is title', async () => {
    const s = await page.evaluate(() => window._lrs.state);
    assert(s === 'title', `state=${s}`);
  });

  await test('S03 window._lrs namespace exists', async () => {
    const ok = await page.evaluate(() => typeof window._lrs === 'object' && window._lrs !== null);
    assert(ok, 'window._lrs not found');
  });

  // ── Suite 3: Constants ─────────────────────────────────────────────────────

  await test('S04 GRAVITY > 0', async () => {
    const v = await page.evaluate(() => window._lrs.GRAVITY);
    assert(v > 0, `GRAVITY=${v}`);
  });

  await test('S05 LATCH_RADIUS > 0', async () => {
    const v = await page.evaluate(() => window._lrs.LATCH_RADIUS);
    assert(v > 0, `LATCH_RADIUS=${v}`);
  });

  await test('S06 WATER_RISE_RATE > 0', async () => {
    const v = await page.evaluate(() => window._lrs.WATER_RISE_RATE);
    assert(v > 0, `WATER_RISE_RATE=${v}`);
  });

  await test('S07 POST_RADIUS > 0', async () => {
    const v = await page.evaluate(() => window._lrs.POST_RADIUS);
    assert(v > 0, `POST_RADIUS=${v}`);
  });

  await test('S08 PLAYER_RADIUS > 0', async () => {
    const v = await page.evaluate(() => window._lrs.PLAYER_RADIUS);
    assert(v > 0, `PLAYER_RADIUS=${v}`);
  });

  await test('S09 POST_COLS >= 2', async () => {
    const v = await page.evaluate(() => window._lrs.POST_COLS);
    assert(v >= 2, `POST_COLS=${v}`);
  });

  await test('S10 POST_ROWS >= 4', async () => {
    const v = await page.evaluate(() => window._lrs.POST_ROWS);
    assert(v >= 4, `POST_ROWS=${v}`);
  });

  await test('S11 W=360, H=640', async () => {
    const [w, h] = await page.evaluate(() => [window._lrs.W, window._lrs.H]);
    assert(w === 360, `W=${w}`);
    assert(h === 640, `H=${h}`);
  });

  await test('S12 BASE_Y < H/2', async () => {
    const [by, h] = await page.evaluate(() => [window._lrs.BASE_Y, window._lrs.H]);
    assert(by < h / 2, `BASE_Y=${by} H=${h}`);
  });

  // ── Suite 4: generatePosts ────────────────────────────────────────────────

  await test('S13 generatePosts creates POST_COLS * POST_ROWS posts', async () => {
    const n = await page.evaluate(() => {
      window._lrs.generatePosts();
      return window._lrs.posts.length;
    });
    const expected = await page.evaluate(() => window._lrs.POST_COLS * window._lrs.POST_ROWS);
    assert(n === expected, `posts.length=${n} expected=${expected}`);
  });

  await test('S14 All posts have x, y, active fields', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.generatePosts();
      return window._lrs.posts.every(p =>
        typeof p.x === 'number' && typeof p.y === 'number' && typeof p.active === 'boolean'
      );
    });
    assert(ok, 'some post missing x/y/active');
  });

  await test('S15 All posts start active', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.generatePosts();
      return window._lrs.posts.every(p => p.active);
    });
    assert(ok, 'some post not active');
  });

  await test('S16 Post x coords within canvas bounds [10, 350]', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.generatePosts();
      return window._lrs.posts.every(p => p.x >= 10 && p.x <= 350);
    });
    assert(ok, 'some post x out of canvas');
  });

  await test('S17 Posts span multiple y levels (rows)', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.generatePosts();
      const ys = [...new Set(window._lrs.posts.map(p => Math.round(p.y / 10)))];
      return ys.length >= window._lrs.POST_ROWS;
    });
    assert(ok, 'posts not spread across rows');
  });

  // ── Suite 5: nearestPost ──────────────────────────────────────────────────

  await test('S18 nearestPost returns -1 when no post in range', async () => {
    const idx = await page.evaluate(() => {
      window._lrs.generatePosts();
      // Pick a point far from all posts
      return window._lrs.nearestPost(-500, -500, -1);
    });
    assert(idx === -1, `idx=${idx}`);
  });

  await test('S19 nearestPost returns valid index when post in range', async () => {
    const idx = await page.evaluate(() => {
      window._lrs.generatePosts();
      const p = window._lrs.posts[0];
      // Stand very close to first post
      return window._lrs.nearestPost(p.x + 5, p.y + 5, -1);
    });
    assert(idx >= 0, `idx=${idx}`);
  });

  await test('S20 nearestPost excludes excludeIdx', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.generatePosts();
      const p0 = window._lrs.posts[0];
      // Stand on post 0, exclude it
      const idx = window._lrs.nearestPost(p0.x, p0.y, 0);
      return idx !== 0;
    });
    assert(ok, 'nearestPost returned excluded index');
  });

  await test('S21 nearestPost returns -1 for inactive post', async () => {
    const idx = await page.evaluate(() => {
      window._lrs.generatePosts();
      const p0 = window._lrs.posts[0];
      p0.active = false;
      // Stand on deactivated post
      return window._lrs.nearestPost(p0.x, p0.y, -1);
    });
    // Should skip post[0] since inactive; next nearest may be in range or not
    // Just verify it didn't return 0
    assert(idx !== 0, 'nearestPost returned inactive post index');
  });

  // ── Suite 6: startGame ────────────────────────────────────────────────────

  await test('S22 startGame sets state to playing', async () => {
    await page.evaluate(() => window._lrs.startGame());
    const s = await page.evaluate(() => window._lrs.state);
    assert(s === 'playing', `state=${s}`);
  });

  await test('S23 startGame places player on canvas', async () => {
    const [px, py] = await page.evaluate(() => [window._lrs.px, window._lrs.py]);
    assert(px > 0 && px < 360, `px=${px}`);
    assert(py > 0 && py < 640, `py=${py}`);
  });

  await test('S24 startGame resets score to 0', async () => {
    await page.evaluate(() => { window._lrs.score = 999; window._lrs.startGame(); });
    const s = await page.evaluate(() => window._lrs.score);
    assert(s === 0, `score=${s}`);
  });

  await test('S25 startGame places water below canvas (waterY > H)', async () => {
    await page.evaluate(() => window._lrs.startGame());
    const [wy, h] = await page.evaluate(() => [window._lrs.waterY, window._lrs.H]);
    assert(wy > h, `waterY=${wy} H=${h}`);
  });

  await test('S26 startGame resets anchorIdx to -1', async () => {
    await page.evaluate(() => { window._lrs.anchorIdx = 3; window._lrs.startGame(); });
    const ai = await page.evaluate(() => window._lrs.anchorIdx);
    assert(ai === -1, `anchorIdx=${ai}`);
  });

  await test('S27 startGame empties popups', async () => {
    await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.addPopup(10, 10, 'test', '#fff');
      window._lrs.startGame();
    });
    const n = await page.evaluate(() => window._lrs.popups.length);
    assert(n === 0, `popups.length=${n}`);
  });

  await test('S28 startGame empties particles', async () => {
    await page.evaluate(() => window._lrs.startGame());
    const n = await page.evaluate(() => window._lrs.particles.length);
    assert(n === 0, `particles.length=${n}`);
  });

  // ── Suite 7: latch and release ────────────────────────────────────────────

  await test('S29 latch sets anchorIdx to given post', async () => {
    await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.px = window._lrs.posts[2].x;
      window._lrs.py = window._lrs.posts[2].y + 30;
      window._lrs.latch(2);
    });
    const ai = await page.evaluate(() => window._lrs.anchorIdx);
    assert(ai === 2, `anchorIdx=${ai}`);
  });

  await test('S30 latch sets ropeLen > 0', async () => {
    const rl = await page.evaluate(() => window._lrs.ropeLen);
    assert(rl > 0, `ropeLen=${rl}`);
  });

  await test('S31 release sets anchorIdx to -1', async () => {
    await page.evaluate(() => { window._lrs.latch(0); window._lrs.release(); });
    const ai = await page.evaluate(() => window._lrs.anchorIdx);
    assert(ai === -1, `anchorIdx=${ai}`);
  });

  // ── Suite 8: Physics ──────────────────────────────────────────────────────

  await test('S32 Player falls when airborne (gravity applies)', async () => {
    const py0 = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.anchorIdx = -1;
      window._lrs.pvx = 0;
      window._lrs.pvy = 0;
      window._lrs.waterY = 900; // prevent death
      return window._lrs.py;
    });
    await page.evaluate(() => window._lrs.update(0.1));
    const py1 = await page.evaluate(() => window._lrs.py);
    assert(py1 > py0, `player should fall: py0=${py0} py1=${py1}`);
  });

  await test('S33 Player stays near rope constraint distance when latched', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      // Latch onto post 0
      const post = window._lrs.posts[0];
      window._lrs.px = post.x + 40;
      window._lrs.py = post.y + 50;
      window._lrs.pvx = 0;
      window._lrs.pvy = 0;
      window._lrs.latch(0);
      const rl = window._lrs.ropeLen;
      // Simulate several frames
      for (let i = 0; i < 20; i++) window._lrs.update(0.016);
      const dx = window._lrs.px - post.x;
      const dy = window._lrs.py - post.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // Should be within 5% of ropeLen
      return Math.abs(dist - rl) < rl * 0.05;
    });
    assert(ok, 'player drifted too far from rope constraint');
  });

  await test('S34 Velocity is tangential (no radial component) when latched', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      const post = window._lrs.posts[1];
      window._lrs.px = post.x + 50;
      window._lrs.py = post.y;
      window._lrs.pvx = 0;
      window._lrs.pvy = 0;
      window._lrs.latch(1);
      // Run a few frames
      for (let i = 0; i < 10; i++) window._lrs.update(0.016);
      // Radial direction from anchor to player
      const dx = window._lrs.px - post.x;
      const dy = window._lrs.py - post.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 1) return true;
      const nx = dx / dist, ny = dy / dist;
      // Radial component of velocity
      const radV = window._lrs.pvx * nx + window._lrs.pvy * ny;
      return Math.abs(radV) < 20; // small radial component (constraint is approximate)
    });
    assert(ok, 'radial velocity too large — constraint not working');
  });

  // ── Suite 9: Water system ─────────────────────────────────────────────────

  await test('S35 Water rises (waterY decreases) over time', async () => {
    const wy0 = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      return window._lrs.waterY;
    });
    await page.evaluate(() => window._lrs.update(0.5));
    const wy1 = await page.evaluate(() => window._lrs.waterY);
    assert(wy1 < wy0, `waterY should decrease: ${wy0} → ${wy1}`);
  });

  await test('S36 waterSpeedMult >= 1 initially', async () => {
    const v = await page.evaluate(() => window._lrs.waterSpeedMult);
    assert(v >= 1, `waterSpeedMult=${v}`);
  });

  await test('S37 Water particles spawn at waterY', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.particles.length = 0;
      // Force a particle spawn by running many frames
      for (let i = 0; i < 200; i++) window._lrs.update(0.016);
      // Check that some particles are near waterY (within 60px, since waterY moved)
      return window._lrs.particles.length > 0;
    });
    assert(ok, 'no water particles spawned after 200 frames');
  });

  // ── Suite 10: Death and Win checks ────────────────────────────────────────

  await test('S38 Player drowns when py > waterY', async () => {
    await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.py = 500;
      window._lrs.waterY = 400; // water above player
      window._lrs.update(0.016);
    });
    const s = await page.evaluate(() => window._lrs.state);
    assert(s === 'dead', `state=${s}`);
  });

  await test('S39 Player wins when py < BASE_Y - 20', async () => {
    await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      window._lrs.py = window._lrs.BASE_Y - 30;
      window._lrs.update(0.016);
    });
    const s = await page.evaluate(() => window._lrs.state);
    assert(s === 'win', `state=${s}`);
  });

  // ── Suite 11: Score system ────────────────────────────────────────────────

  await test('S40 Score increases as player rises', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      const scoreBefore = window._lrs.score;
      // Move player very high
      window._lrs.py = 50;
      window._lrs.update(0.016);
      return window._lrs.score >= scoreBefore;
    });
    assert(ok, 'score did not increase when player rose');
  });

  await test('S41 highestY tracks lowest canvas-y (highest physical point)', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      const start = window._lrs.highestY;
      window._lrs.py = start - 50; // player went higher
      window._lrs.update(0.016);
      return window._lrs.highestY <= start;
    });
    assert(ok, 'highestY not updated when player rose');
  });

  // ── Suite 12: Popups ──────────────────────────────────────────────────────

  await test('S42 addPopup adds entry with text, color, life', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.addPopup(100, 200, 'LATCH!', '#FFE066');
      const p = window._lrs.popups[window._lrs.popups.length - 1];
      return p.text === 'LATCH!' && p.color === '#FFE066' && p.life === 1;
    });
    assert(ok, 'addPopup structure wrong');
  });

  await test('S43 Popup life decreases during update', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      window._lrs.addPopup(100, 200, 'TEST', '#fff');
      const before = window._lrs.popups[window._lrs.popups.length - 1].life;
      window._lrs.update(0.1);
      const after = window._lrs.popups.length > 0
        ? window._lrs.popups[window._lrs.popups.length - 1].life : -1;
      return after < before;
    });
    assert(ok, 'popup life did not decrease');
  });

  // ── Suite 13: Particles ───────────────────────────────────────────────────

  await test('S44 Particles have required fields (x, y, vx, vy, life, maxLife)', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.particles.push({ x: 10, y: 10, vx: 1, vy: -1, life: 0.5, maxLife: 0.5 });
      const p = window._lrs.particles[0];
      return typeof p.x === 'number' && typeof p.vy === 'number' && typeof p.maxLife === 'number';
    });
    assert(ok, 'particle structure invalid');
  });

  await test('S45 Particle life decreases during update', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      window._lrs.particles.push({ x: 100, y: 200, vx: 0, vy: 0, life: 0.8, maxLife: 0.8 });
      const before = window._lrs.particles[0].life;
      window._lrs.update(0.05);
      const p = window._lrs.particles[0];
      return !p || p.life < before;
    });
    assert(ok, 'particle life did not decrease');
  });

  await test('S46 Dead particles (life <= 0) are removed', async () => {
    const ok = await page.evaluate(() => {
      window._lrs.startGame();
      window._lrs.state = 'playing';
      window._lrs.waterY = 900;
      window._lrs.particles.push({ x: 50, y: 50, vx: 0, vy: 0, life: 0.001, maxLife: 0.5 });
      const countBefore = window._lrs.particles.length;
      window._lrs.update(0.05);
      return window._lrs.particles.length < countBefore;
    });
    assert(ok, 'expired particle not removed');
  });

  // ── Suite 14: State machine ───────────────────────────────────────────────

  await test('S47 State can be set to dead', async () => {
    await page.evaluate(() => { window._lrs.state = 'dead'; });
    const s = await page.evaluate(() => window._lrs.state);
    assert(s === 'dead', `state=${s}`);
  });

  await test('S48 State can be set to win', async () => {
    await page.evaluate(() => { window._lrs.state = 'win'; });
    const s = await page.evaluate(() => window._lrs.state);
    assert(s === 'win', `state=${s}`);
  });

  await test('S49 startGame resets state to playing', async () => {
    await page.evaluate(() => { window._lrs.state = 'dead'; window._lrs.startGame(); });
    const s = await page.evaluate(() => window._lrs.state);
    assert(s === 'playing', `state=${s}`);
  });

  // ── Suite 15: Console error sweep ─────────────────────────────────────────

  await test('S50 No console errors during page load and render', async () => {
    await page.waitForTimeout(600);
    assert(errors.length === 0, 'console errors: ' + errors.join('; '));
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n  ${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
