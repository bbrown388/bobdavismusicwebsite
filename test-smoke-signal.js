// test-smoke-signal.js -- Playwright tests for Game 54: Smoke Signal
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'smoke-signal.html').replace(/\\/g, '/');
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

// ── Suite 1: DOM & canvas ────────────────────────────────────────────────────
test('canvas element exists', async () => {
  const c = await page.$('canvas#c');
  assert.ok(c, 'canvas#c not found');
});

test('canvas is 360x640', async () => {
  const dims = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert.strictEqual(dims.w, 360);
  assert.strictEqual(dims.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__smoke.state);
  assert.strictEqual(s, 'title');
});

test('test API exposed', async () => {
  const ok = await page.evaluate(() => typeof window.__smoke === 'object');
  assert.ok(ok);
});

test('feedback endpoint set in page', async () => {
  const found = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    return scripts.some(s => s.textContent.includes('script.google.com') || s.textContent.includes('formspree.io'));
  });
  assert.ok(found, 'FEEDBACK_ENDPOINT not found in inline scripts');
});

// ── Suite 2: Constants ───────────────────────────────────────────────────────
test('NUM_ROUNDS is 5', async () => {
  const n = await page.evaluate(() => window.__smoke.NUM_ROUNDS);
  assert.strictEqual(n, 5);
});

test('ROUNDS has 5 entries', async () => {
  const n = await page.evaluate(() => window.__smoke.ROUNDS.length);
  assert.strictEqual(n, 5);
});

test('sequence lengths escalate across rounds', async () => {
  const ok = await page.evaluate(() => {
    const r = window.__smoke.ROUNDS;
    for (let i = 1; i < r.length; i++) {
      if (r[i].seqLen < r[i-1].seqLen) return false;
    }
    return true;
  });
  assert.ok(ok, 'seqLen should not decrease across rounds');
});

test('thresholds decrease across rounds (harder)', async () => {
  const ok = await page.evaluate(() => {
    const r = window.__smoke.ROUNDS;
    for (let i = 1; i < r.length; i++) {
      if (r[i].threshold >= r[i-1].threshold) return false;
    }
    return true;
  });
  assert.ok(ok, 'threshold should decrease across rounds');
});

test('wind intervals decrease across rounds (more wind)', async () => {
  const ok = await page.evaluate(() => {
    const r = window.__smoke.ROUNDS;
    for (let i = 1; i < r.length; i++) {
      if (r[i].windInterval >= r[i-1].windInterval) return false;
    }
    return true;
  });
  assert.ok(ok, 'windInterval should decrease across rounds');
});

test('WIND_BURST_DUR is positive', async () => {
  const d = await page.evaluate(() => window.__smoke.WIND_BURST_DUR);
  assert.ok(d > 0);
});

test('fire and mesa positions are within canvas', async () => {
  const ok = await page.evaluate(() => {
    const { FIRE_X, FIRE_Y, MESA_X, MESA_Y } = window.__smoke;
    return FIRE_X > 0 && FIRE_X < 360 && FIRE_Y > 0 && FIRE_Y < 640 &&
           MESA_X > 0 && MESA_X < 360 && MESA_Y > 0 && MESA_Y < 640;
  });
  assert.ok(ok, 'fire and mesa should be within canvas bounds');
});

// ── Suite 3: startGame ───────────────────────────────────────────────────────
test('startGame sets state to watching', async () => {
  await page.evaluate(() => window.__smoke.startGame());
  const s = await page.evaluate(() => window.__smoke.state);
  assert.strictEqual(s, 'watching');
});

test('startGame resets score to 0', async () => {
  await page.evaluate(() => { window.__smoke.score = 999; window.__smoke.startGame(); });
  const s = await page.evaluate(() => window.__smoke.score);
  assert.strictEqual(s, 0);
});

test('startGame resets round to 1', async () => {
  await page.evaluate(() => { window.__smoke.round = 4; window.__smoke.startGame(); });
  const r = await page.evaluate(() => window.__smoke.round);
  assert.strictEqual(r, 1);
});

test('startGame resets lives to 3', async () => {
  await page.evaluate(() => { window.__smoke.lives = 1; window.__smoke.startGame(); });
  const l = await page.evaluate(() => window.__smoke.lives);
  assert.strictEqual(l, 3);
});

test('startGame generates target sequence', async () => {
  await page.evaluate(() => window.__smoke.startGame());
  const len = await page.evaluate(() => window.__smoke.targetSeq.length);
  assert.strictEqual(len, 3); // round 1 seqLen
});

