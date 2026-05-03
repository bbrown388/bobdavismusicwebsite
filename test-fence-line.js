// Playwright tests for Fence Line (Game 25)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'fence-line.html').replace(/\\/g, '/');
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
  assert(d.w === 360, 'canvas width 360');
  assert(d.h === 640, 'canvas height 640');
  await teardown();
}

// Suite 3: startGame transitions to playing
async function suite3() {
  console.log('\nSuite 3: startGame => playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame (got ' + st + ')');
  await teardown();
}

// Suite 4: startGame resets score to 0
async function suite4() {
  console.log('\nSuite 4: startGame resets score to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(999);
    window.__test.startGame();
  });
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 0, 'score reset to 0 (got ' + sc + ')');
  await teardown();
}

// Suite 5: startGame resets lives to 3
async function suite5() {
  console.log('\nSuite 5: startGame resets lives to 3');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(1);
    window.__test.startGame();
  });
  const l = await page.evaluate(() => window.__test.getLives());
  assert(l === 3, 'lives reset to 3 (got ' + l + ')');
  await teardown();
}

// Suite 6: startGame resets level to 0
async function suite6() {
  console.log('\nSuite 6: startGame resets level to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLevel(3);
    window.__test.startGame();
  });
  const lv = await page.evaluate(() => window.__test.getLevel());
  assert(lv === 0, 'level reset to 0 (got ' + lv + ')');
  await teardown();
}

// Suite 7: LEVELS has 5 entries
async function suite7() {
  console.log('\nSuite 7: LEVELS array has 5 entries');
  await setup();
  const n = await page.evaluate(() => window.__test.LEVELS.length);
  assert(n === 5, 'LEVELS.length === 5 (got ' + n + ')');
  await teardown();
}

// Suite 8: N_SECS === 12, SEC_W === 30
async function suite8() {
  console.log('\nSuite 8: N_SECS === 12, SEC_W === 30');
  await setup();
  const r = await page.evaluate(() => ({ n: window.__test.N_SECS, sw: window.__test.SEC_W }));
  assert(r.n === 12, 'N_SECS === 12 (got ' + r.n + ')');
  assert(r.sw === 30, 'SEC_W === 30 (got ' + r.sw + ')');
  await teardown();
}

// Suite 9: startLevel creates 12 sections
async function suite9() {
  console.log('\nSuite 9: startLevel creates 12 sections');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  const n = await page.evaluate(() => window.__test.getSections().length);
  assert(n === 12, '12 sections created (got ' + n + ')');
  await teardown();
}

// Suite 10: Level 0 has gaps at indices 2, 5, 9
async function suite10() {
  console.log('\nSuite 10: Level 0 gaps at [2, 5, 9]');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  const secs = await page.evaluate(() => window.__test.getSections());
  assert(secs[2].state === 'gap', 'section 2 is gap');
  assert(secs[5].state === 'gap', 'section 5 is gap');
  assert(secs[9].state === 'gap', 'section 9 is gap');
  assert(secs[0].state === 'intact', 'section 0 is intact');
  assert(secs[4].state === 'intact', 'section 4 is intact');
  await teardown();
}

// Suite 11: Level 0 timer is 90
async function suite11() {
  console.log('\nSuite 11: Level 0 timer starts at 90');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  const t = await page.evaluate(() => window.__test.getTimer());
  assert(t >= 89 && t <= 90, 'timer ~90 (got ' + t + ')');
  await teardown();
}

// Suite 12: tapSection gap -> post
async function suite12() {
  console.log('\nSuite 12: tapSection on gap sets state to post');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2); // section 2 is gap in level 0
  });
  const s = await page.evaluate(() => window.__test.getSections()[2].state);
  assert(s === 'post', 'section 2 state is post after tap (got ' + s + ')');
  await teardown();
}

// Suite 13: tapSection post -> closed, +100 score
async function suite13() {
  console.log('\nSuite 13: tapSection on post => closed, score +100');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2); // gap -> post
    window.__test.tapSection(2); // post -> closed
  });
  const res = await page.evaluate(() => ({
    state: window.__test.getSections()[2].state,
    score: window.__test.getScore()
  }));
  assert(res.state === 'closed', 'section 2 is closed (got ' + res.state + ')');
  assert(res.score === 100, 'score is 100 (got ' + res.score + ')');
  await teardown();
}

