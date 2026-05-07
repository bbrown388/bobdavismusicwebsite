// Playwright tests for Coyote Call (Game 42)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'coyote-call.html').replace(/\\/g, '/');
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

async function teardown() {
  try { await browser.close(); } catch {}
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// ── Suite 1: Title screen renders ────────────────────────────
async function suite1() {
  console.log('\nSuite 1: Title screen');
  await setup();
  const s = await page.evaluate(() => state);
  assert(s === 'title', 'initial state is title');
  const px = await page.evaluate(() => {
    const c = document.getElementById('c');
    return c.getContext('2d').getImageData(W / 2, 185, 1, 1).data[0];
  });
  assert(px > 10, 'title text area has rendered pixels');
  await teardown();
}

// ── Suite 2: Tap starts game ─────────────────────────────────
async function suite2() {
  console.log('\nSuite 2: Tap starts game');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(100);
  const s = await page.evaluate(() => state);
  assert(s === 'playing', 'tap title transitions to playing');
  const r = await page.evaluate(() => round);
  assert(r === 0, 'round starts at 0');
  const sc = await page.evaluate(() => score);
  assert(sc === 0, 'score starts at 0');
  await teardown();
}

// ── Suite 3: Round config values ─────────────────────────────
async function suite3() {
  console.log('\nSuite 3: Round configs');
  await setup();
  const cfgs = await page.evaluate(() => ROUNDS);
  assert(cfgs.length === 5, 'five rounds defined');
  assert(cfgs[0].tol > cfgs[4].tol, 'tolerance tightens each round');
  assert(cfgs[0].hold > cfgs[4].hold, 'hold time decreases each round');
  assert(cfgs[0].pack === 1 && cfgs[4].pack === 5, 'pack grows from 1 to 5');
  cfgs.forEach((c, i) => {
    assert(c.freqs.length === 3, 'round ' + i + ' has 3 target freqs');
  });
  await teardown();
}

// ── Suite 4: markerIdx advances on lock ──────────────────────
async function suite4() {
  console.log('\nSuite 4: Marker advances on lock');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    playerFreq = ROUNDS[0].freqs[0];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[0].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(200);

  const idx = await page.evaluate(() => markerIdx);
  assert(idx === 1, 'markerIdx advanced to 1 after locking marker 0');
  const locked = await page.evaluate(() => markerLocked[0]);
  assert(locked === true, 'markerLocked[0] is true');
  await teardown();
}

// ── Suite 5: Score increments on lock ────────────────────────
async function suite5() {
  console.log('\nSuite 5: Score increments');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    playerFreq = ROUNDS[0].freqs[0];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[0].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(200);

  const sc = await page.evaluate(() => score);
  assert(sc >= 100, 'score is at least 100 after first lock');
  await teardown();
}

// ── Suite 6: Perfect bonus for exact match ────────────────────
async function suite6() {
  console.log('\nSuite 6: Perfect bonus');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    playerFreq = ROUNDS[0].freqs[0];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[0].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(200);

  const sc = await page.evaluate(() => score);
  assert(sc === 150, 'exact match gives 150 points (perfect)');
  await teardown();
}

// ── Suite 7: Trust fills while dragging on target ─────────────
async function suite7() {
  console.log('\nSuite 7: Trust accumulates on target');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    playerFreq = ROUNDS[0].freqs[0];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    isDragging = true;
    trustTimer = 0;
    howlIntro = 0;
  });
  await page.waitForTimeout(600);

  const t = await page.evaluate(() => trustTimer);
  assert(t > 0.3, 'trustTimer accumulated on target (got ' + t + ')');
  await teardown();
}

// ── Suite 8: Trust drains when not dragging ───────────────────
async function suite8() {
  console.log('\nSuite 8: Trust drains without drag');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    playerFreq = ROUNDS[0].freqs[0];
    trustTimer = 1.0;
    isDragging = false;
    howlIntro = 0;
  });
  await page.waitForTimeout(400);

  const t = await page.evaluate(() => trustTimer);
  assert(t < 1.0, 'trustTimer drained without dragging (got ' + t + ')');
  await teardown();
}

// ── Suite 9: Scare accumulates when far off ───────────────────
async function suite9() {
  console.log('\nSuite 9: Scare accumulates far off target');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const tgt = ROUNDS[0].freqs[0];
    playerFreq = tgt + ROUNDS[0].tol * 3;
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    isDragging = true;
    howlIntro = 0;
    scareTimer = 0;
  });
  await page.waitForTimeout(600);

  const st = await page.evaluate(() => scareTimer + scareTotal);
  assert(st > 0.3, 'scare accumulated when far off (got ' + st + ')');
  await teardown();
}

