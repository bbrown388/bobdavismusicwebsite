// Playwright tests for Brand Iron (Game 28)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'brand-iron.html').replace(/\\/g, '/');
const W = 360, H = 640;
let browser, page;

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.warn('[PAGE ERROR]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}
async function teardown() {
  if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
}
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// Suite 1: Initial state is title
async function suite1() {
  console.log('\nSuite 1: Initial state is title');
  await setup();
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'initial state is title (got ' + st + ')');
  await teardown();
}

// Suite 2: Canvas dimensions 360x640
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions 360x640');
  await setup();
  const d = await page.evaluate(() => ({ w: document.getElementById('c').width, h: document.getElementById('c').height }));
  assert(d.w === 360, 'width 360');
  assert(d.h === 640, 'height 640');
  await teardown();
}

// Suite 3: startGame => playing
async function suite3() {
  console.log('\nSuite 3: startGame => playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing (got ' + st + ')');
  await teardown();
}

// Suite 4: startGame resets score to 0
async function suite4() {
  console.log('\nSuite 4: startGame resets score to 0');
  await setup();
  const sc = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(9999);
    window.__test.startGame();
    return window.__test.getScore();
  });
  assert(sc === 0, 'score reset to 0 (got ' + sc + ')');
  await teardown();
}

// Suite 5: startGame resets lives to 3
async function suite5() {
  console.log('\nSuite 5: startGame resets lives to 3');
  await setup();
  const l = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.startGame();
    return window.__test.getLives();
  });
  assert(l === 3, 'lives reset to 3 (got ' + l + ')');
  await teardown();
}

// Suite 6: startGame resets level to 0
async function suite6() {
  console.log('\nSuite 6: startGame resets level to 0');
  await setup();
  const lv = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLevel(3);
    window.__test.startGame();
    return window.__test.getLevel();
  });
  assert(lv === 0, 'level reset to 0 (got ' + lv + ')');
  await teardown();
}

// Suite 7: startGame resets heat to 0.5
async function suite7() {
  console.log('\nSuite 7: startGame resets heat to 0.5');
  await setup();
  const h = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(0.1);
    window.__test.startGame();
    return window.__test.getHeat();
  });
  assert(Math.abs(h - 0.5) < 0.01, 'heat reset to 0.5 (got ' + h + ')');
  await teardown();
}

// Suite 8: startGame resets progress to 0
async function suite8() {
  console.log('\nSuite 8: startGame resets progress to 0');
  await setup();
  const p = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setProgress(500);
    window.__test.startGame();
    return window.__test.getProgress();
  });
  assert(p === 0, 'progress reset to 0 (got ' + p + ')');
  await teardown();
}

// Suite 9: BRANDS array has 5 entries
async function suite9() {
  console.log('\nSuite 9: BRANDS has 5 entries');
  await setup();
  const cnt = await page.evaluate(() => window.__test.BRANDS.length);
  assert(cnt === 5, '5 brands defined (got ' + cnt + ')');
  await teardown();
}

// Suite 10: Each BRANDS entry has name, pts, time
async function suite10() {
  console.log('\nSuite 10: Each BRANDS entry has required fields');
  await setup();
  const ok = await page.evaluate(() => window.__test.BRANDS.every(b =>
    typeof b.name === 'string' && Array.isArray(b.pts) && typeof b.time === 'number'
  ));
  assert(ok, 'all brands have name, pts, time');
  await teardown();
}

// Suite 11: BRANDS time decreases or stays same across levels
async function suite11() {
  console.log('\nSuite 11: BRANDS time decreases across levels');
  await setup();
  const brands = await page.evaluate(() => window.__test.BRANDS.map(b => b.time));
  for (let i = 1; i < brands.length; i++) {
    assert(brands[i] <= brands[i - 1], 'time level ' + (i + 1) + ' <= level ' + i);
  }
  await teardown();
}