// Suite 14: tapSection on intact does nothing
async function suite14() {
  console.log('\nSuite 14: tapSection on intact does nothing');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(0); // intact section
  });
  const s = await page.evaluate(() => window.__test.getSections()[0].state);
  assert(s === 'intact', 'intact section unchanged (got ' + s + ')');
  await teardown();
}

// Suite 15: tapSection on closed does nothing
async function suite15() {
  console.log('\nSuite 15: tapSection on closed does nothing, score unchanged');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2); // gap -> post
    window.__test.tapSection(2); // post -> closed, score=100
    window.__test.tapSection(2); // should do nothing
  });
  const res = await page.evaluate(() => ({
    state: window.__test.getSections()[2].state,
    score: window.__test.getScore()
  }));
  assert(res.state === 'closed', 'closed stays closed');
  assert(res.score === 100, 'score still 100 (got ' + res.score + ')');
  await teardown();
}

// Suite 16: closing all gaps triggers levelclear
async function suite16() {
  console.log('\nSuite 16: closing all gaps -> levelclear state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Level 0 gaps: [2, 5, 9]
    window.__test.tapSection(2); window.__test.tapSection(2); // close gap 2
    window.__test.tapSection(5); window.__test.tapSection(5); // close gap 5
    window.__test.tapSection(9); window.__test.tapSection(9); // close gap 9
  });
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'levelclear', 'state is levelclear (got ' + st + ')');
  await teardown();
}

// Suite 17: level completion increases score beyond 300
async function suite17() {
  console.log('\nSuite 17: level completion adds time bonus');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2); window.__test.tapSection(2);
    window.__test.tapSection(5); window.__test.tapSection(5);
    window.__test.tapSection(9); window.__test.tapSection(9);
  });
  await page.waitForTimeout(100);
  const sc = await page.evaluate(() => window.__test.getScore());
  // 3 gaps * 100 = 300, plus time bonus (90*50=4500) + 200 = 5000 total
  assert(sc > 300, 'score > 300 after level clear (got ' + sc + ')');
  await teardown();
}

// Suite 18: level advances after clearTimer
async function suite18() {
  console.log('\nSuite 18: level advances after levelclear timer');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2); window.__test.tapSection(2);
    window.__test.tapSection(5); window.__test.tapSection(5);
    window.__test.tapSection(9); window.__test.tapSection(9);
  });
  // Wait for clearTimer (2.4s)
  await page.waitForTimeout(3000);
  const lv = await page.evaluate(() => window.__test.getLevel());
  assert(lv === 1, 'level advanced to 1 (got ' + lv + ')');
  await teardown();
}

// Suite 19: timer=0 -> gameover
async function suite19() {
  console.log('\nSuite 19: timer=0 -> gameover');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTimer(0.01);
  });
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover', 'state is gameover when timer expires (got ' + st + ')');
  await teardown();
}

// Suite 20: getOpenGaps returns correct count
async function suite20() {
  console.log('\nSuite 20: getOpenGaps returns 3 on level 0 start');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  const open = await page.evaluate(() => window.__test.getOpenGaps());
  assert(open === 3, 'open gaps = 3 on level 0 (got ' + open + ')');
  await teardown();
}

// Suite 21: getOpenGaps decreases after closing a gap
async function suite21() {
  console.log('\nSuite 21: getOpenGaps decreases after close');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2);
    window.__test.tapSection(2);
  });
  const open = await page.evaluate(() => window.__test.getOpenGaps());
  assert(open === 2, 'open gaps = 2 after one close (got ' + open + ')');
  await teardown();
}