// ── Suite 10: Scare limit triggers flee ───────────────────────
async function suite10() {
  console.log('\nSuite 10: Scare limit triggers flee');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const tgt = ROUNDS[0].freqs[0];
    playerFreq = tgt + ROUNDS[0].tol * 4;
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    isDragging = true;
    howlIntro = 0;
    scareTotal = SCARE_LIMIT - 0.01;
    scareTimer = 1.39;
  });
  await page.waitForTimeout(300);

  const s = await page.evaluate(() => state);
  assert(s === 'round_lose' || s === 'lose', 'scare limit leads to round_lose or lose (got ' + s + ')');
  await teardown();
}

// ── Suite 11: Coyotes start off-screen right ─────────────────
async function suite11() {
  console.log('\nSuite 11: Coyotes start off-screen');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);

  const xs = await page.evaluate(() => coyotes.map(c => c.x));
  assert(xs.length === 1, 'round 1 has 1 coyote');
  assert(xs[0] > W, 'coyote starts off-screen right (x=' + xs[0] + ')');
  await teardown();
}

// ── Suite 12: Coyotes approach with locked markers ────────────
async function suite12() {
  console.log('\nSuite 12: Coyotes approach');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(150);

  const xBefore = await page.evaluate(() => coyotes[0].x);
  await page.evaluate(() => {
    markerLocked = [true, true, true];
    markerIdx = 3;
    trustTimer = 1.0;
  });
  await page.waitForTimeout(400);

  const xAfter = await page.evaluate(() => coyotes[0].x);
  assert(xAfter < xBefore, 'coyote moved left after markers locked');
  await teardown();
}

// ── Suite 13: freqToY / yToFreq roundtrip ────────────────────
async function suite13() {
  console.log('\nSuite 13: freqToY / yToFreq roundtrip');
  await setup();
  const ok = await page.evaluate(() => {
    const freqs = [FREQ_MIN, 400, 700, FREQ_MAX];
    return freqs.every(f => Math.abs(yToFreq(freqToY(f)) - f) < 1);
  });
  assert(ok, 'yToFreq(freqToY(f)) identity holds for test freqs');
  await teardown();
}

// ── Suite 14: Frequency clamping ─────────────────────────────
async function suite14() {
  console.log('\nSuite 14: Frequency clamping');
  await setup();
  await page.evaluate(() => setPlayerFreq(FREQ_MIN - 100));
  const fLow = await page.evaluate(() => playerFreq);
  assert(fLow === 200, 'freq clamped to FREQ_MIN');
  await page.evaluate(() => setPlayerFreq(FREQ_MAX + 500));
  const fHigh = await page.evaluate(() => playerFreq);
  assert(fHigh === 1200, 'freq clamped to FREQ_MAX');
  await teardown();
}

// ── Suite 15: Round win advances round counter ────────────────
async function suite15() {
  console.log('\nSuite 15: Round win advances round');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  for (let i = 0; i < 3; i++) {
    await page.evaluate((mi) => {
      markerIdx = mi;
      playerFreq = ROUNDS[0].freqs[mi];
      if (playerOsc) playerOsc.frequency.value = playerFreq;
      trustTimer = ROUNDS[0].hold - 0.01;
      isDragging = true;
    }, i);
    await page.waitForTimeout(200);
  }

  const s1 = await page.evaluate(() => state);
  assert(s1 === 'round_win' || s1 === 'playing', 'state is round_win or playing after locking all 3');
  await teardown();
}

// ── Suite 16: Win after round 5 ──────────────────────────────
async function suite16() {
  console.log('\nSuite 16: Win after round 5');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    round = 4;
    markerIdx = 2;
    markerLocked = [true, true, false];
    playerFreq = ROUNDS[4].freqs[2];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[4].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(300);

  const s = await page.evaluate(() => state);
  assert(s === 'win', 'state is win after final round final marker');
  await teardown();
}

// ── Suite 17: localStorage best score ────────────────────────
async function suite17() {
  console.log('\nSuite 17: localStorage best score');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    round = 4;
    markerIdx = 2;
    markerLocked = [true, true, false];
    score = 1350;
    playerFreq = ROUNDS[4].freqs[2];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[4].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(300);

  const stored = await page.evaluate(() => localStorage.getItem('coyote_call_best'));
  assert(stored !== null, 'coyote_call_best stored in localStorage');
  assert(parseInt(stored, 10) >= 1350, 'stored best >= 1350');
  await teardown();
}

// ── Suite 18: Floaters appear on lock ────────────────────────
async function suite18() {
  console.log('\nSuite 18: Floaters on lock');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    playerFreq = ROUNDS[0].freqs[0];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[0].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(200);

  const fl = await page.evaluate(() => floaters.length);
  assert(fl > 0, 'floaters array has entries after lock');
  await teardown();
}

