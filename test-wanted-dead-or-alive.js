// Playwright tests for Wanted: Dead or Alive (Game 21)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'wanted-dead-or-alive.html').replace(/\\/g, '/');
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
  assert(st === 'title', 'initial state is title');
  await teardown();
}

// Suite 2: Canvas dimensions 360x640
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions 360x640');
  await setup();
  const dims = await page.evaluate(() => {
    const c = document.getElementById('c');
    return { w: c.width, h: c.height };
  });
  assert(dims.w === 360, 'canvas width is 360');
  assert(dims.h === 640, 'canvas height is 640');
  await teardown();
}

// Suite 3: startGame transitions to playing
async function suite3() {
  console.log('\nSuite 3: startGame transitions to playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'state is playing after startGame');
  await teardown();
}

// Suite 4: startGame resets score to 0
async function suite4() {
  console.log('\nSuite 4: startGame resets score to 0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.startGame();
  });
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 0, 'score reset to 0 on startGame (got ' + sc + ')');
  await teardown();
}

// Suite 5: startGame resets timer to TOTAL_TIME
async function suite5() {
  console.log('\nSuite 5: startGame resets timer');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTimer(10);
    window.__test.startGame();
  });
  const t = await page.evaluate(() => window.__test.getTimer());
  const tt = await page.evaluate(() => window.__test.TOTAL_TIME);
  assert(t === tt, 'timer reset to TOTAL_TIME (got ' + t + ')');
  await teardown();
}

// Suite 6: startGame resets confidence to 0
async function suite6() {
  console.log('\nSuite 6: startGame resets confidence');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setConfidence(0.8);
    window.__test.startGame();
  });
  const cv = await page.evaluate(() => window.__test.getConfidence());
  assert(cv === 0, 'confidence reset to 0 (got ' + cv + ')');
  await teardown();
}

// Suite 7: 8 suspects generated
async function suite7() {
  console.log('\nSuite 7: 8 suspects generated');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const n = await page.evaluate(() => window.__test.getSuspects().length);
  assert(n === 8, '8 suspects generated (got ' + n + ')');
  await teardown();
}

// Suite 8: Exactly one suspect is the fugitive
async function suite8() {
  console.log('\nSuite 8: Exactly one fugitive');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const fugs = await page.evaluate(() => window.__test.getSuspects().filter(s => s.isFugitive).length);
  assert(fugs === 1, 'exactly 1 fugitive among suspects (got ' + fugs + ')');
  await teardown();
}

// Suite 9: Fugitive features match getFugFeatures
async function suite9() {
  console.log('\nSuite 9: Fugitive has correct features');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ok = await page.evaluate(() => {
    const fid = window.__test.getFugitiveId();
    const s = window.__test.getSuspects()[fid];
    const f = window.__test.getFugFeatures();
    return s.hat === f.hat && s.coat === f.coat && s.build === f.build && s.hasScar === f.scar;
  });
  assert(ok, 'fugitive suspect features match fugFeatures');
  await teardown();
}

// Suite 10: 5 locations defined
async function suite10() {
  console.log('\nSuite 10: 5 locations defined');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const n = await page.evaluate(() => window.__test.getLocations().length);
  assert(n === 5, '5 locations (got ' + n + ')');
  await teardown();
}

// Suite 11: All 8 suspects assigned to a location
async function suite11() {
  console.log('\nSuite 11: All suspects have a locIdx');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const allAssigned = await page.evaluate(() =>
    window.__test.getSuspects().every(s => s.locIdx >= 0 && s.locIdx < 5)
  );
  assert(allAssigned, 'all suspects have valid locIdx (0-4)');
  await teardown();
}

// Suite 12: LOC_NAMES has 5 entries
async function suite12() {
  console.log('\nSuite 12: LOC_NAMES has 5 entries');
  await setup();
  const n = await page.evaluate(() => window.__test.LOC_NAMES.length);
  assert(n === 5, 'LOC_NAMES has 5 entries (got ' + n + ')');
  await teardown();
}