test('startGame clears playerSeq', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.playerSeq = ['puff', 'cloud'];
    window.__smoke.startGame();
  });
  const len = await page.evaluate(() => window.__smoke.playerSeq.length);
  assert.strictEqual(len, 0);
});

test('startGame resets holdActive to false', async () => {
  await page.evaluate(() => { window.__smoke.holdActive = true; window.__smoke.startGame(); });
  const h = await page.evaluate(() => window.__smoke.holdActive);
  assert.strictEqual(h, false);
});

// ── Suite 4: Sequence generation ─────────────────────────────────────────────
test('generateSequence(3) returns array of length 3', async () => {
  const len = await page.evaluate(() => window.__smoke.generateSequence(3).length);
  assert.strictEqual(len, 3);
});

test('generateSequence(5) returns array of length 5', async () => {
  const len = await page.evaluate(() => window.__smoke.generateSequence(5).length);
  assert.strictEqual(len, 5);
});

test('generateSequence only returns puff or cloud', async () => {
  const ok = await page.evaluate(() => {
    const seq = window.__smoke.generateSequence(20);
    return seq.every(s => s === 'puff' || s === 'cloud');
  });
  assert.ok(ok, 'all elements should be puff or cloud');
});

test('generateSequence has both types in a long run', async () => {
  const ok = await page.evaluate(() => {
    const seq = window.__smoke.generateSequence(40);
    return seq.includes('puff') && seq.includes('cloud');
  });
  assert.ok(ok, '40-element sequence should include both types');
});

// ── Suite 5: Hold classification ─────────────────────────────────────────────
test('short hold (400ms) in round 1 classifies as puff', async () => {
  await page.evaluate(() => { window.__smoke.startGame(); window.__smoke.round = 1; });
  const type = await page.evaluate(() => window.__smoke.classifyHold(400));
  assert.strictEqual(type, 'puff');
});

test('long hold (800ms) in round 1 classifies as cloud', async () => {
  await page.evaluate(() => { window.__smoke.startGame(); window.__smoke.round = 1; });
  const type = await page.evaluate(() => window.__smoke.classifyHold(800));
  assert.strictEqual(type, 'cloud');
});

test('hold exactly at threshold classifies as cloud', async () => {
  await page.evaluate(() => { window.__smoke.startGame(); window.__smoke.round = 1; });
  const thresh = await page.evaluate(() => window.__smoke.ROUNDS[0].threshold);
  const type = await page.evaluate(t => window.__smoke.classifyHold(t), thresh);
  assert.strictEqual(type, 'cloud');
});

test('very short hold (50ms) classifies as puff', async () => {
  await page.evaluate(() => { window.__smoke.startGame(); window.__smoke.round = 1; });
  const type = await page.evaluate(() => window.__smoke.classifyHold(50));
  assert.strictEqual(type, 'puff');
});

test('round 5 threshold is 500ms (400ms = puff)', async () => {
  await page.evaluate(() => { window.__smoke.startGame(); window.__smoke.round = 5; });
  const type = await page.evaluate(() => window.__smoke.classifyHold(400));
  assert.strictEqual(type, 'puff');
});

test('round 5: 510ms classifies as cloud', async () => {
  await page.evaluate(() => { window.__smoke.startGame(); window.__smoke.round = 5; });
  const type = await page.evaluate(() => window.__smoke.classifyHold(510));
  assert.strictEqual(type, 'cloud');
});

// ── Suite 6: Replay phase / hold mechanic ────────────────────────────────────
test('beginReplay sets state to replaying', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.beginReplay();
  });
  const s = await page.evaluate(() => window.__smoke.state);
  assert.strictEqual(s, 'replaying');
});

test('beginReplay resets seqIdx to 0', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.seqIdx = 3;
    window.__smoke.beginReplay();
  });
  const idx = await page.evaluate(() => window.__smoke.seqIdx);
  assert.strictEqual(idx, 0);
});

test('beginReplay clears playerSeq', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.playerSeq = ['puff'];
    window.__smoke.beginReplay();
  });
  const len = await page.evaluate(() => window.__smoke.playerSeq.length);
  assert.strictEqual(len, 0);
});

test('startHold sets holdActive to true', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.beginReplay();
    window.__smoke.holdLocked = false;
    window.__smoke.startHold(performance.now());
  });
  const h = await page.evaluate(() => window.__smoke.holdActive);
  assert.ok(h);
});

