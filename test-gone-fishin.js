// Playwright automation test for gone-fishin.html
// Simulates the full gameplay flow and reports state at each step.
// Run with: node test-gone-fishin.js

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const FILE  = 'file:///' + path.resolve(__dirname, 'gone-fishin.html').replace(/\\/g, '/');
const SHOTS = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

let totalPass = 0;
let totalFail = 0;

function log(label, data) {
  console.log(`\n── ${label} ──`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function pass(msg) { totalPass++; console.log(`  PASS: ${msg}`); }
function fail(msg) { totalFail++; console.error(`  FAIL: ${msg}`); }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

async function getState(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('c');
    return {
      gameState:    typeof state        !== 'undefined' ? state        : 'UNDEFINED',
      score:        typeof score        !== 'undefined' ? score        : 'UNDEFINED',
      timeLeft:     typeof timeLeft     !== 'undefined' ? timeLeft     : 'UNDEFINED',
      castHeld:     typeof castHeld     !== 'undefined' ? castHeld     : 'UNDEFINED',
      castPower:    typeof castPower    !== 'undefined' ? +castPower.toFixed(3) : 'UNDEFINED',
      lureInWater:  typeof lure         !== 'undefined' ? lure.inWater : 'UNDEFINED',
      lureX:        typeof lure         !== 'undefined' ? +lure.x.toFixed(1) : 'UNDEFINED',
      lureY:        typeof lure         !== 'undefined' ? +lure.y.toFixed(1) : 'UNDEFINED',
      lureTargetY:  typeof lure         !== 'undefined' ? +lure.targetY.toFixed(1) : 'UNDEFINED',
      lureTargetX:  typeof lure         !== 'undefined' ? +lure.targetX.toFixed(1) : 'UNDEFINED',
      reelProgress: typeof reelProgress !== 'undefined' ? +reelProgress.toFixed(1) : 'UNDEFINED',
      fishFighting: typeof fishFighting !== 'undefined' ? fishFighting : 'UNDEFINED',
      fishCount:    typeof fish         !== 'undefined' ? fish.length : 'UNDEFINED',
      hookedFish:   typeof hookedFish   !== 'undefined' ? !!hookedFish : 'UNDEFINED',
      castAnimActive: typeof castAnim   !== 'undefined' ? !!castAnim : 'UNDEFINED',
      canvasW:      cv ? cv.width : 0,
      canvasH:      cv ? cv.height : 0,
    };
  });
}