// Suite 13: ACCUSE_THRESHOLD is between 0 and 1
async function suite13() {
  console.log('\nSuite 13: ACCUSE_THRESHOLD valid');
  await setup();
  const at = await page.evaluate(() => window.__test.ACCUSE_THRESHOLD);
  assert(at > 0 && at < 1, 'ACCUSE_THRESHOLD is between 0 and 1 (got ' + at + ')');
  await teardown();
}

// Suite 14: TOTAL_TIME > 0
async function suite14() {
  console.log('\nSuite 14: TOTAL_TIME > 0');
  await setup();
  const tt = await page.evaluate(() => window.__test.TOTAL_TIME);
  assert(typeof tt === 'number' && tt > 0, 'TOTAL_TIME is positive (got ' + tt + ')');
  await teardown();
}

// Suite 15: tickTime decrements timer
async function suite15() {
  console.log('\nSuite 15: tickTime decrements timer');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => window.__test.getTimer());
  await page.evaluate(() => window.__test.tickTime(5.0));
  const after = await page.evaluate(() => window.__test.getTimer());
  assert(after < before, 'timer decreased after tickTime (before=' + before + ', after=' + after + ')');
  await teardown();
}

// Suite 16: Timer reaching 0 triggers lose
async function suite16() {
  console.log('\nSuite 16: Timer = 0 triggers lose');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTimer(0.01);
    window.__test.tickTime(0.5);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose when timer runs out (got ' + st + ')');
  await teardown();
}

// Suite 17: Timeout sets loseReason to "timeout"
async function suite17() {
  console.log('\nSuite 17: loseReason is timeout on timer expiry');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setTimer(0.01);
    window.__test.tickTime(0.5);
  });
  const lr = await page.evaluate(() => window.__test.getLoseReason());
  assert(lr === 'timeout', 'loseReason is timeout (got ' + lr + ')');
  await teardown();
}

// Suite 18: Interviewing a witness adds confidence
async function suite18() {
  console.log('\nSuite 18: Interview witness adds confidence');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const fidBefore = await page.evaluate(() => window.__test.getConfidence());
  // Find a non-fugitive suspect id
  const witId = await page.evaluate(() => {
    const s = window.__test.getSuspects().find(s => !s.isFugitive);
    return s ? s.id : -1;
  });
  assert(witId >= 0, 'found a non-fugitive witness');
  await page.evaluate(id => window.__test.interviewSuspect(id), witId);
  const confAfter = await page.evaluate(() => window.__test.getConfidence());
  assert(confAfter > fidBefore, 'confidence increased after witness interview (' + fidBefore + '->' + confAfter + ')');
  await teardown();
}

// Suite 19: Clue weight matches CLUE_WEIGHT constant
async function suite19() {
  console.log('\nSuite 19: Clue weight matches CLUE_WEIGHT');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const witId = await page.evaluate(() => window.__test.getSuspects().find(s => !s.isFugitive).id);
  await page.evaluate(id => window.__test.interviewSuspect(id), witId);
  const cv = await page.evaluate(() => window.__test.getConfidence());
  const cw = await page.evaluate(() => window.__test.CLUE_WEIGHT);
  assert(Math.abs(cv - cw) < 0.001, 'confidence == CLUE_WEIGHT after one witness (' + cv + ' vs ' + cw + ')');
  await teardown();
}

// Suite 20: Interviewing same suspect twice doesn't double-count
async function suite20() {
  console.log('\nSuite 20: No double-count from same suspect');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const witId = await page.evaluate(() => window.__test.getSuspects().find(s => !s.isFugitive).id);
  await page.evaluate(id => {
    window.__test.interviewSuspect(id);
    window.__test.interviewSuspect(id); // second call should not add confidence
  }, witId);
  const cv = await page.evaluate(() => window.__test.getConfidence());
  const cw = await page.evaluate(() => window.__test.CLUE_WEIGHT);
  assert(Math.abs(cv - cw) < 0.001, 'double interview did not double confidence (got ' + cv + ', expected ' + cw + ')');
  await teardown();
}