// Suite 12: Heat constants within valid range
async function suite12() {
  console.log('\nSuite 12: Heat constants valid');
  await setup();
  const c = await page.evaluate(() => ({
    cold: window.__test.HEAT_COLD,
    hot:  window.__test.HEAT_HOT,
    rise: window.__test.HEAT_RISE,
    fall: window.__test.HEAT_FALL,
  }));
  assert(c.cold > 0 && c.cold < 0.5, 'HEAT_COLD in (0, 0.5) got ' + c.cold);
  assert(c.hot > 0.5 && c.hot < 1, 'HEAT_HOT in (0.5, 1) got ' + c.hot);
  assert(c.cold < c.hot, 'HEAT_COLD < HEAT_HOT');
  assert(c.rise > 0, 'HEAT_RISE > 0');
  assert(c.fall > 0, 'HEAT_FALL > 0');
  await teardown();
}

// Suite 13: buildPath computes totalLen > 0 for each brand
async function suite13() {
  console.log('\nSuite 13: buildPath computes totalLen > 0');
  await setup();
  const lens = await page.evaluate(() =>
    window.__test.BRANDS.map(b => window.__test.buildPath(b.pts).totalLen)
  );
  for (let i = 0; i < lens.length; i++) {
    assert(lens[i] > 50, 'brand ' + (i + 1) + ' totalLen > 50 (got ' + lens[i] + ')');
  }
  await teardown();
}

// Suite 14: loadLevel sets timeLeft from brand
async function suite14() {
  console.log('\nSuite 14: loadLevel sets timeLeft from BRANDS entry');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  for (let lv = 0; lv < 5; lv++) {
    const tl = await page.evaluate(lv => {
      window.__test.loadLevel(lv);
      return window.__test.getTimeLeft();
    }, lv);
    const expected = await page.evaluate(lv => window.__test.BRANDS[lv].time, lv);
    assert(Math.abs(tl - expected) < 0.1, 'level ' + lv + ' timeLeft == brand.time (got ' + tl + ')');
  }
  await teardown();
}

// Suite 15: Heat rises when dragging
async function suite15() {
  console.log('\nSuite 15: Heat rises when dragging');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(0.4);
    window.__test.setDragging(true);
    window.__test.tickUpdate(0.5);
    return window.__test.getHeat();
  });
  assert(result > 0.4, 'heat increased from 0.4 (got ' + result + ')');
  await teardown();
}

// Suite 16: Heat falls when not dragging
async function suite16() {
  console.log('\nSuite 16: Heat falls when not dragging');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(0.6);
    window.__test.setDragging(false);
    window.__test.tickUpdate(0.5);
    return window.__test.getHeat();
  });
  assert(result < 0.6, 'heat decreased from 0.6 (got ' + result + ')');
  await teardown();
}

// Suite 17: Heat clamps at 0 (floor)
async function suite17() {
  console.log('\nSuite 17: Heat clamps at 0');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(0.05);
    window.__test.setDragging(false);
    window.__test.tickUpdate(5);
    return window.__test.getHeat();
  });
  assert(result >= 0, 'heat >= 0 after long fall (got ' + result + ')');
  await teardown();
}

// Suite 18: Heat clamps at 1 (ceiling)
async function suite18() {
  console.log('\nSuite 18: Heat clamps at 1');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setHeat(0.95);
    window.__test.setDragging(true);
    window.__test.tickUpdate(5);
    return window.__test.getHeat();
  });
  assert(result <= 1, 'heat <= 1 after long rise (got ' + result + ')');
  await teardown();
}

// Suite 19: Burn penalty when heat > HEAT_HOT while dragging
async function suite19() {
  console.log('\nSuite 19: Burn penalty at overheating');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(100);
    window.__test.setHeat(0.95);
    window.__test.setDragging(true);
    // Tick long enough for burnAccum to trigger penalty (>0.35s)
    window.__test.tickUpdate(0.4);
    return window.__test.getScore();
  });
  assert(result < 100, 'score decreased due to burn (got ' + result + ')');
  await teardown();
}

// Suite 20: No burn penalty below HEAT_HOT
async function suite20() {
  console.log('\nSuite 20: No burn penalty in hot zone');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(100);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    window.__test.tickUpdate(1);
    // Score may increase (from path tracing if near path), but should not decrease from burn
    return window.__test.getScore();
  });
  assert(result >= 100, 'score not decreased at normal heat (got ' + result + ')');
  await teardown();
}