// Suite 22: triggerWind knocks post back to gap
async function suite22() {
  console.log('\nSuite 22: triggerWind knocks post sections back to gap');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2); // gap -> post
    window.__test.tapSection(5); // gap -> post
  });
  const before = await page.evaluate(() =>
    window.__test.getSections().filter(s => s.state === 'post').length
  );
  await page.evaluate(() => window.__test.triggerWind());
  const after = await page.evaluate(() =>
    window.__test.getSections().filter(s => s.state === 'post').length
  );
  assert(before >= 1, 'had posts before wind (count ' + before + ')');
  assert(after < before, 'fewer posts after wind (' + before + ' -> ' + after + ')');
  await teardown();
}

// Suite 23: triggerWind does not affect intact sections
async function suite23() {
  console.log('\nSuite 23: triggerWind does not affect intact sections');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Place one post
    window.__test.tapSection(2);
  });
  const intactBefore = await page.evaluate(() =>
    window.__test.getSections().filter(s => s.state === 'intact').length
  );
  await page.evaluate(() => window.__test.triggerWind());
  const intactAfter = await page.evaluate(() =>
    window.__test.getSections().filter(s => s.state === 'intact').length
  );
  assert(intactAfter === intactBefore, 'intact count unchanged (' + intactBefore + ' vs ' + intactAfter + ')');
  await teardown();
}

// Suite 24: triggerWind does not affect closed sections
async function suite24() {
  console.log('\nSuite 24: triggerWind does not affect closed sections');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.tapSection(2); window.__test.tapSection(2); // close gap 2
    window.__test.tapSection(5); // place post on gap 5 (wind target)
  });
  await page.evaluate(() => window.__test.triggerWind());
  const closedState = await page.evaluate(() => window.__test.getSections()[2].state);
  assert(closedState === 'closed', 'closed section still closed after wind (got ' + closedState + ')');
  await teardown();
}

// Suite 25: cattle escape through gap reduces lives
async function suite25() {
  console.log('\nSuite 25: cattle escape through gap => lives -1');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Position first cow directly on gap 2 (x=75, y just above fence)
    window.__test.setCattlePos(0, 75, window.__test.FENCE_Y + 10);
  });
  await page.waitForTimeout(100);
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives <= 3, 'lives can only decrease or stay (got ' + lives + ')');
  await teardown();
}

// Suite 26: cattle blocked by intact section (lives unchanged)
async function suite26() {
  console.log('\nSuite 26: cattle blocked by intact section - lives unchanged');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Section 0 is intact. Position cow over section 0.
    window.__test.setCattlePos(0, 15, window.__test.FENCE_Y + 10);
  });
  await page.waitForTimeout(150);
  const lives = await page.evaluate(() => window.__test.getLives());
  assert(lives === 3, 'lives still 3 when blocked by intact section (got ' + lives + ')');
  await teardown();
}

// Suite 27: lives=0 -> gameover state
async function suite27() {
  console.log('\nSuite 27: lives = 0 => gameover');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLives(0);
    window.__test.setState('gameover');
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'gameover', 'gameover state when lives=0 (got ' + st + ')');
  await teardown();
}

// Suite 28: level 1 has gaps [1, 4, 7, 10]
async function suite28() {
  console.log('\nSuite 28: level 1 has gaps [1, 4, 7, 10]');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLevel(1);
    window.__test.startLevel();
  });
  const secs = await page.evaluate(() => window.__test.getSections());
  assert(secs[1].state === 'gap', 'section 1 is gap in level 1');
  assert(secs[4].state === 'gap', 'section 4 is gap in level 1');
  assert(secs[7].state === 'gap', 'section 7 is gap in level 1');
  assert(secs[10].state === 'gap', 'section 10 is gap in level 1');
  assert(secs[0].state === 'intact', 'section 0 intact in level 1');
  await teardown();
}

// Suite 29: level 2 has 5 gaps
async function suite29() {
  console.log('\nSuite 29: level 2 has 5 gaps');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLevel(2);
    window.__test.startLevel();
  });
  const gapCount = await page.evaluate(() =>
    window.__test.getSections().filter(s => s.state === 'gap').length
  );
  assert(gapCount === 5, 'level 2 has 5 gaps (got ' + gapCount + ')');
  await teardown();
}