// Suite 21: Interviewing the fugitive adds FUGITIVE_SUSPICION
async function suite21() {
  console.log('\nSuite 21: Interviewing fugitive adds FUGITIVE_SUSPICION');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const fugId = await page.evaluate(() => window.__test.getFugitiveId());
  await page.evaluate(id => window.__test.interviewSuspect(id), fugId);
  const cv = await page.evaluate(() => window.__test.getConfidence());
  const fs = await page.evaluate(() => window.__test.FUGITIVE_SUSPICION);
  assert(Math.abs(cv - fs) < 0.001, 'interviewing fugitive adds FUGITIVE_SUSPICION (' + cv + ' vs ' + fs + ')');
  await teardown();
}

// Suite 22: Examining evidence adds confidence
async function suite22() {
  console.log('\nSuite 22: Examine evidence adds confidence');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const evLoc = await page.evaluate(() => {
    const locs = window.__test.getLocations();
    const li = locs.findIndex(l => l.evidence !== null);
    return li;
  });
  assert(evLoc >= 0, 'at least one location has evidence');
  const before = await page.evaluate(() => window.__test.getConfidence());
  await page.evaluate(li => window.__test.examineEvidence(li), evLoc);
  const after = await page.evaluate(() => window.__test.getConfidence());
  assert(after > before, 'confidence increased after examining evidence (' + before + '->' + after + ')');
  await teardown();
}

// Suite 23: Evidence weight matches EVIDENCE_WEIGHT
async function suite23() {
  console.log('\nSuite 23: Evidence weight matches EVIDENCE_WEIGHT');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const evLoc = await page.evaluate(() => window.__test.getLocations().findIndex(l => l.evidence !== null));
  await page.evaluate(li => window.__test.examineEvidence(li), evLoc);
  const cv = await page.evaluate(() => window.__test.getConfidence());
  const ew = await page.evaluate(() => window.__test.EVIDENCE_WEIGHT);
  assert(Math.abs(cv - ew) < 0.001, 'confidence == EVIDENCE_WEIGHT after one evidence (got ' + cv + ')');
  await teardown();
}

// Suite 24: Examining same evidence twice doesn't double-count
async function suite24() {
  console.log('\nSuite 24: No double-count from same evidence');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const evLoc = await page.evaluate(() => window.__test.getLocations().findIndex(l => l.evidence !== null));
  await page.evaluate(li => {
    window.__test.examineEvidence(li);
    window.__test.examineEvidence(li);
  }, evLoc);
  const cv = await page.evaluate(() => window.__test.getConfidence());
  const ew = await page.evaluate(() => window.__test.EVIDENCE_WEIGHT);
  assert(Math.abs(cv - ew) < 0.001, 'double examine did not double confidence (got ' + cv + ')');
  await teardown();
}

// Suite 25: Confidence is capped at 1.0
async function suite25() {
  console.log('\nSuite 25: Confidence capped at 1.0');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setConfidence(0.95);
    const witId = window.__test.getSuspects().find(s => !s.isFugitive).id;
    window.__test.interviewSuspect(witId);
  });
  const cv = await page.evaluate(() => window.__test.getConfidence());
  assert(cv <= 1.0, 'confidence not above 1.0 (got ' + cv + ')');
  await teardown();
}

// Suite 26: Correct accusation triggers win
async function suite26() {
  console.log('\nSuite 26: Correct accusation wins');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const fugId = await page.evaluate(() => window.__test.getFugitiveId());
  await page.evaluate(id => {
    window.__test.setConfidence(0.80);
    window.__test.accuseSuspect(id);
  }, fugId);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'win', 'state is win after correct accusation (got ' + st + ')');
  await teardown();
}