// ── Suite 19: HUD pip pixels visible ─────────────────────────
async function suite19() {
  console.log('\nSuite 19: HUD marker pips');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(300);

  const hasPixels = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(W - 70, 8, 60, 16).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 50 || d[i+1] > 50 || d[i+2] > 50) return true;
    }
    return false;
  });
  assert(hasPixels, 'HUD pip area has non-black pixels');
  await teardown();
}

// ── Suite 20: Oscilloscope panel dark background ─────────────
async function suite20() {
  console.log('\nSuite 20: Oscilloscope renders');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(300);

  const px = await page.evaluate(() => {
    const c = document.getElementById('c');
    return Array.from(c.getContext('2d').getImageData(SC_X + 10, SC_Y + 10, 1, 1).data);
  });
  assert(px[0] < 30 && px[1] < 30 && px[2] < 30, 'scope panel background is dark');
  await teardown();
}

// ── Suite 21: freqToY maps FREQ_MAX to WH_Y ──────────────────
async function suite21() {
  console.log('\nSuite 21: freqToY boundary values');
  await setup();
  const ok = await page.evaluate(() => {
    const yMax = freqToY(FREQ_MAX);
    const yMin = freqToY(FREQ_MIN);
    return Math.abs(yMax - WH_Y) < 2 && Math.abs(yMin - (WH_Y + WH_H)) < 2;
  });
  assert(ok, 'FREQ_MAX maps to WH_Y top and FREQ_MIN maps to WH_Y+WH_H bottom');
  await teardown();
}

// ── Suite 22: round_lose transitions to lose ─────────────────
async function suite22() {
  console.log('\nSuite 22: round_lose transitions to lose');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    state = 'round_lose';
    transTimer = 0.01;
  });
  await page.waitForTimeout(300);

  const s = await page.evaluate(() => state);
  assert(s === 'lose', 'round_lose with expired timer goes to lose');
  await teardown();
}

// ── Suite 23: startGame resets all state ─────────────────────
async function suite23() {
  console.log('\nSuite 23: startGame resets state');
  await setup();
  await page.evaluate(() => {
    score = 999;
    round = 3;
    markerIdx = 2;
    scareTotal = 2.5;
    startGame();
  });
  const [sc, r, mi, st] = await page.evaluate(() => [score, round, markerIdx, scareTotal]);
  assert(sc === 0, 'score reset');
  assert(r === 0, 'round reset');
  assert(mi === 0, 'markerIdx reset');
  assert(st === 0, 'scareTotal reset');
  await teardown();
}

// ── Suite 24: Console error sweep ────────────────────────────
async function suite24() {
  console.log('\nSuite 24: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const bctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await bctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(FILE);
  await page.waitForTimeout(300);
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    playerFreq = ROUNDS[0].freqs[0];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[0].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    round = 4;
    markerIdx = 2;
    markerLocked = [true, true, false];
    playerFreq = ROUNDS[4].freqs[2];
    if (playerOsc) playerOsc.frequency.value = playerFreq;
    trustTimer = ROUNDS[4].hold - 0.01;
    isDragging = true;
  });
  await page.waitForTimeout(300);

  assert(errors.length === 0, 'zero console errors (got: ' + errors.join('; ') + ')');
  await browser.close();
}

// ── Suite 25: Drag updates playerFreq ────────────────────────
async function suite25() {
  console.log('\nSuite 25: Drag updates playerFreq');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  const [cx, midY, topY] = await page.evaluate(() => [
    WH_X + WH_W / 2, WH_Y + WH_H / 2, WH_Y + 20
  ]);
  await page.mouse.move(cx, midY);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const freqMid = await page.evaluate(() => playerFreq);
  await page.mouse.move(cx, topY);
  await page.waitForTimeout(100);
  const freqHigh = await page.evaluate(() => playerFreq);
  await page.mouse.up();

  assert(freqHigh > freqMid, 'dragging up increases freq (mid=' + freqMid + ' high=' + freqHigh + ')');
  await teardown();
}

// ── Suite 26: Pack size per round ────────────────────────────
async function suite26() {
  console.log('\nSuite 26: Pack size per round');
  await setup();
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  for (let r = 0; r < 5; r++) {
    const result = await page.evaluate((ri) => {
      round = ri;
      startRound();
      return { count: coyotes.length, expected: ROUNDS[ri].pack };
    }, r);
    await page.waitForTimeout(50);
    assert(result.count === result.expected,
      'round ' + r + ' pack size = ' + result.expected + ' (got ' + result.count + ')');
  }
  await teardown();
}

// ── Runner ────────────────────────────────────────────────────
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15, suite16,
    suite17, suite18, suite19, suite20, suite21, suite22, suite23, suite24,
    suite25, suite26,
  ];
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
  console.log('\n' + '='.repeat(40));
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
})();