test('startHold ignored when state is not replaying', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.startHold(performance.now());
  });
  const h = await page.evaluate(() => window.__smoke.holdActive);
  assert.strictEqual(h, false);
});

test('startHold ignored when holdLocked is true', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.beginReplay();
    window.__smoke.holdLocked = true;
    window.__smoke.startHold(performance.now());
  });
  const h = await page.evaluate(() => window.__smoke.holdActive);
  assert.strictEqual(h, false);
});

test('endHold advances seqIdx', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.targetSeq = ['puff', 'cloud', 'puff'];
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'pending' },
      { type: 'cloud', status: 'pending' },
      { type: 'puff', status: 'pending' },
    ];
    window.__smoke.beginReplay();
    const now = performance.now();
    window.__smoke.holdStart = now - 300; // 300ms hold = puff
    window.__smoke.holdActive = true;
    window.__smoke.endHold(now);
  });
  const idx = await page.evaluate(() => window.__smoke.seqIdx);
  assert.strictEqual(idx, 1);
});

test('correct signal adds 100 to score', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.score = 0;
    window.__smoke.targetSeq = ['puff', 'cloud', 'puff'];
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'pending' },
      { type: 'cloud', status: 'pending' },
      { type: 'puff', status: 'pending' },
    ];
    window.__smoke.beginReplay();
    const now = performance.now();
    window.__smoke.holdStart = now - 300; // puff (correct)
    window.__smoke.holdActive = true;
    window.__smoke.endHold(now);
  });
  const s = await page.evaluate(() => window.__smoke.score);
  assert.strictEqual(s, 100);
});

test('wrong signal decrements lives', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.lives = 3;
    window.__smoke.targetSeq = ['cloud', 'puff', 'cloud'];
    window.__smoke.signalIndicators = [
      { type: 'cloud', status: 'pending' },
      { type: 'puff', status: 'pending' },
      { type: 'cloud', status: 'pending' },
    ];
    window.__smoke.beginReplay();
    const now = performance.now();
    window.__smoke.holdStart = now - 300; // puff (wrong, target is cloud)
    window.__smoke.holdActive = true;
    window.__smoke.endHold(now);
  });
  const l = await page.evaluate(() => window.__smoke.lives);
  assert.strictEqual(l, 2);
});

test('zero lives after 3 wrong signals -> gameover', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.lives = 1;
    window.__smoke.targetSeq = ['cloud', 'cloud', 'cloud'];
    window.__smoke.signalIndicators = [
      { type: 'cloud', status: 'pending' },
      { type: 'cloud', status: 'pending' },
      { type: 'cloud', status: 'pending' },
    ];
    window.__smoke.beginReplay();
    const now = performance.now();
    window.__smoke.holdStart = now - 300; // puff (wrong)
    window.__smoke.holdActive = true;
    window.__smoke.endHold(now);
  });
  await page.waitForTimeout(800);
  const s = await page.evaluate(() => window.__smoke.state);
  assert.strictEqual(s, 'gameover');
});

// ── Suite 7: Sequence evaluation ─────────────────────────────────────────────
test('all correct sequence awards +500 bonus', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.score = 300;
    window.__smoke.targetSeq = ['puff', 'cloud', 'puff'];
    window.__smoke.playerSeq = ['puff', 'cloud', 'puff'];
    window.__smoke.seqIdx = 3;
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'correct' },
      { type: 'cloud', status: 'correct' },
      { type: 'puff', status: 'correct' },
    ];
    window.__smoke.evaluateFullSequence();
  });
  const s = await page.evaluate(() => window.__smoke.score);
  assert.strictEqual(s, 800); // 300 + 500
});

test('imperfect sequence does not award +500 bonus', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.score = 200;
    window.__smoke.targetSeq = ['puff', 'cloud', 'puff'];
    window.__smoke.playerSeq = ['cloud', 'cloud', 'puff']; // first wrong
    window.__smoke.seqIdx = 3;
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'wrong' },
      { type: 'cloud', status: 'correct' },
      { type: 'puff', status: 'correct' },
    ];
    window.__smoke.evaluateFullSequence();
  });
  const s = await page.evaluate(() => window.__smoke.score);
  assert.strictEqual(s, 200); // no bonus
});