// Suite 27: Win sets score > 0
async function suite27() {
  console.log('\nSuite 27: Win sets positive score');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const fugId = await page.evaluate(() => window.__test.getFugitiveId());
  await page.evaluate(id => {
    window.__test.setConfidence(0.80);
    window.__test.accuseSuspect(id);
  }, fugId);
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0, 'score > 0 after win (got ' + sc + ')');
  await teardown();
}

// Suite 28: Wrong accusation reduces confidence by 0.30
async function suite28() {
  console.log('\nSuite 28: Wrong accusation -30% confidence');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const notFugId = await page.evaluate(() => window.__test.getSuspects().find(s => !s.isFugitive).id);
  await page.evaluate(id => {
    window.__test.setConfidence(0.80);
    window.__test.accuseSuspect(id);
  }, notFugId);
  const cv = await page.evaluate(() => window.__test.getConfidence());
  assert(Math.abs(cv - 0.50) < 0.001, 'confidence reduced by 0.30 after wrong (0.80 - 0.30 = 0.50, got ' + cv + ')');
  await teardown();
}

// Suite 29: Wrong accusation increments wrongStrikes
async function suite29() {
  console.log('\nSuite 29: Wrong accusation increments wrongStrikes');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const notFugId = await page.evaluate(() => window.__test.getSuspects().find(s => !s.isFugitive).id);
  await page.evaluate(id => window.__test.accuseSuspect(id), notFugId);
  const ws = await page.evaluate(() => window.__test.getWrongStrikes());
  assert(ws === 1, 'wrongStrikes is 1 after one wrong accusation (got ' + ws + ')');
  await teardown();
}

// Suite 30: Two wrong accusations trigger lose
async function suite30() {
  console.log('\nSuite 30: Two wrong accusations lose');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    const nonFugs = window.__test.getSuspects().filter(s => !s.isFugitive);
    window.__test.accuseSuspect(nonFugs[0].id);
    window.__test.accuseSuspect(nonFugs[1].id);
  });
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'state is lose after 2 wrong accusations (got ' + st + ')');
  await teardown();
}

// Suite 31: Two wrong accusations set loseReason to "wrongaccuse"
async function suite31() {
  console.log('\nSuite 31: loseReason is wrongaccuse after 2 wrong');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    const nf = window.__test.getSuspects().filter(s => !s.isFugitive);
    window.__test.accuseSuspect(nf[0].id);
    window.__test.accuseSuspect(nf[1].id);
  });
  const lr = await page.evaluate(() => window.__test.getLoseReason());
  assert(lr === 'wrongaccuse', 'loseReason is wrongaccuse (got ' + lr + ')');
  await teardown();
}

// Suite 32: navigate changes currentLoc
async function suite32() {
  console.log('\nSuite 32: navigate changes currentLoc');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.navigate(1));
  const loc = await page.evaluate(() => window.__test.getCurrentLoc());
  assert(loc === 1, 'currentLoc is 1 after navigate(1) (got ' + loc + ')');
  await teardown();
}

// Suite 33: navigate clamps at 0
async function suite33() {
  console.log('\nSuite 33: navigate clamps at left boundary');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.navigate(-1));
  const loc = await page.evaluate(() => window.__test.getCurrentLoc());
  assert(loc === 0, 'currentLoc stays 0 at left boundary (got ' + loc + ')');
  await teardown();
}

// Suite 34: navigate clamps at NUM_LOCS - 1
async function suite34() {
  console.log('\nSuite 34: navigate clamps at right boundary');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) window.__test.navigate(1);
  });
  const loc = await page.evaluate(() => window.__test.getCurrentLoc());
  const max = await page.evaluate(() => window.__test.NUM_LOCS - 1);
  assert(loc === max, 'currentLoc clamps at NUM_LOCS-1 (got ' + loc + ', max ' + max + ')');
  await teardown();
}