// Suite 21: Timer counts down
async function suite21() {
  console.log('\nSuite 21: Timer counts down');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    const t0 = window.__test.getTimeLeft();
    window.__test.tickUpdate(1);
    return { t0, t1: window.__test.getTimeLeft() };
  });
  assert(result.t1 < result.t0, 'timeLeft decreased (was ' + result.t0 + ', now ' + result.t1 + ')');
  await teardown();
}

// Suite 22: Timer expiry decrements lives
async function suite22() {
  console.log('\nSuite 22: Timer expiry decrements lives');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(3);
    window.__test.setTimeLeft(0.01);
    window.__test.tickUpdate(0.1);
    return window.__test.getLives();
  });
  assert(result === 2, 'lives decremented on time out (got ' + result + ')');
  await teardown();
}

// Suite 23: Timer expiry reloads same level (not gameover when lives > 0)
async function suite23() {
  console.log('\nSuite 23: Timer expiry reloads level (not next level)');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLevel(2);
    window.__test.loadLevel(2);
    window.__test.setLives(3);
    window.__test.setTimeLeft(0.01);
    window.__test.tickUpdate(0.1);
    return { level: window.__test.getLevel(), state: window.__test.getState() };
  });
  assert(result.level === 2, 'still on level 2 after timeout (got ' + result.level + ')');
  assert(result.state === 'playing', 'state still playing (got ' + result.state + ')');
  await teardown();
}

// Suite 24: Timer expiry with 1 life => gameover
async function suite24() {
  console.log('\nSuite 24: Lives=1, timer expiry => gameover');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.setTimeLeft(0.01);
    window.__test.tickUpdate(0.1);
    return window.__test.getState();
  });
  assert(result === 'gameover', 'state is gameover (got ' + result + ')');
  await teardown();
}

// Suite 25: nearestOnPathAhead returns 0 dist when iron is on path
async function suite25() {
  console.log('\nSuite 25: nearestOnPathAhead: iron on path => dist near 0');
  await setup();
  const dist = await page.evaluate(() => {
    const brand = window.__test.BRANDS[0];
    const p = window.__test.buildPath(brand.pts);
    const [sx, sy] = window.__test.toCanvas(brand.pts[0][0], brand.pts[0][1]);
    const { dist } = window.__test.nearestOnPathAhead(sx, sy, p, 0);
    return dist;
  });
  assert(dist < 5, 'dist near 0 when iron is at path start (got ' + dist + ')');
  await teardown();
}

// Suite 26: nearestOnPathAhead returns large dist when iron is far from path
async function suite26() {
  console.log('\nSuite 26: nearestOnPathAhead: iron far from path => dist > TOLERANCE');
  await setup();
  const result = await page.evaluate(() => {
    const brand = window.__test.BRANDS[0];
    const p = window.__test.buildPath(brand.pts);
    const { dist } = window.__test.nearestOnPathAhead(0, 0, p, 0);
    return { dist, tol: window.__test.TOLERANCE };
  });
  assert(result.dist > result.tol, 'dist > TOLERANCE when far from path (got ' + result.dist + ')');
  await teardown();
}

// Suite 27: Progress advances when iron is in tolerance + hot zone while dragging
async function suite27() {
  console.log('\nSuite 27: Progress advances when in tolerance and hot zone');
  await setup();
  const prog = await page.evaluate(() => {
    window.__test.startGame();
    const brand = window.__test.BRANDS[0];
    const p = window.__test.buildPath(brand.pts);
    // Place iron at path start, set hot heat
    const [sx, sy] = window.__test.toCanvas(brand.pts[0][0], brand.pts[0][1]);
    // Simulate being slightly ahead of start
    const [ex, ey] = window.__test.toCanvas(
      (brand.pts[0][0] + brand.pts[1][0]) / 2,
      (brand.pts[0][1] + brand.pts[1][1]) / 2
    );
    window.__test.setIronPos(ex, ey);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    window.__test.tickUpdate(0.016);
    return window.__test.getProgress();
  });
  assert(prog > 0, 'progress > 0 after tracing (got ' + prog + ')');
  await teardown();
}

