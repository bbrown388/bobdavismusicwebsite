// Playwright automation test for gone-fishin.html
// Simulates the full gameplay flow and reports state at each step.
// Run with: node test-gone-fishin.js

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const FILE  = 'file:///' + path.resolve(__dirname, 'gone-fishin.html').replace(/\\/g, '/');
const SHOTS = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

function log(label, data) {
  console.log(`\n── ${label} ──`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function getState(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('c');
    return {
      gameState:    typeof state       !== 'undefined' ? state       : 'UNDEFINED',
      score:        typeof score       !== 'undefined' ? score       : 'UNDEFINED',
      timeLeft:     typeof timeLeft    !== 'undefined' ? timeLeft    : 'UNDEFINED',
      castHeld:     typeof castHeld    !== 'undefined' ? castHeld    : 'UNDEFINED',
      castPower:    typeof castPower   !== 'undefined' ? +castPower.toFixed(3) : 'UNDEFINED',
      lureInWater:  typeof lure        !== 'undefined' ? lure.inWater : 'UNDEFINED',
      lureX:        typeof lure        !== 'undefined' ? +lure.x.toFixed(1) : 'UNDEFINED',
      lureY:        typeof lure        !== 'undefined' ? +lure.y.toFixed(1) : 'UNDEFINED',
      lureTargetY:  typeof lure        !== 'undefined' ? +lure.targetY.toFixed(1) : 'UNDEFINED',
      tension:      typeof tension     !== 'undefined' ? +tension.toFixed(1) : 'UNDEFINED',
      fishCount:    typeof fish        !== 'undefined' ? fish.length : 'UNDEFINED',
      hookedFish:   typeof hookedFish  !== 'undefined' ? !!hookedFish : 'UNDEFINED',
      castAnimActive: typeof castAnim  !== 'undefined' ? !!castAnim : 'UNDEFINED',
      canvasW:      cv ? cv.width : 0,
      canvasH:      cv ? cv.height : 0,
    };
  });
}

async function getConsoleErrors(page) {
  return page.evaluate(() => window.__errors || []);
}