async function shot(page, name) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  📸 ${name}.png`);
}

async function castAndWait(page, holdMs = 800) {
  await page.mouse.move(200, 400);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.waitForTimeout(1300); // wait for lure to land
}

async function waitForState(page, targetState, timeoutMs = 12000) {
  const interval = 300;
  for (let elapsed = 0; elapsed < timeoutMs; elapsed += interval) {
    await page.waitForTimeout(interval);
    const s = await getState(page);
    if (s.gameState === targetState) return s;
  }
  return await getState(page);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: false,
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('[PAGE ERROR] ' + err.message));

  await page.addInitScript(() => {
    window.__errors = [];
    window.addEventListener('error', e => window.__errors.push(e.message));
    window.addEventListener('unhandledrejection', e => window.__errors.push(String(e.reason)));
  });

  log('Opening game', { url: FILE });
  await page.goto(FILE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 1: Title → Start → Cast → Wait
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 1: Title → Start → Cast → Wait');

  let s = await getState(page);
  await shot(page, '01-title');
  assert(s.gameState === 'title', `title screen active (got '${s.gameState}')`);

  // Short tap starts game
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(300);

  s = await getState(page);
  await shot(page, '02-after-start-tap');
  assert(s.gameState === 'casting', `tap starts game → casting (got '${s.gameState}')`);
  assert(s.castHeld === false, `no accidental castHeld after start tap`);
  assert(s.castPower === 0, `castPower reset to 0 after start tap`);

  // No accidental cast after 500ms
  await page.waitForTimeout(500);
  s = await getState(page);
  assert(s.gameState === 'casting', `state stays casting without input (got '${s.gameState}')`);

  // Hold to charge power
  await page.mouse.move(200, 400);
  await page.mouse.down();
  await page.waitForTimeout(800);
  s = await getState(page);
  await shot(page, '03-holding-casting');
  assert(s.castHeld === true, `castHeld=true during hold`);
  assert(s.castPower > 0.4 && s.castPower < 0.7, `castPower ~0.53 after 800ms hold (got ${s.castPower})`);

  // Release → waiting
  await page.mouse.up();
  await page.waitForTimeout(200);
  s = await getState(page);
  await shot(page, '04-just-cast');
  assert(s.gameState === 'waiting', `release → state=waiting (got '${s.gameState}')`);
  assert(s.castAnimActive === true, `cast animation active after release`);

  // Lure lands
  await page.waitForTimeout(1300);
  s = await getState(page);
  await shot(page, '05-lure-landed');
  assert(s.lureInWater === true, `lure in water after cast animation`);
  assert(s.castAnimActive === false, `cast animation cleared after lure lands`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 2: Depth targeting — press Y affects lure.targetY
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 2: Depth targeting');

  // Tap to retrieve current lure
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(200);
  s = await getState(page);
  assert(s.gameState === 'casting', `tap while waiting → retrieve → casting (got '${s.gameState}')`);
  assert(s.lureInWater === false, `lure.inWater reset after retrieve`);

  // Cast pressing HIGH on screen (shallow — Y near top of water)
  // WATER_Y=220, canvas scale=844/640≈1.32 → tapY on canvas = clientY/scale
  // Press at clientY=340 → canvasY ≈ 340*(640/844) ≈ 258 → just below water
  await page.mouse.move(200, 340);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.waitForTimeout(1300);
  const shallowState = await getState(page);
  const shallowTargetY = shallowState.lureTargetY;
  await shot(page, '06-shallow-cast');
  console.log(`  Shallow cast: press Y=340 → lure.targetY=${shallowTargetY}`);

  // Tap retrieve
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(200);

  // Cast pressing LOW on screen (deep)
  await page.mouse.move(200, 750);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.waitForTimeout(1300);
  const deepState = await getState(page);
  const deepTargetY = deepState.lureTargetY;
  await shot(page, '07-deep-cast');
  console.log(`  Deep cast: press Y=750 → lure.targetY=${deepTargetY}`);

  assert(deepTargetY > shallowTargetY, `deeper press → deeper target (deep=${deepTargetY} > shallow=${shallowTargetY})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 3: Cast distance — short vs long hold → different X landing
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 3: Cast distance (hold duration)');

  // Tap retrieve current lure
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(200);

  // Short hold → should land closer
  await page.mouse.move(200, 500);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.waitForTimeout(1300);
  const shortHoldState = await getState(page);
  const shortTargetX = shortHoldState.lureTargetX;

  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(200);

  // Long hold → should land farther right
  await page.mouse.move(200, 500);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.waitForTimeout(1300);
  const longHoldState = await getState(page);
  const longTargetX = longHoldState.lureTargetX;

  await shot(page, '08-distance-comparison');
  console.log(`  Short hold (300ms) → targetX=${shortTargetX}`);
  console.log(`  Long  hold (1200ms) → targetX=${longTargetX}`);
  assert(longTargetX > shortTargetX, `longer hold → farther X (long=${longTargetX} > short=${shortTargetX})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 4: Reel mechanic — tap to reel, progress decreases, no console errors
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 4: Reel mechanic (regression for tension-undefined crash)');

  // Retrieve and cast fresh
  await page.mouse.move(200, 300);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(200);

  await castAndWait(page, 800);
  s = await getState(page);
  assert(s.lureInWater === true, `lure in water before bite wait`);

  // Wait up to 15s for a bite
  log('Waiting up to 15s for bite');
  let gotBite = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    s = await getState(page);
    if (s.gameState === 'biting') { gotBite = true; break; }
  }
  await shot(page, '09-bite-wait');

  if (!gotBite) {
    console.log('  NOTE: no bite in 15s — skipping reel sub-tests');
  } else {
    assert(s.gameState === 'biting', `fish bit → state=biting`);

    // Tap to hook
    await page.mouse.move(200, 300);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(100);
    s = await getState(page);
    await shot(page, '10-hooked');
    assert(s.gameState === 'reeling', `tap during biting → state=reeling (got '${s.gameState}')`);
    assert(s.hookedFish === true, `hookedFish set after hook tap`);
    assert(s.reelProgress === 100, `reelProgress starts at 100 (got ${s.reelProgress})`);

    // Check for console errors NOW (the tension-undefined bug would have fired by this point)
    const errorsAtHook = await page.evaluate(() => window.__errors || []);
    assert(errorsAtHook.length === 0, `no JS errors when entering reeling state (regression: tension undefined)`);

    // Tap 3x to reel — verify progress decreases each time
    const progressBefore = s.reelProgress;
    for (let i = 0; i < 3; i++) {
      // Skip tap if fish is fighting (wait it out)
      let fs = await getState(page);
      if (fs.fishFighting) {
        console.log(`  Waiting for fight to end before tap ${i+1}...`);
        for (let w = 0; w < 20; w++) {
          await page.waitForTimeout(200);
          fs = await getState(page);
          if (!fs.fishFighting) break;
        }
      }
      await page.mouse.move(200, 300);
      await page.mouse.down();
      await page.waitForTimeout(60);
      await page.mouse.up();
      await page.waitForTimeout(150);
    }
    s = await getState(page);
    await shot(page, '11-reeling');
    assert(s.reelProgress < 100, `reelProgress decreased after 3 taps (got ${s.reelProgress}, started at 100)`);
    assert(s.gameState === 'reeling', `still reeling after 3 taps (got '${s.gameState}')`);

    // Verify HUD is rendered (pixel at bottom center should show reel progress bar content)
    const reelPixels = await page.evaluate(() => {
      const canvas = document.getElementById('c');
      const c = canvas.getContext('2d');
      // Bottom strip where reel bar lives (HUD at H-44 = 596)
      const samples = [
        { label: 'Reel bar area',     x: 100, y: 596 },
        { label: 'TAP label area',    x: 180, y: 320 },
      ];
      return samples.map(s => {
        const d = c.getImageData(s.x, s.y, 1, 1).data;
        return { ...s, rgba: [d[0], d[1], d[2], d[3]] };
      });
    });
    let hudVisible = false;
    for (const px of reelPixels) {
      const isBlack = px.rgba[0] < 10 && px.rgba[1] < 10 && px.rgba[2] < 10;
      console.log(`  ${isBlack ? '⚠ DARK' : '✓'} ${px.label}: rgba(${px.rgba.join(',')})`);
      if (!isBlack) hudVisible = true;
    }
    assert(hudVisible, `HUD/reel-bar pixels have content during reeling (regression: drawHUD skipped on error)`);

    // Reel all the way in — tap up to 20 more times to catch
    log('Reeling to catch');
    let caught = false;
    for (let i = 0; i < 25; i++) {
      s = await getState(page);
      if (s.gameState === 'casting') { caught = true; break; }
      if (s.gameState !== 'reeling') break;
      if (s.fishFighting) {
        await page.waitForTimeout(300);
        continue;
      }
      await page.mouse.move(200, 300);
      await page.mouse.down();
      await page.waitForTimeout(60);
      await page.mouse.up();
      await page.waitForTimeout(120);
    }
    s = await getState(page);
    await shot(page, '12-after-catch');
    if (caught || s.gameState === 'casting') {
      assert(s.gameState === 'casting', `fish caught → back to casting`);
      assert(s.score > 0, `score increased after catch (got ${s.score})`);
      assert(s.hookedFish === false, `hookedFish cleared after catch`);
      assert(s.lureInWater === false, `lure reset after catch`);
    } else {
      console.log(`  NOTE: did not catch in 25 tap attempts — state=${s.gameState}, reelProgress=${s.reelProgress}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 5: Canvas pixel content — not blank across full gameplay
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 5: Canvas pixel sampling');
  s = await getState(page);
  await shot(page, '13-pixel-check');
  const pixels = await page.evaluate(() => {
    const canvas = document.getElementById('c');
    const c = canvas.getContext('2d');
    const samples = [
      { label: 'HUD score (top-left)',   x: 60,  y: 22  },
      { label: 'HUD timer (top-right)',  x: 340, y: 22  },
      { label: 'Water surface',          x: 180, y: 222 },
      { label: 'Sky mid',                x: 180, y: 110 },
      { label: 'Deep water',             x: 180, y: 400 },
      { label: 'Bottom hint',            x: 180, y: 620 },
    ];
    return samples.map(s => {
      const d = c.getImageData(s.x, s.y, 1, 1).data;
      return { ...s, rgba: [d[0], d[1], d[2], d[3]] };
    });
  });
  let blankCount = 0;
  for (const px of pixels) {
    const isBlack = px.rgba[0] < 10 && px.rgba[1] < 10 && px.rgba[2] < 10;
    console.log(`  ${isBlack ? '⚠ DARK' : '✓'} ${px.label}: rgba(${px.rgba.join(',')})`);
    if (isBlack) blankCount++;
  }
  assert(blankCount <= 3, `canvas not blank — at most 3/6 dark pixels (got ${blankCount})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 6: Timer counts down
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 6: Timer');
  const t0 = (await getState(page)).timeLeft;
  await page.waitForTimeout(3000);
  const t1 = (await getState(page)).timeLeft;
  console.log(`  timeLeft before: ${t0}, after 3s: ${t1}`);
  assert(t1 < t0, `timer counts down (${t0} → ${t1})`);
  assert(t1 >= t0 - 4 && t1 <= t0 - 2, `timer decrements at ~1s rate (drop=${t0 - t1})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 7: Game-over state and play-again
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 7: Game over → play again');

  // Force game over by manipulating timeLeft
  await page.evaluate(() => {
    timeLeft = 3;
  });
  await page.waitForTimeout(4000);
  s = await getState(page);
  await shot(page, '14-gameover');
  assert(s.gameState === 'gameover', `game ends when timer reaches 0 (got '${s.gameState}')`);

  // Tap "Play Again" button — center of canvas ~H/2+50 = ~370 in canvas coords,
  // scaled: 370 * (844/640) ≈ 487 client pixels
  const playAgainClientY = Math.round((320 + 50) * (844 / 640));
  await page.mouse.move(195, playAgainClientY);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(400);
  s = await getState(page);
  await shot(page, '15-play-again');
  assert(s.gameState === 'casting', `play again → state=casting (got '${s.gameState}')`);
  assert(s.score === 0, `score resets on new game (got ${s.score})`);
  assert(s.timeLeft === 90, `timer resets to 90 on new game (got ${s.timeLeft})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUITE 8: Console errors — final check across full session
  // ═══════════════════════════════════════════════════════════════════════════
  log('Suite 8: Console errors (full session)');
  const allErrors = await page.evaluate(() => window.__errors || []);
  assert(allErrors.length === 0, `zero JS errors across entire test session`);
  if (allErrors.length > 0) {
    allErrors.forEach(e => console.error('  ERROR:', e));
  }
  if (errors.length > 0) {
    errors.forEach(e => console.error('  CONSOLE ERROR:', e));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  log('Results', { passed: totalPass, failed: totalFail, total: totalPass + totalFail });
  log('Screenshots saved to', { dir: SHOTS });
  log('DONE');

  await browser.close();
  if (totalFail > 0) process.exit(1);
})().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