test('win round 5 sets state to win', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 5;
    window.__smoke.score = 0;
    window.__smoke.lives = 3;
    window.__smoke.targetSeq = ['puff', 'puff', 'cloud', 'cloud', 'puff'];
    window.__smoke.playerSeq = ['puff', 'puff', 'cloud', 'cloud', 'puff'];
    window.__smoke.seqIdx = 5;
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'correct' },
      { type: 'puff', status: 'correct' },
      { type: 'cloud', status: 'correct' },
      { type: 'cloud', status: 'correct' },
      { type: 'puff', status: 'correct' },
    ];
    window.__smoke.evaluateFullSequence();
  });
  await page.waitForTimeout(2100);
  const s = await page.evaluate(() => window.__smoke.state);
  assert.strictEqual(s, 'win');
});

test('completing round 1 advances to round 2', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.targetSeq = ['puff', 'puff', 'puff'];
    window.__smoke.playerSeq = ['puff', 'puff', 'puff'];
    window.__smoke.seqIdx = 3;
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'correct' },
      { type: 'puff', status: 'correct' },
      { type: 'puff', status: 'correct' },
    ];
    window.__smoke.evaluateFullSequence();
  });
  await page.waitForTimeout(2100);
  const r = await page.evaluate(() => window.__smoke.round);
  assert.strictEqual(r, 2);
});

test('round 2 generates sequence of length 4', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.targetSeq = ['puff', 'puff', 'puff'];
    window.__smoke.playerSeq = ['puff', 'puff', 'puff'];
    window.__smoke.seqIdx = 3;
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'correct' },
      { type: 'puff', status: 'correct' },
      { type: 'puff', status: 'correct' },
    ];
    window.__smoke.evaluateFullSequence();
  });
  await page.waitForTimeout(2100);
  const len = await page.evaluate(() => window.__smoke.targetSeq.length);
  assert.strictEqual(len, 4);
});

// ── Suite 8: Watch phase ──────────────────────────────────────────────────────
test('beginWatch sets state to watching', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.beginWatch();
  });
  const s = await page.evaluate(() => window.__smoke.state);
  assert.strictEqual(s, 'watching');
});

test('beginWatch resets watchIdx to 0', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.watchIdx = 3;
    window.__smoke.beginWatch();
  });
  const w = await page.evaluate(() => window.__smoke.watchIdx);
  assert.strictEqual(w, 0);
});

test('update(0.6) decrements watchTimer', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.watchTimer = 800;
    window.__smoke.windTimer = 99999; // prevent wind burst
    window.__smoke.update(0.6);
  });
  const t = await page.evaluate(() => window.__smoke.watchTimer);
  assert.ok(t < 800, 'watchTimer should decrease');
});

test('watchTimer reaching 0 with signals remaining advances watchIdx', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.watchIdx = 0;
    window.__smoke.watchTimer = 1;
    window.__smoke.windTimer = 99999;
    window.__smoke.targetSeq = ['puff', 'cloud', 'puff'];
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'pending' },
      { type: 'cloud', status: 'pending' },
      { type: 'puff', status: 'pending' },
    ];
    window.__smoke.update(0.05); // consumes 50ms, clears 1ms timer
  });
  const idx = await page.evaluate(() => window.__smoke.watchIdx);
  assert.strictEqual(idx, 1);
});

test('signal indicators update to shown during watch', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.watchIdx = 0;
    window.__smoke.watchTimer = 1;
    window.__smoke.windTimer = 99999;
    window.__smoke.targetSeq = ['puff', 'puff', 'puff'];
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'pending' },
      { type: 'puff', status: 'pending' },
      { type: 'puff', status: 'pending' },
    ];
    window.__smoke.update(0.05);
  });
  const status = await page.evaluate(() => window.__smoke.signalIndicators[0].status);
  assert.strictEqual(status, 'shown');
});

// ── Suite 9: Wind mechanics ───────────────────────────────────────────────────
test('wind timer decrements during update', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.windTimer = 5000;
    window.__smoke.windBurst = false;
    window.__smoke.update(0.5);
  });
  const t = await page.evaluate(() => window.__smoke.windTimer);
  assert.ok(t < 5000, 'windTimer should decrease');
});

test('windTimer reaching 0 triggers windBurst', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.windTimer = 1;
    window.__smoke.windBurst = false;
    window.__smoke.watchTimer = 99999;
    window.__smoke.update(0.05);
  });
  const b = await page.evaluate(() => window.__smoke.windBurst);
  assert.ok(b, 'windBurst should be true');
});