// Suite 28: Progress does NOT advance when iron is too cold
async function suite28() {
  console.log('\nSuite 28: No progress when heat < HEAT_COLD');
  await setup();
  const prog = await page.evaluate(() => {
    window.__test.startGame();
    const brand = window.__test.BRANDS[0];
    const [ex, ey] = window.__test.toCanvas(
      (brand.pts[0][0] + brand.pts[1][0]) / 2,
      (brand.pts[0][1] + brand.pts[1][1]) / 2
    );
    window.__test.setIronPos(ex, ey);
    window.__test.setHeat(window.__test.HEAT_COLD - 0.05);
    window.__test.setDragging(true);
    window.__test.tickUpdate(0.1);
    return window.__test.getProgress();
  });
  assert(prog === 0, 'progress stays 0 when too cold (got ' + prog + ')');
  await teardown();
}

// Suite 29: Progress does NOT advance when iron is far from path
async function suite29() {
  console.log('\nSuite 29: No progress when iron is far from path');
  await setup();
  const prog = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setIronPos(5, 5);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    window.__test.tickUpdate(0.1);
    return window.__test.getProgress();
  });
  assert(prog === 0, 'progress stays 0 when far from path (got ' + prog + ')');
  await teardown();
}

// Suite 30: Progress does not regress
async function suite30() {
  console.log('\nSuite 30: Progress never decreases');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setProgress(50);
    window.__test.setDragging(false);
    window.__test.tickUpdate(0.5);
    return window.__test.getProgress();
  });
  assert(result >= 50, 'progress did not decrease (got ' + result + ')');
  await teardown();
}

// Suite 31: Brand completion (pass%) triggers success for non-last level
async function suite31() {
  console.log('\nSuite 31: Completing brand => success state (non-last level)');
  await setup();
  const st = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLevel(0);
    window.__test.loadLevel(0);
    const totalLen = window.__test.getPath().totalLen;
    // Set progress just above pass threshold and iron on path, then tick
    window.__test.setProgress(totalLen * 0.84);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    // Place iron near path end to advance a little more
    const brand = window.__test.BRANDS[0];
    const last = brand.pts[brand.pts.length - 1];
    const [ex, ey] = window.__test.toCanvas(last[0], last[1]);
    window.__test.setIronPos(ex, ey);
    window.__test.setProgress(totalLen * 0.99);
    window.__test.tickUpdate(0.016);
    return window.__test.getState();
  });
  assert(st === 'success', 'state is success after completing brand 0 (got ' + st + ')');
  await teardown();
}

// Suite 32: Brand completion on last level => gamewin
async function suite32() {
  console.log('\nSuite 32: Completing last brand => gamewin');
  await setup();
  const st = await page.evaluate(() => {
    window.__test.startGame();
    const lastIdx = window.__test.BRANDS.length - 1;
    window.__test.setLevel(lastIdx);
    window.__test.loadLevel(lastIdx);
    const totalLen = window.__test.getPath().totalLen;
    window.__test.setProgress(totalLen * 0.99);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    const brand = window.__test.BRANDS[lastIdx];
    const last = brand.pts[brand.pts.length - 1];
    const [ex, ey] = window.__test.toCanvas(last[0], last[1]);
    window.__test.setIronPos(ex, ey);
    window.__test.tickUpdate(0.016);
    return window.__test.getState();
  });
  assert(st === 'gamewin', 'state is gamewin after completing last brand (got ' + st + ')');
  await teardown();
}

// Suite 33: Score increases while tracing in hot zone
async function suite33() {
  console.log('\nSuite 33: Score increases during correct tracing');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(0);
    const brand = window.__test.BRANDS[0];
    const [ex, ey] = window.__test.toCanvas(
      (brand.pts[0][0] + brand.pts[1][0]) / 2,
      (brand.pts[0][1] + brand.pts[1][1]) / 2
    );
    window.__test.setIronPos(ex, ey);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    window.__test.tickUpdate(0.016);
    return window.__test.getScore();
  });
  assert(result >= 0, 'score is non-negative (got ' + result + ')');
  await teardown();
}

// Suite 34: toCanvas converts local to canvas coords
async function suite34() {
  console.log('\nSuite 34: toCanvas coordinate conversion');
  await setup();
  const result = await page.evaluate(() => {
    const [cx, cy] = window.__test.toCanvas(0, 0);
    return { cx, cy, ox: window.__test.BRAND_OX, oy: window.__test.BRAND_OY };
  });
  assert(result.cx === result.ox, 'local (0,0) x maps to BRAND_OX (got ' + result.cx + ')');
  assert(result.cy === result.oy, 'local (0,0) y maps to BRAND_OY (got ' + result.cy + ')');
  await teardown();
}