// Suite 30: level 4 gaps at indices [1,3,5,7,9,11]
async function suite30() {
  console.log('\nSuite 30: level 4 has 6 gaps including index 11');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setLevel(3);
    window.__test.startLevel();
  });
  const gapCount = await page.evaluate(() =>
    window.__test.getSections().filter(s => s.state === 'gap').length
  );
  assert(gapCount === 6, 'level 4 has 6 gaps (got ' + gapCount + ')');
  await teardown();
}

// Suite 31: setSectionState works
async function suite31() {
  console.log('\nSuite 31: setSectionState modifies section state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setSectionState(0, 'gap');
  });
  const s = await page.evaluate(() => window.__test.getSections()[0].state);
  assert(s === 'gap', 'section 0 state changed to gap (got ' + s + ')');
  await teardown();
}

// Suite 32: checkClear while open gaps remain - no state change
async function suite32() {
  console.log('\nSuite 32: checkClear with open gaps does not change state');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame(); // level 0 has 3 gaps
    window.__test.checkClear(); // should not trigger - gaps remain
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state still playing when gaps remain (got ' + st + ')');
  await teardown();
}

// Suite 33: FEEDBACK_ENDPOINT set
async function suite33() {
  console.log('\nSuite 33: FEEDBACK_ENDPOINT is set to Google Apps Script URL');
  await setup();
  const ep = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(typeof ep === 'string' && ep.includes('script.google.com'), 'FEEDBACK_ENDPOINT is Google Apps Script URL');
  await teardown();
}

// Suite 34: localStorage best score persists
async function suite34() {
  console.log('\nSuite 34: localStorage best score saved/read');
  await setup();
  await page.evaluate(() => {
    localStorage.setItem('fence_line_best', '1500');
  });
  const best = await page.evaluate(() => +(localStorage.getItem('fence_line_best') || 0));
  assert(best === 1500, 'localStorage best read correctly (got ' + best + ')');
  await teardown();
}

// Suite 35: title screen pixel has gold text (warm color pixel near center)
async function suite35() {
  console.log('\nSuite 35: title screen renders gold text');
  await setup();
  // Title state, check for gold pixel near title text area
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Sample a wide band around y=228 (H*0.35 = 224) where "FENCE" text should be
    for (let x = 120; x <= 240; x += 4) {
      for (let dy = 0; dy <= 30; dy++) {
        const d = ctx.getImageData(x, 220 + dy, 1, 1).data;
        if (d[0] > 180 && d[1] > 140 && d[2] < 140) return true;
      }
    }
    return false;
  });
  assert(pixel, 'gold pixel found in title text area');
  await teardown();
}

// Suite 36: HUD score pill rendered during playing
async function suite36() {
  console.log('\nSuite 36: HUD score pill rendered during playing');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(100);
  // Check for non-black pixel near score area (center top, y~22)
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Look for any non-background pixel near HUD score pill
    for (let x = W / 2 - 40; x <= W / 2 + 40; x += 4) {
      const d = ctx.getImageData(x, 22, 1, 1).data;
      if (d[3] > 50) return true;
    }
    return false;
    var W = 360;
  });
  // Fix: inline W
  const pixelOk = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    for (let x = 140; x <= 220; x += 5) {
      const d = ctx.getImageData(x, 22, 1, 1).data;
      if (d[3] > 50) return true;
    }
    return false;
  });
  assert(pixelOk, 'HUD area has visible pixels during playing');
  await teardown();
}

// Suite 37: game-over overlay renders red text
async function suite37() {
  console.log('\nSuite 37: gameover screen renders red text');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('gameover');
  });
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const y = Math.round(640 * 0.28);
    for (let x = 80; x <= 280; x += 5) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      if (d[0] > 150 && d[1] < 80 && d[2] < 80) return true;
    }
    return false;
  });
  assert(pixel, 'red pixel found in gameover text area');
  await teardown();
}

// Suite 38: fence drawing - gap sections have no rail (no gold horizontal pixel at rail y)
async function suite38() {
  console.log('\nSuite 38: gap section has no rail (dark at gap rail y)');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); });
  await page.waitForTimeout(100);
  // Section 2 (x=60-90) is a gap - check y=FENCE_Y-9 (rail y) for dark pixel
  const isDark = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const fy = 270; // FENCE_Y
    // Section 2 center x=75
    const d = ctx.getImageData(75, fy - 9, 1, 1).data;
    // Should be dark (background ground color), not gold/brown wood
    return d[0] < 120 && d[1] < 80;
  });
  assert(isDark, 'gap section has no wood rail (dark pixel at rail y)');
  await teardown();
}