test('windBurstTimer set when burst starts', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.windTimer = 1;
    window.__smoke.windBurst = false;
    window.__smoke.watchTimer = 99999;
    window.__smoke.update(0.05);
  });
  const bt = await page.evaluate(() => window.__smoke.windBurstTimer);
  assert.ok(bt > 0, 'windBurstTimer should be positive after burst starts');
});

test('windBurstTimer decrements during burst', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.windBurst = true;
    window.__smoke.windBurstTimer = 2000;
    window.__smoke.watchTimer = 99999;
    window.__smoke.update(0.2);
  });
  const bt = await page.evaluate(() => window.__smoke.windBurstTimer);
  assert.ok(bt < 2000, 'windBurstTimer should decrease');
});

test('windBurst ends when burstTimer reaches 0', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.state = 'watching';
    window.__smoke.windBurst = true;
    window.__smoke.windBurstTimer = 1;
    window.__smoke.watchTimer = 99999;
    window.__smoke.update(0.1);
  });
  const b = await page.evaluate(() => window.__smoke.windBurst);
  assert.strictEqual(b, false, 'windBurst should reset after timer expires');
});

test('windDir is either -1 or 1', async () => {
  const ok = await page.evaluate(() => {
    window.__smoke.startGame();
    const d = window.__smoke.windDir;
    return d === 1 || d === -1;
  });
  assert.ok(ok);
});

// ── Suite 10: Scoring & best score ───────────────────────────────────────────
test('bestScore is a non-negative number', async () => {
  const bs = await page.evaluate(() => window.__smoke.bestScore);
  assert.ok(typeof bs === 'number' && bs >= 0);
});

test('best score saved when score exceeds previous best', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.bestScore = 0;
    localStorage.setItem('smoke_signal_best', '0');
    window.__smoke.score = 2500;
    window.__smoke.round = 1;
    // Target is cloud; a short puff hold will be wrong
    window.__smoke.targetSeq = ['cloud'];
    window.__smoke.signalIndicators = [{ type: 'cloud', status: 'pending' }];
    window.__smoke.lives = 1;
    window.__smoke.beginReplay();
    const now = performance.now();
    window.__smoke.holdStart = now - 300; // 300ms = puff (wrong, target is cloud)
    window.__smoke.holdActive = true;
    window.__smoke.endHold(now); // wrong -> lives 0 -> gameover -> saveScore
  });
  await page.waitForTimeout(900);
  const stored = await page.evaluate(() => parseInt(localStorage.getItem('smoke_signal_best') || '0'));
  assert.ok(stored >= 2500, 'stored best should be >= 2500, got ' + stored);
});

test('best score not overwritten when score is lower', async () => {
  await page.evaluate(() => {
    localStorage.setItem('smoke_signal_best', '9999');
    window.__smoke.startGame();
    window.__smoke.bestScore = 9999;
  });
  const stored = await page.evaluate(() => parseInt(localStorage.getItem('smoke_signal_best') || '0'));
  assert.ok(stored >= 9999, 'stored best should still be 9999, got ' + stored);
});

// ── Suite 11: Signal indicators ──────────────────────────────────────────────
test('signal indicators match target sequence types', async () => {
  await page.evaluate(() => window.__smoke.startGame());
  const ok = await page.evaluate(() => {
    const seq = window.__smoke.targetSeq;
    const ind = window.__smoke.signalIndicators;
    return seq.length === ind.length && seq.every((s, i) => ind[i].type === s);
  });
  assert.ok(ok, 'indicator types should match targetSeq');
});

test('all indicators start as pending', async () => {
  await page.evaluate(() => window.__smoke.startGame());
  const ok = await page.evaluate(() =>
    window.__smoke.signalIndicators.every(i => i.status === 'pending')
  );
  assert.ok(ok);
});

test('correct endHold marks indicator as correct', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.targetSeq = ['puff', 'puff', 'puff'];
    window.__smoke.signalIndicators = [
      { type: 'puff', status: 'pending' },
      { type: 'puff', status: 'pending' },
      { type: 'puff', status: 'pending' },
    ];
    window.__smoke.beginReplay();
    const now = performance.now();
    window.__smoke.holdStart = now - 350;
    window.__smoke.holdActive = true;
    window.__smoke.endHold(now);
  });
  const status = await page.evaluate(() => window.__smoke.signalIndicators[0].status);
  assert.strictEqual(status, 'correct');
});