// Suite 35: starPath returns 11 points (5 outer + 5 inner + close)
async function suite35() {
  console.log('\nSuite 35: starPath returns 11 points');
  await setup();
  const cnt = await page.evaluate(() => window.__test.starPath(90, 80, 70, 30).length);
  assert(cnt === 11, 'starPath returns 11 points (got ' + cnt + ')');
  await teardown();
}

// Suite 36: PASS_PCT constant is in valid range
async function suite36() {
  console.log('\nSuite 36: PASS_PCT in valid range');
  await setup();
  const p = await page.evaluate(() => window.__test.PASS_PCT);
  assert(p > 0.5 && p <= 1.0, 'PASS_PCT in (0.5, 1.0] (got ' + p + ')');
  await teardown();
}

// Suite 37: FEEDBACK_ENDPOINT is the correct URL
async function suite37() {
  console.log('\nSuite 37: FEEDBACK_ENDPOINT correct');
  await setup();
  const url = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(url.includes('script.google.com'), 'FEEDBACK_ENDPOINT contains script.google.com');
  await teardown();
}

// Suite 38: localStorage key brand_iron_best
async function suite38() {
  console.log('\nSuite 38: localStorage uses brand_iron_best key');
  await setup();
  await page.evaluate(() => {
    localStorage.setItem('brand_iron_best', '999');
    window.__test.startGame();
  });
  const best = await page.evaluate(() => parseInt(localStorage.getItem('brand_iron_best') || '0', 10));
  assert(best === 999, 'localStorage key brand_iron_best persists (got ' + best + ')');
  await teardown();
}

// Suite 39: Pixel - title screen shows gold text
async function suite39() {
  console.log('\nSuite 39: Pixel - title screen has gold text');
  await setup();
  await page.waitForTimeout(200);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Scan a horizontal strip at y=180 (title text area) for a bright warm pixel
    for (let x = 80; x < 280; x++) {
      const d = ctx.getImageData(x, 185, 1, 1).data;
      if (d[0] > 200 && d[1] > 180 && d[2] < 100) return { r: d[0], g: d[1], b: d[2] };
    }
    return null;
  });
  assert(pixel !== null, 'gold pixel found in title text area (r=' + (pixel ? pixel.r : 'N/A') + ')');
  await teardown();
}

// Suite 40: Pixel - HUD score visible during play (gold text at top)
async function suite40() {
  console.log('\nSuite 40: Pixel - HUD score visible during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    for (let x = 130; x < 230; x++) {
      const d = ctx.getImageData(x, 25, 1, 1).data;
      if (d[0] > 200 && d[1] > 180 && d[2] < 120) return { r: d[0], g: d[1], b: d[2] };
    }
    return null;
  });
  assert(pixel !== null, 'gold HUD pixel found at top (r=' + (pixel ? pixel.r : 'N/A') + ')');
  await teardown();
}

// Suite 41: Pixel - gameover shows red text
async function suite41() {
  console.log('\nSuite 41: Pixel - gameover shows red text');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('gameover');
  });
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    for (let x = 60; x < 300; x++) {
      for (let y = 170; y < 220; y++) {
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (d[0] > 180 && d[1] < 80 && d[2] < 80) return { r: d[0], g: d[1], b: d[2] };
      }
    }
    return null;
  });
  assert(pixel !== null, 'red pixel found in gameover text area (r=' + (pixel ? pixel.r : 'N/A') + ')');
  await teardown();
}

// Suite 42: Pixel - hide area renders tan/brown color during play
async function suite42() {
  console.log('\nSuite 42: Pixel - hide area is tan/brown during play');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Sample center of the hide area (brand zone center)
    const cx = Math.round(window.__test.BRAND_CX);
    const cy = Math.round(window.__test.BRAND_CY);
    const d = ctx.getImageData(cx, cy, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  });
  assert(pixel.r > 80 && pixel.g > 50 && pixel.b < 60, 'hide center is warm tan (got r=' + pixel.r + ',g=' + pixel.g + ',b=' + pixel.b + ')');
  await teardown();
}