async function shot(page, name) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  📸 ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: false,
  });
  const page = await ctx.newPage();

  // Capture console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('[PAGE ERROR] ' + err.message));

  // Inject error catcher before page loads
  await page.addInitScript(() => {
    window.__errors = [];
    window.addEventListener('error', e => window.__errors.push(e.message));
    window.addEventListener('unhandledrejection', e => window.__errors.push(String(e.reason)));
  });

  log('Opening game', { url: FILE });
  await page.goto(FILE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // ── Step 1: Title screen ──────────────────────────────────────────────────
  log('Step 1: Title screen');
  let s = await getState(page);
  log('State', s);
  await shot(page, '01-title');
  console.assert(s.gameState === 'title', `FAIL: expected 'title', got '${s.gameState}'`);
  if (s.gameState !== 'title') { console.error('FAILED at step 1'); process.exit(1); }
  console.log('  PASS: title screen');

  // ── Step 2: Short tap to start game ──────────────────────────────────────
  log('Step 2: Short tap (200×300) to start game');
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.waitForTimeout(100); // short tap < 220ms threshold
  await page.mouse.up();
  await page.waitForTimeout(300);

  s = await getState(page);
  log('State after tap', s);
  await shot(page, '02-after-start-tap');
  if (s.gameState !== 'casting') {
    console.error(`FAIL: expected 'casting' after tap, got '${s.gameState}'`);
    console.error('Console errors:', errors);
    await browser.close();
    process.exit(1);
  }
  console.log('  PASS: game started, state = casting');
  console.log(`  castHeld=${s.castHeld}, castPower=${s.castPower} (should be false/0)`);

  // ── Step 3: Check cast not auto-triggered ─────────────────────────────────
  await page.waitForTimeout(500);
  s = await getState(page);
  log('Step 3: 500ms later — checking state is still casting, not waiting');
  log('State', s);
  await shot(page, '03-still-casting');
  if (s.gameState !== 'casting') {
    console.error(`FAIL: state changed to '${s.gameState}' without user input — double-fire bug still active`);
    console.error('Console errors:', errors);
    await browser.close();
    process.exit(1);
  }
  console.log('  PASS: no accidental cast — state stays casting');

  // ── Step 4: Hold to charge power ─────────────────────────────────────────
  log('Step 4: Hold for 800ms to charge cast power');
  await page.mouse.move(200, 400);
  await page.mouse.down();
  await page.waitForTimeout(800);
  s = await getState(page);
  log('State mid-hold', s);
  await shot(page, '04-holding-casting');
  console.log(`  castHeld=${s.castHeld}, castPower=${s.castPower} (should be ~0.53)`);

  // ── Step 5: Release to cast ───────────────────────────────────────────────
  log('Step 5: Release mouse — launch cast');
  await page.mouse.up();
  await page.waitForTimeout(200);
  s = await getState(page);
  log('State immediately after release', s);
  await shot(page, '05-just-cast');
  if (s.gameState !== 'waiting') {
    console.error(`FAIL: expected 'waiting' after cast release, got '${s.gameState}'`);
    console.error('Console errors:', errors);
    await browser.close();
    process.exit(1);
  }
  console.log(`  PASS: state = waiting, castAnim=${s.castAnimActive}, lureInWater=${s.lureInWater}`);

  // ── Step 6: Wait for lure to land ────────────────────────────────────────
  log('Step 6: Waiting 1.2s for cast animation to complete');
  await page.waitForTimeout(1200);
  s = await getState(page);
  log('State after cast animation', s);
  await shot(page, '06-lure-in-water');
  console.log(`  castAnimActive=${s.castAnimActive} (should be false)`);
  console.log(`  lureInWater=${s.lureInWater} (should be true)`);
  console.log(`  lureX=${s.lureX}, lureY=${s.lureY}, targetY=${s.lureTargetY}`);
  if (!s.lureInWater) {
    console.error('FAIL: lure not in water after cast animation');
    console.error('Console errors:', errors);
    await browser.close();
    process.exit(1);
  }
  console.log('  PASS: lure is in water');

  // ── Step 7: Pixel sampling — check canvas is NOT blank ───────────────────
  log('Step 7: Pixel sampling — verifying canvas has visible content');
  const pixels = await page.evaluate(() => {
    const canvas = document.getElementById('c');
    const c = canvas.getContext('2d');
    const samples = [
      { label: 'HUD score area (top-left)',    x: 60,  y: 22  },
      { label: 'HUD timer area (top-right)',    x: 340, y: 22  },
      { label: 'Water surface (bobber zone)',   x: 180, y: 222 },
      { label: 'Sky (middle)',                  x: 180, y: 110 },
      { label: 'Deep water (mid)',              x: 180, y: 400 },
      { label: 'Bottom hint text',              x: 180, y: 620 },
    ];
    return samples.map(s => {
      const d = c.getImageData(s.x, s.y, 1, 1).data;
      return { ...s, rgba: [d[0], d[1], d[2], d[3]] };
    });
  });

  let blankCount = 0;
  for (const px of pixels) {
    const isBlack = px.rgba[0] < 10 && px.rgba[1] < 10 && px.rgba[2] < 10;
    const tag = isBlack ? '⚠ VERY DARK (possibly blank)' : '✓';
    console.log(`  ${tag} ${px.label}: rgba(${px.rgba.join(',')})`);
    if (isBlack) blankCount++;
  }
  if (blankCount > 3) {
    console.error(`FAIL: ${blankCount}/6 sampled pixels are near-black — canvas may be blank`);
  } else {
    console.log('  PASS: canvas has visible content (pixels vary)');
  }

  // ── Step 8: Wait for fish + bite ─────────────────────────────────────────
  log('Step 8: Waiting up to 12s for a fish to bite');
  let gotBite = false;
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(500);
    s = await getState(page);
    if (s.gameState === 'biting') { gotBite = true; break; }
    if (s.fishCount > 0 && i % 4 === 0) {
      console.log(`  t=${(i+1)*0.5}s — state=${s.gameState}, fish=${s.fishCount}, lureY=${s.lureY}`);
    }
  }
  await shot(page, '07-waiting-for-bite');
  if (gotBite) {
    log('State at bite', await getState(page));
    console.log('  PASS: fish bit the lure');

    // ── Step 9: Tap to hook ────────────────────────────────────────────────
    log('Step 9: Tap to hook fish');
    await page.mouse.move(200, 300);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(300);
    s = await getState(page);
    log('State after hook tap', s);
    await shot(page, '08-reeling');
    console.log(`  state=${s.gameState} (should be reeling), tension=${s.tension}`);
  } else {
    console.log('  NOTE: no bite in 12s window (fish may not have reached lure yet — this is normal)');
    s = await getState(page);
    console.log(`  Final state: ${s.gameState}, fish in scene: ${s.fishCount}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  log('Console errors captured', errors.length ? errors : ['none']);
  log('Screenshots saved to', { dir: SHOTS });
  log('DONE');

  await browser.close();
})().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