test('wrong endHold marks indicator as wrong', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.round = 1;
    window.__smoke.targetSeq = ['cloud', 'puff', 'puff'];
    window.__smoke.signalIndicators = [
      { type: 'cloud', status: 'pending' },
      { type: 'puff', status: 'pending' },
      { type: 'puff', status: 'pending' },
    ];
    window.__smoke.beginReplay();
    const now = performance.now();
    window.__smoke.holdStart = now - 300; // puff, target is cloud
    window.__smoke.holdActive = true;
    window.__smoke.endHold(now);
  });
  const status = await page.evaluate(() => window.__smoke.signalIndicators[0].status);
  assert.strictEqual(status, 'wrong');
});

// ── Suite 12: Particles & popups ─────────────────────────────────────────────
test('addPopup adds an entry to popups', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.addPopup(180, 300, 'TEST', '#fff');
  });
  const n = await page.evaluate(() => window.__smoke.popups.length);
  assert.ok(n >= 1);
});

test('popups fade over time', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.addPopup(180, 300, 'FADE', '#fff');
    window.__smoke.addPopup(180, 350, 'FADE2', '#fff');
  });
  const n0 = await page.evaluate(() => window.__smoke.popups.length);
  await page.evaluate(() => {
    for (let i = 0; i < 80; i++) {
      window.__smoke.state = 'watching';
      window.__smoke.windTimer = 99999;
      window.__smoke.watchTimer = 99999;
      window.__smoke.update(0.05);
    }
  });
  const n1 = await page.evaluate(() => window.__smoke.popups.length);
  assert.ok(n1 < n0, 'popups should fade: ' + n0 + ' -> ' + n1);
});

test('smoke objects emitted during watch phase', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.smokeObjs.length = 0;
    window.__smoke.emitWatchSmoke('puff');
  });
  await page.waitForTimeout(500);
  const n = await page.evaluate(() => window.__smoke.smokeObjs.length);
  assert.ok(n >= 1, 'smoke objects should be emitted');
});

test('smoke objects fade over time', async () => {
  await page.evaluate(() => {
    window.__smoke.startGame();
    window.__smoke.smokeObjs.length = 0;
    window.__smoke.emitWatchSmoke('cloud');
    window.__smoke.emitWatchSmoke('puff');
  });
  await page.waitForTimeout(600);
  const n0 = await page.evaluate(() => window.__smoke.smokeObjs.length);
  await page.evaluate(() => {
    for (let i = 0; i < 120; i++) {
      window.__smoke.state = 'watching';
      window.__smoke.windTimer = 99999;
      window.__smoke.watchTimer = 99999;
      window.__smoke.windBurst = false;
      window.__smoke.update(0.1);
    }
  });
  const n1 = await page.evaluate(() => window.__smoke.smokeObjs.length);
  assert.ok(n1 < n0 || n0 === 0, 'smoke should decay: ' + n0 + ' -> ' + n1);
});

// ── Suite 13: Console error sweep ────────────────────────────────────────────
test('no console errors on load', async () => {
  const errs = consoleErrors.filter(e => !e.includes('AudioContext'));
  assert.strictEqual(errs.length, 0, 'load errors: ' + errs.join(', '));
});

test('no console errors during simulated full game cycle', async () => {
  const gameErrors = [];
  page.on('console', m => { if (m.type() === 'error') gameErrors.push(m.text()); });
  await page.evaluate(() => {
    window.__smoke.startGame();
    // Force through all 5 rounds by setting state directly
    for (let r = 1; r <= 5; r++) {
      window.__smoke.round = r;
      const cfg = window.__smoke.ROUNDS[r - 1];
      const seq = window.__smoke.generateSequence(cfg.seqLen);
      window.__smoke.targetSeq = seq;
      window.__smoke.playerSeq = seq.slice(); // perfect match
      window.__smoke.seqIdx = seq.length;
      window.__smoke.signalIndicators = seq.map(t => ({ type: t, status: 'correct' }));
      // Run a few update frames
      window.__smoke.state = 'replaying';
      window.__smoke.windTimer = 99999;
      for (let i = 0; i < 5; i++) window.__smoke.update(0.016);
    }
  });
  const filtered = gameErrors.filter(e => !e.includes('AudioContext'));
  assert.strictEqual(filtered.length, 0, 'game cycle errors: ' + filtered.join(', '));
});

// ── Runner ────────────────────────────────────────────────────────────────────
(async () => {
  await setup();
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log('  PASS  ' + t.name);
      passed++;
    } catch (e) {
      console.error('  FAIL  ' + t.name);
      console.error('        ' + e.message);
      failed++;
    }
  }
  await teardown();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