// Suite 35: Each suspect has valid hat, coat, build features
async function suite35() {
  console.log('\nSuite 35: All suspects have valid features');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const valid = await page.evaluate(() =>
    window.__test.getSuspects().every(s =>
      [0, 1].includes(s.hat) &&
      [0, 1].includes(s.coat) &&
      [0, 1].includes(s.build) &&
      typeof s.hasScar === 'boolean'
    )
  );
  assert(valid, 'all suspects have hat/coat/build in [0,1] and hasScar boolean');
  await teardown();
}

// Suite 36: startGame resets wrongStrikes to 0
async function suite36() {
  console.log('\nSuite 36: startGame resets wrongStrikes');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWrongStrikes(2);
    window.__test.startGame();
  });
  const ws = await page.evaluate(() => window.__test.getWrongStrikes());
  assert(ws === 0, 'wrongStrikes reset to 0 on startGame (got ' + ws + ')');
  await teardown();
}

// Suite 37: startGame resets accuseMode to false
async function suite37() {
  console.log('\nSuite 37: startGame resets accuseMode');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setAccuseMode(true);
    window.__test.startGame();
  });
  const am = await page.evaluate(() => window.__test.getAccuseMode());
  assert(am === false, 'accuseMode is false after startGame (got ' + am + ')');
  await teardown();
}

// Suite 38: FEAT_HATS has 2 entries
async function suite38() {
  console.log('\nSuite 38: FEAT_HATS has 2 entries');
  await setup();
  const n = await page.evaluate(() => window.__test.FEAT_HATS.length);
  assert(n === 2, 'FEAT_HATS has 2 entries (got ' + n + ')');
  await teardown();
}

// Suite 39: FEAT_COATS has 2 entries
async function suite39() {
  console.log('\nSuite 39: FEAT_COATS has 2 entries');
  await setup();
  const n = await page.evaluate(() => window.__test.FEAT_COATS.length);
  assert(n === 2, 'FEAT_COATS has 2 entries (got ' + n + ')');
  await teardown();
}

// Suite 40: Confidence builds across multiple witnesses
async function suite40() {
  console.log('\nSuite 40: Confidence builds across multiple witnesses');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const confAfter = await page.evaluate(() => {
    const nonFugs = window.__test.getSuspects().filter(s => !s.isFugitive).slice(0, 3);
    nonFugs.forEach(s => window.__test.interviewSuspect(s.id));
    return window.__test.getConfidence();
  });
  const cw = await page.evaluate(() => window.__test.CLUE_WEIGHT);
  assert(confAfter >= cw * 3 - 0.001, '3 witness interviews add 3× CLUE_WEIGHT (got ' + confAfter + ', expected >=' + (cw*3) + ')');
  await teardown();
}

// Suite 41: Popup spawned after interview
async function suite41() {
  console.log('\nSuite 41: Popup spawned after interview');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const witId = await page.evaluate(() => window.__test.getSuspects().find(s => !s.isFugitive).id);
  await page.evaluate(id => window.__test.interviewSuspect(id), witId);
  const pops = await page.evaluate(() => window.__test.getPopups());
  assert(pops.length > 0, 'popup spawned after interview (got ' + pops.length + ')');
  await teardown();
}

// Suite 42: Each location has at least 1 NPC
async function suite42() {
  console.log('\nSuite 42: Each location has >= 1 NPC');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const allHaveNpc = await page.evaluate(() =>
    window.__test.getLocations().every(l => l.npcs.length >= 1)
  );
  assert(allHaveNpc, 'every location has at least 1 NPC');
  await teardown();
}

