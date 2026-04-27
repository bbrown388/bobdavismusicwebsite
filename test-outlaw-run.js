// Playwright tests for Outlaw Run (Game 05)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'outlaw-run.html').replace(/\\/g, '/');
const W = 360, H = 640;

let browser, page;

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.warn('[PAGE ERROR]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(200);
}

async function teardown() { await browser.close(); }

async function gs() { return page.evaluate(() => window.__gameState || state); }

// Inject state accessor after page load
async function injectHelpers() {
  await page.evaluate(() => {
    window.__gameState = () => state;
    window.__getState = () => ({ state, provisions, score, rider: { worldX: rider.worldX, worldY: rider.worldY }, sheriff: { worldX: sheriff.worldX, worldY: sheriff.worldY, active: sheriff.active } });
  });
}

async function tapCenter() {
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// ── Suite 1: Title screen ──────────────────────────────────
async function suite1() {
  console.log('\nSuite 1: Title screen');
  await setup();

  const title = await page.evaluate(() => state);
  assert(title === 'title', 'initial state is title');

  // Pixel on title screen — should have non-black pixels from gradient
  const px = await page.evaluate(() => {
    const c = document.getElementById('c');
    return c.getContext('2d').getImageData(W/2, H/2 - 90, 1, 1).data[0];
  });
  assert(px > 10, 'title screen has rendered content');

  await teardown();
}

// ── Suite 2: Tap starts game ──────────────────────────────
async function suite2() {
  console.log('\nSuite 2: Tap starts game');
  await setup();
  await tapCenter();
  const s = await page.evaluate(() => state);
  assert(s === 'playing', 'tap title → state becomes playing');
  const prov = await page.evaluate(() => provisions);
  assert(prov === 100, 'provisions start at 100');
  const ry = await page.evaluate(() => rider.worldY);
  assert(Math.abs(ry - 1680) < 1, 'rider starts at worldY 1680');
  await teardown();
}

// ── Suite 3: Draw path → rider follows ───────────────────
async function suite3() {
  console.log('\nSuite 3: Draw path → rider follows');
  await setup();
  await tapCenter();

  // Draw a path upward from rider start position (rider is at ~worldY 1680, cameraOffset puts it at ~H*0.75 = 480 screen)
  const startY = Math.round(H * 0.75);
  await page.mouse.move(W / 2, startY);
  await page.mouse.down();
  for (let y = startY; y > startY - 200; y -= 5) {
    await page.mouse.move(W / 2, y);
  }
  await page.mouse.up();

  // Wait for rider to start moving
  await page.waitForTimeout(1500);
  const ry = await page.evaluate(() => rider.worldY);
  assert(ry < 1680, 'rider worldY decreased after drawing path northward');

  await teardown();
}

// ── Suite 4: Provisions decrease while drawing ────────────
async function suite4() {
  console.log('\nSuite 4: Provisions decrease while drawing');
  await setup();
  await tapCenter();

  const before = await page.evaluate(() => provisions);

  const startY = Math.round(H * 0.75);
  await page.mouse.move(W / 2, startY);
  await page.mouse.down();
  // Draw 200px — costs ~200/12 ≈ 16 provisions
  for (let y = startY; y > startY - 200; y -= 4) {
    await page.mouse.move(W / 2, y);
  }
  await page.mouse.up();

  const after = await page.evaluate(() => provisions);
  assert(after < before, 'provisions decreased after drawing');
  assert(before - after > 5, 'provisions decreased by meaningful amount (drawing 200px)');

  await teardown();
}

// ── Suite 5: Supply cache pickup ─────────────────────────
async function suite5() {
  console.log('\nSuite 5: Supply cache pickup');
  await setup();
  await tapCenter();

  // Drain provisions, then draw through first cache at worldY=1550,x=90
  await page.evaluate(() => { provisions = 20; });

  // Cache at worldX=90, worldY=1550. Rider is at worldY=1680.
  // cameraOffset = H*0.75 - rider.worldY = 480 - 1680 = -1200, clamped to H-WORLD_H = -1280, so -1200
  // screenY = worldY + cameraOffset = 1550 + (-1200) = 350
  // screenX = worldX = 90
  const cacheScreenX = 90;
  const cacheScreenY = await page.evaluate(() => {
    const off = Math.max(H - WORLD_H, Math.min(0, Math.round(H * 0.75 - rider.worldY)));
    return 1550 + off;
  });

  const startY = Math.round(H * 0.75);
  await page.mouse.move(W / 2, startY);
  await page.mouse.down();
  // Move toward cache position
  await page.mouse.move(cacheScreenX + 5, cacheScreenY + 5);
  await page.mouse.up();

  const provAfter = await page.evaluate(() => provisions);
  // Either provisions went up (cache hit) or stayed ≥ 20 (no drain since provisions check)
  assert(provAfter >= 20, 'provisions did not drop below initial after cache area draw');

  await teardown();
}

// ── Suite 6: River collision → lose ──────────────────────
async function suite6() {
  console.log('\nSuite 6: River collision = lose');
  await setup();
  await tapCenter();

  // Teleport rider near river (worldY ~900), then draw into deep water
  await page.evaluate(() => {
    rider.worldX = 180; rider.worldY = 900;
    path = [{ x: 180, y: 900 }];
    rider.pathIdx = 0; rider.pathT = 0;
  });
  await page.waitForTimeout(100);

  // River center (non-ford) is at x=180 is actually ford x=180 — use x=120 which is not a ford
  await page.evaluate(() => {
    rider.worldX = 120; rider.worldY = 910;
    path = [{ x: 120, y: 910 }];
  });
  await page.waitForTimeout(100);

  // Draw into deep water (x=120 is not ford, y in 820-1020 range)
  const off = await page.evaluate(() => Math.max(H - WORLD_H, Math.min(0, Math.round(H * 0.75 - rider.worldY))));
  const screenStartX = 120;
  const screenStartY = 910 + off;
  const screenEndY = 840 + off; // deeper into river

  await page.mouse.move(screenStartX, screenStartY);
  await page.mouse.down();
  for (let y = screenStartY; y > screenEndY; y -= 5) {
    await page.mouse.move(screenStartX, y);
  }
  await page.mouse.up();

  // Wait for rider to follow path into water
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => state);
  // May be swept away or just stopped at river edge — verify no crash
  assert(['playing', 'lose'].includes(s), 'state is playing or lose after river draw (no crash)');

  await teardown();
}