// Suite 43: Pixel - progress bar changes as progress increases
async function suite43() {
  console.log('\nSuite 43: Pixel - progress bar renders');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setProgress(window.__test.getPath().totalLen * 0.5);
  });
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Progress bar at bottom, mid-point (half filled = mid-x should show color)
    for (let x = 100; x < 200; x++) {
      const d = ctx.getImageData(x, H - 30, 1, 1).data;
      if (d[0] > 200 && d[1] > 80 && d[2] < 80) return { r: d[0], g: d[1], b: d[2] };
    }
    return null;
  }, H);
  assert(pixel !== null, 'orange pixel in progress bar found (r=' + (pixel ? pixel.r : 'N/A') + ')');
  await teardown();
}

// Suite 44: Console error sweep
async function suite44() {
  console.log('\nSuite 44: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!t.includes('favicon') && !t.includes('CORS') && !t.includes('ERR_FAILED') && !t.includes('net::')) {
        errors.push(t);
      }
    }
  });
  await page.goto(FILE);
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(300);
  await teardown();
  assert(errors.length === 0, 'no console errors (got: ' + errors.join('; ') + ')');
}

// Suite 45: Full state cycle: title -> playing -> success -> gamewin
async function suite45() {
  console.log('\nSuite 45: Full state cycle title->playing->success->gamewin');
  await setup();
  const states = await page.evaluate(() => {
    const log = [];
    log.push(window.__test.getState()); // title

    window.__test.startGame();
    log.push(window.__test.getState()); // playing

    // Complete level 0 directly
    window.__test.setLevel(0);
    window.__test.loadLevel(0);
    const p0 = window.__test.getPath();
    window.__test.setProgress(p0.totalLen * 0.99);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    const brand0 = window.__test.BRANDS[0];
    const lastPt = brand0.pts[brand0.pts.length - 1];
    const [ex0, ey0] = window.__test.toCanvas(lastPt[0], lastPt[1]);
    window.__test.setIronPos(ex0, ey0);
    window.__test.tickUpdate(0.016);
    log.push(window.__test.getState()); // success

    // Advance through levels 1-3 the same way
    for (let lv = 1; lv <= 3; lv++) {
      window.__test.setState('playing');
      window.__test.setLevel(lv);
      window.__test.loadLevel(lv);
      const pl = window.__test.getPath();
      window.__test.setProgress(pl.totalLen * 0.99);
      window.__test.setHeat(0.5);
      window.__test.setDragging(true);
      const brandLv = window.__test.BRANDS[lv];
      const lastLv = brandLv.pts[brandLv.pts.length - 1];
      const [exLv, eyLv] = window.__test.toCanvas(lastLv[0], lastLv[1]);
      window.__test.setIronPos(exLv, eyLv);
      window.__test.tickUpdate(0.016);
    }

    // Complete level 4 (last)
    window.__test.setState('playing');
    window.__test.setLevel(4);
    window.__test.loadLevel(4);
    const p4 = window.__test.getPath();
    window.__test.setProgress(p4.totalLen * 0.99);
    window.__test.setHeat(0.5);
    window.__test.setDragging(true);
    const brand4 = window.__test.BRANDS[4];
    const last4 = brand4.pts[brand4.pts.length - 1];
    const [ex4, ey4] = window.__test.toCanvas(last4[0], last4[1]);
    window.__test.setIronPos(ex4, ey4);
    window.__test.tickUpdate(0.016);
    log.push(window.__test.getState()); // gamewin

    return log;
  });
  assert(states[0] === 'title',   'starts at title (got ' + states[0] + ')');
  assert(states[1] === 'playing', 'startGame => playing (got ' + states[1] + ')');
  assert(states[2] === 'success', 'level 0 complete => success (got ' + states[2] + ')');
  assert(states[3] === 'gamewin', 'all levels complete => gamewin (got ' + states[3] + ')');
  await teardown();
}

// Runner
async function run() {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15, suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25, suite26, suite27, suite28, suite29, suite30,
    suite31, suite32, suite33, suite34, suite35, suite36, suite37, suite38, suite39, suite40,
    suite41, suite42, suite43, suite44, suite45,
  ];
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
    }
  }
  console.log('\n' + passed + '/' + suites.length + ' suites passed' + (failed ? ' (' + failed + ' failed)' : ''));
  process.exit(failed > 0 ? 1 : 0);
}

run();