// Suite 43: HUD has non-black pixels in confidence bar area
async function suite43() {
  console.log('\nSuite 43: HUD confidence bar has colored pixels');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setConfidence(0.5);
  });
  await page.waitForTimeout(200);
  const found = await page.evaluate(() => {
    const cv = document.getElementById('c');
    // Confidence bar is at SCENE_BOT+55 = (640-145)+55 = 550
    const d = cv.getContext('2d').getImageData(14, 548, 150, 18).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 60 || d[i+1] > 40 || d[i+2] > 10) return true;
    }
    return false;
  });
  assert(found, 'confidence bar area has non-black pixels at 50% confidence');
  await teardown();
}

// Suite 44: FEEDBACK_ENDPOINT is Google Apps Script URL
async function suite44() {
  console.log('\nSuite 44: FEEDBACK_ENDPOINT set');
  await setup();
  const ok = await page.evaluate(() =>
    typeof FEEDBACK_ENDPOINT === 'string' && FEEDBACK_ENDPOINT.includes('script.google.com')
  );
  assert(ok, 'FEEDBACK_ENDPOINT is a Google Apps Script URL');
  await teardown();
}

// Suite 45: State cycle: title -> playing -> lose -> playing
async function suite45() {
  console.log('\nSuite 45: State cycle title -> playing -> lose -> playing');
  await setup();
  let st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'starts at title');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'goes to playing');
  await page.evaluate(() => {
    window.__test.setTimer(0.01);
    window.__test.tickTime(0.5);
  });
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'lose', 'goes to lose on timeout');
  await page.evaluate(() => window.__test.startGame());
  st = await page.evaluate(() => window.__test.getState());
  assert(st === 'playing', 'restarts to playing');
  await teardown();
}

// Suite 46: Win sets localStorage best score
async function suite46() {
  console.log('\nSuite 46: Win stores best score in localStorage');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const fugId = await page.evaluate(() => window.__test.getFugitiveId());
  await page.evaluate(id => {
    window.__test.setConfidence(0.8);
    window.__test.setTimer(30);
    window.__test.accuseSuspect(id);
  }, fugId);
  const stored = await page.evaluate(() => localStorage.getItem('wanted_dead_or_alive_best'));
  assert(stored !== null, 'localStorage has wanted_dead_or_alive_best after win');
  assert(parseInt(stored, 10) > 0, 'stored best score > 0 (got ' + stored + ')');
  await teardown();
}

// Suite 47: Console error sweep
async function suite47() {
  console.log('\nSuite 47: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const bCtx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await bCtx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(FILE);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(300);

  // Interview a witness
  const witId = await page.evaluate(() => window.__test.getSuspects().find(s => !s.isFugitive).id);
  await page.evaluate(id => window.__test.interviewSuspect(id), witId);
  await page.waitForTimeout(200);

  // Navigate to next loc
  await page.evaluate(() => window.__test.navigate(1));
  await page.waitForTimeout(200);

  // Win the game
  const fugId = await page.evaluate(() => window.__test.getFugitiveId());
  await page.evaluate(id => {
    window.__test.setConfidence(0.8);
    window.__test.accuseSuspect(id);
  }, fugId);
  await page.waitForTimeout(300);

  const filtered = errors.filter(e =>
    !e.includes('CORS') && !e.includes('net::ERR_FAILED') && !e.includes('favicon')
  );
  assert(filtered.length === 0, 'no console errors (got: ' + filtered.join(', ') + ')');
  await teardown();
}

// Runner
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5,
    suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15,
    suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25,
    suite26, suite27, suite28, suite29, suite30,
    suite31, suite32, suite33, suite34, suite35,
    suite36, suite37, suite38, suite39, suite40,
    suite41, suite42, suite43, suite44, suite45,
    suite46, suite47,
  ];
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (err) {
      console.error('\n' + err.message);
      failed++;
      if (browser) { try { await browser.close(); } catch (_) {} browser = null; page = null; }
    }
  }
  console.log('\n' + passed + '/' + (passed + failed) + ' tests pass');
  process.exit(failed > 0 ? 1 : 0);
})();