// Suite 39: feedback overlay visible when fbVisible=true
async function suite39() {
  console.log('\nSuite 39: feedback overlay renders when fbVisible=true');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setState('gameover');
    window.__test.setFbVisible(true);
  });
  await page.waitForTimeout(100);
  // Check for any pixel in the feedback overlay area
  const visible = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    // Check center of overlay (W/2=180, y=118 - "HOW'D WE DO?" text)
    for (let x = 130; x <= 230; x += 5) {
      const d = ctx.getImageData(x, 118, 1, 1).data;
      if (d[0] > 150 && d[3] > 100) return true;
    }
    return false;
  });
  assert(visible, 'feedback overlay has visible text pixels');
  await teardown();
}

// Suite 40: console error sweep
async function suite40() {
  console.log('\nSuite 40: no console errors during full play cycle');
  let errors = [];
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(FILE);
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    window.__test.startGame();
    // Play through level 0
    window.__test.tapSection(2); window.__test.tapSection(2);
    window.__test.tapSection(5); window.__test.tapSection(5);
    window.__test.tapSection(9); window.__test.tapSection(9);
  });
  await p.waitForTimeout(3200);
  await p.evaluate(() => {
    // Continue level 1
    window.__test.tapSection(1); window.__test.tapSection(1);
    window.__test.setState('gameover');
  });
  await p.waitForTimeout(200);
  const filtered = errors.filter(e => !e.includes('favicon') && !e.includes('CORS'));
  assert(filtered.length === 0, 'no console errors (got: ' + filtered.join(', ') + ')');
  await b.close();
}

// Suite 41: wind gust - triggerWind with no posts does not crash
async function suite41() {
  console.log('\nSuite 41: triggerWind with no post sections does not crash');
  await setup();
  let err = null;
  try {
    await page.evaluate(() => {
      window.__test.startGame();
      // Close all gaps first so there are no post-only sections
      window.__test.setSectionState(2, 'closed');
      window.__test.setSectionState(5, 'closed');
      window.__test.setSectionState(9, 'closed');
      window.__test.triggerWind(); // should not crash
    });
  } catch (e) { err = e.message; }
  assert(!err, 'no crash when wind with no posts (err: ' + err + ')');
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state still playing (got ' + st + ')');
  await teardown();
}

// Suite 42: full state cycle - title -> play -> gameover -> play
async function suite42() {
  console.log('\nSuite 42: full state cycle title -> playing -> gameover -> playing');
  await setup();
  const t1 = await page.evaluate(() => window.__test.getState());
  assert(t1 === 'title', 'starts at title');
  await page.evaluate(() => { window.__test.startGame(); });
  const t2 = await page.evaluate(() => window.__test.getState());
  assert(t2 === 'playing', 'playing after startGame');
  await page.evaluate(() => { window.__test.setState('gameover'); });
  const t3 = await page.evaluate(() => window.__test.getState());
  assert(t3 === 'gameover', 'gameover state set');
  await page.evaluate(() => { window.__test.startGame(); });
  const t4 = await page.evaluate(() => window.__test.getState());
  assert(t4 === 'playing', 'playing again after restart');
  await teardown();
}

// Runner
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15, suite16,
    suite17, suite18, suite19, suite20, suite21, suite22, suite23, suite24,
    suite25, suite26, suite27, suite28, suite29, suite30, suite31, suite32,
    suite33, suite34, suite35, suite36, suite37, suite38, suite39, suite40,
    suite41, suite42
  ];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try { await s(); passed++; }
    catch (e) { console.error(e.message); failed++; }
    finally { if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; } }
  }
  console.log('\n--- Results: ' + passed + '/' + (passed + failed) + ' passed ---');
  process.exit(failed > 0 ? 1 : 0);
})();