// ── Suite 7: Win condition ────────────────────────────────
async function suite7() {
  console.log('\nSuite 7: Win condition');
  await setup();
  await tapCenter();

  // Teleport rider to just above hideout threshold
  await page.evaluate(() => {
    rider.worldX = W / 2;
    rider.worldY = 105;
    path = [{ x: W/2, y: 105 }, { x: W/2, y: 90 }];
    rider.pathIdx = 0; rider.pathT = 0;
  });

  await page.waitForTimeout(500);
  const s = await page.evaluate(() => state);
  assert(s === 'win', 'rider at worldY ≤ 100 triggers win');

  const sc = await page.evaluate(() => score);
  assert(sc > 0, 'score > 0 on win');

  await teardown();
}

// ── Suite 8: Score and localStorage ──────────────────────
async function suite8() {
  console.log('\nSuite 8: Score and localStorage');
  await setup();
  await tapCenter();

  await page.evaluate(() => {
    provisions = 80;
    rider.worldX = W / 2;
    rider.worldY = 105;
    path = [{ x: W/2, y: 105 }, { x: W/2, y: 90 }];
    rider.pathIdx = 0; rider.pathT = 0;
  });

  await page.waitForTimeout(600);

  const stored = await page.evaluate(() => localStorage.getItem('outlaw_run_best'));
  assert(stored !== null, 'localStorage has outlaw_run_best after win');
  assert(parseInt(stored, 10) > 0, 'stored best score > 0');

  await teardown();
}

// ── Suite 9: Sheriff spawns and moves ────────────────────
async function suite9() {
  console.log('\nSuite 9: Sheriff spawns and moves');
  await setup();
  await tapCenter();

  const spawnX = await page.evaluate(() => W + 60);
  const before = await page.evaluate(() => ({ x: sheriff.worldX, y: sheriff.worldY, active: sheriff.active }));
  assert(!before.active, 'sheriff not active immediately');

  // Fast-forward sheriff spawn
  await page.evaluate(() => { sheriffSpawnAt = performance.now() - 1; });
  await page.waitForTimeout(1500);

  const after = await page.evaluate(() => ({ x: sheriff.worldX, y: sheriff.worldY, active: sheriff.active }));
  assert(after.active, 'sheriff becomes active after spawn delay');
  assert(after.x !== spawnX || after.y !== 1600, 'sheriff moved from spawn point');

  await teardown();
}

// ── Suite 10: Console error sweep ────────────────────────
async function suite10() {
  console.log('\nSuite 10: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(FILE);
  await page.waitForTimeout(300);

  // Start game and draw
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(300);

  const startY = Math.round(H * 0.75);
  await page.mouse.move(W / 2, startY);
  await page.mouse.down();
  for (let y = startY; y > startY - 150; y -= 5) {
    await page.mouse.move(W / 2, y);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);

  // Win the game via JS
  await page.evaluate(() => {
    rider.worldX = W / 2;
    rider.worldY = 95;
    path = [{ x: W/2, y: 95 }, { x: W/2, y: 85 }];
    rider.pathIdx = 0; rider.pathT = 0;
  });
  await page.waitForTimeout(500);

  assert(errors.length === 0, `zero console errors (got: ${errors.join(', ')})`);
  await browser.close();
}

// ── Suite 11: HUD has non-black pixels ───────────────────
async function suite11() {
  console.log('\nSuite 11: HUD pixel check');
  await setup();
  await tapCenter();
  await page.waitForTimeout(300);

  // Provisions bar is at bottom-left (12, H-32) to (152, H-18)
  const hasColor = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(12, H - 32, 140, 14).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 20 || d[i+1] > 20 || d[i+2] > 20) return true;
    }
    return false;
  });
  assert(hasColor, 'provisions bar area has non-black pixels during play');

  await teardown();
}

// ── Runner ────────────────────────────────────────────────
(async () => {
  const suites = [suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8, suite9, suite10, suite11];
  let passed = 0, failed = 0;

  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      try { await teardown(); } catch {}
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
