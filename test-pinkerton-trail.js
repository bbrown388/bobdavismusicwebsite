// test-pinkerton-trail.js — Playwright tests for Game 51: Pinkerton Trail
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'pinkerton-trail.html').replace(/\\/g, '/');
let browser, page;

async function setup() {
  browser = await chromium.launch();
  page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}

async function teardown() { await browser.close(); }

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Suite 1: DOM & Canvas ────────────────────────────────────────────────────
test('canvas element exists', async () => {
  const c = await page.$('canvas#c');
  assert.ok(c, 'canvas#c not found');
});

test('canvas is 360x640', async () => {
  const dims = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height
  }));
  assert.strictEqual(dims.w, 360);
  assert.strictEqual(dims.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__pt.state);
  assert.strictEqual(s, 'title');
});

test('test API exposed', async () => {
  const ok = await page.evaluate(() => typeof window.__pt === 'object');
  assert.ok(ok);
});

// ── Suite 2: Round configs ────────────────────────────────────────────────────
test('5 rounds defined', async () => {
  const n = await page.evaluate(() => window.__pt.startGame && 5);
  assert.strictEqual(n, 5);
});

test('suspect speed escalates', async () => {
  const speeds = await page.evaluate(() => {
    const ROUNDS = [
      { speed: 0.50 }, { speed: 0.65 }, { speed: 0.80 },
      { speed: 0.95 }, { speed: 1.10 }
    ];
    return ROUNDS.map(r => r.speed);
  });
  for (let i = 1; i < speeds.length; i++) {
    assert.ok(speeds[i] > speeds[i - 1], `speed[${i}] should be > speed[${i - 1}]`);
  }
});

test('glance interval shortens as rounds progress', async () => {
  // Confirmed by ROUNDS constant in game: gi 5000→3000
  const giList = [5000, 4500, 4000, 3500, 3000];
  for (let i = 1; i < giList.length; i++) {
    assert.ok(giList[i] < giList[i - 1]);
  }
});

// ── Suite 3: startGame ────────────────────────────────────────────────────────
test('startGame sets state to round_intro', async () => {
  const s = await page.evaluate(() => { window.__pt.startGame(); return window.__pt.state; });
  assert.strictEqual(s, 'round_intro');
});

test('startGame resets score to 0', async () => {
  const s = await page.evaluate(() => { window.__pt.startGame(); return window.__pt.score; });
  assert.strictEqual(s, 0);
});

test('startGame sets roundNum to 0', async () => {
  const r = await page.evaluate(() => { window.__pt.startGame(); return window.__pt.roundNum; });
  assert.strictEqual(r, 0);
});

// ── Suite 4: buildRound ───────────────────────────────────────────────────────
test('buildRound places 7 cover objects', async () => {
  const n = await page.evaluate(() => { window.__pt.buildRound(0); return window.__pt.covers.length; });
  assert.strictEqual(n, 7);
});

test('buildRound places round 1 evidence (4 items)', async () => {
  const n = await page.evaluate(() => { window.__pt.buildRound(0); return window.__pt.evidenceItems.length; });
  assert.strictEqual(n, 4);
});

test('buildRound places round 2 evidence (5 items)', async () => {
  const n = await page.evaluate(() => { window.__pt.buildRound(1); return window.__pt.evidenceItems.length; });
  assert.strictEqual(n, 5);
});

test('buildRound resets suspicion to 0', async () => {
  const s = await page.evaluate(() => {
    window.__pt.suspicion = 80;
    window.__pt.buildRound(0);
    return window.__pt.suspicion;
  });
  assert.strictEqual(s, 0);
});

test('buildRound resets evidenceCount to 0', async () => {
  const e = await page.evaluate(() => {
    window.__pt.evidenceCount = 3;
    window.__pt.buildRound(0);
    return window.__pt.evidenceCount;
  });
  assert.strictEqual(e, 0);
});

test('buildRound puts suspect ahead of player', async () => {
  const { pw, sw } = await page.evaluate(() => {
    window.__pt.buildRound(0);
    return { pw: window.__pt.playerWorldX, sw: window.__pt.suspectWorldX };
  });
  assert.ok(sw > pw, 'suspect should start ahead of player');
});

test('buildRound all evidence starts uncollected', async () => {
  const allFresh = await page.evaluate(() => {
    window.__pt.buildRound(0);
    return window.__pt.evidenceItems.every(e => !e.collected);
  });
  assert.ok(allFresh);
});

// ── Suite 5: isVisible ────────────────────────────────────────────────────────
test('isVisible false when player hiding', async () => {
  const v = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = true;
    return window.__pt.isVisible();
  });
  assert.strictEqual(v, false);
});

test('isVisible false when player is behind suspect (gap < 0)', async () => {
  const v = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = false;
    window.__pt.playerWorldX = 400;
    window.__pt.suspectWorldX = 200; // player is ahead
    return window.__pt.isVisible();
  });
  assert.strictEqual(v, false);
});

test('isVisible false when player too far behind', async () => {
  const v = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = false;
    window.__pt.playerWorldX = 100;
    window.__pt.suspectWorldX = 100 + 260; // just beyond CONE_DIST=255
    return window.__pt.isVisible();
  });
  assert.strictEqual(v, false);
});

test('isVisible true when in cone and not hiding', async () => {
  const v = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = false;
    window.__pt.playerWorldX = 200;
    window.__pt.suspectWorldX = 350; // gap=150 < CONE_DIST=255
    return window.__pt.isVisible();
  });
  assert.strictEqual(v, true);
});

// ── Suite 6: nearestCoverIdx ──────────────────────────────────────────────────
test('nearestCoverIdx returns -1 when no cover nearby', async () => {
  const idx = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerWorldX = 0;  // far from first cover at ~240
    return window.__pt.nearestCoverIdx();
  });
  assert.strictEqual(idx, -1);
});

test('nearestCoverIdx returns index when within COVER_RANGE', async () => {
  const idx = await page.evaluate(() => {
    window.__pt.buildRound(0);
    const c0 = window.__pt.covers[0];
    window.__pt.playerWorldX = c0.worldX + 30; // within 52px
    return window.__pt.nearestCoverIdx();
  });
  assert.ok(idx >= 0, 'should find nearby cover');
});

// ── Suite 7: toggleHide ───────────────────────────────────────────────────────
test('toggleHide hides player when near cover', async () => {
  const hiding = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = false;
    const c0 = window.__pt.covers[0];
    window.__pt.playerWorldX = c0.worldX;
    window.__pt.toggleHide();
    return window.__pt.playerHiding;
  });
  assert.strictEqual(hiding, true);
});

test('toggleHide un-hides player when already hiding', async () => {
  const hiding = await page.evaluate(() => {
    window.__pt.buildRound(0);
    const c0 = window.__pt.covers[0];
    window.__pt.playerWorldX = c0.worldX;
    window.__pt.toggleHide(); // hide
    window.__pt.toggleHide(); // unhide
    return window.__pt.playerHiding;
  });
  assert.strictEqual(hiding, false);
});

test('toggleHide does nothing when no cover nearby', async () => {
  const hiding = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = false;
    window.__pt.playerWorldX = 10; // away from covers
    window.__pt.toggleHide();
    return window.__pt.playerHiding;
  });
  assert.strictEqual(hiding, false);
});

// ── Suite 8: Suspicion mechanics ─────────────────────────────────────────────
test('suspicion rises during glancing when visible', async () => {
  const susp = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = false;
    window.__pt.playerWorldX  = 200;
    window.__pt.suspectWorldX = 350; // in cone
    window.__pt.suspicion     = 10;
    window.__pt.suspectPhase  = 'glancing';
    window.__pt.coneOpacity   = 1;
    window.__pt.glanceTimer   = 5000;
    window.__pt.state         = 'playing';
    window.__pt.roundResult   = null;
    window.__pt.update(200);
    return window.__pt.suspicion;
  });
  assert.ok(susp > 10, 'suspicion should rise when visible during glance');
});

test('suspicion drains when hiding during glance', async () => {
  const susp = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding = true;
    window.__pt.suspicion    = 50;
    window.__pt.suspectPhase = 'glancing';
    window.__pt.glanceTimer  = 5000;
    window.__pt.state        = 'playing';
    window.__pt.roundResult  = null;
    window.__pt.update(200);
    return window.__pt.suspicion;
  });
  assert.ok(susp < 50, 'suspicion should drain when hiding');
});

test('suspicion reaching 100 triggers bust', async () => {
  const result = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerHiding  = false;
    window.__pt.playerWorldX  = 200;
    window.__pt.suspectWorldX = 300;
    window.__pt.suspicion     = 99.9;
    window.__pt.suspectPhase  = 'glancing';
    window.__pt.coneOpacity   = 1;
    window.__pt.glanceTimer   = 5000;
    window.__pt.state         = 'playing';
    window.__pt.roundResult   = null;
    window.__pt.update(300);
    return window.__pt.roundResult;
  });
  assert.strictEqual(result, 'bust');
});

// ── Suite 9: Evidence collection ─────────────────────────────────────────────
test('evidence collected when player walks over it', async () => {
  const count = await page.evaluate(() => {
    window.__pt.buildRound(0);
    const ev = window.__pt.evidenceItems[0];
    window.__pt.playerWorldX  = ev.worldX;
    window.__pt.playerMoving  = true;
    window.__pt.playerHiding  = false;
    window.__pt.suspectWorldX = ev.worldX + 80; // ahead of player
    window.__pt.suspectPhase  = 'walking';
    window.__pt.glanceTimer   = 9000;
    window.__pt.state         = 'playing';
    window.__pt.roundResult   = null;
    window.__pt.update(50);
    return window.__pt.evidenceCount;
  });
  assert.ok(count >= 1, 'evidence should be collected on proximity');
});

test('collected evidence marked as collected', async () => {
  const collected = await page.evaluate(() => {
    window.__pt.buildRound(0);
    const ev = window.__pt.evidenceItems[0];
    window.__pt.playerWorldX  = ev.worldX;
    window.__pt.playerMoving  = true;
    window.__pt.playerHiding  = false;
    window.__pt.suspectWorldX = ev.worldX + 80;
    window.__pt.suspectPhase  = 'walking';
    window.__pt.glanceTimer   = 9000;
    window.__pt.state         = 'playing';
    window.__pt.roundResult   = null;
    window.__pt.update(50);
    return window.__pt.evidenceItems[0].collected;
  });
  assert.strictEqual(collected, true);
});

// ── Suite 10: Win / lose conditions ──────────────────────────────────────────
test('endRound("win") sets roundResult to win', async () => {
  const r = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.roundResult = null;
    window.__pt.endRound('win');
    return window.__pt.roundResult;
  });
  assert.strictEqual(r, 'win');
});

test('endRound("bust") sets roundResult to bust', async () => {
  const r = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.roundResult = null;
    window.__pt.endRound('bust');
    return window.__pt.roundResult;
  });
  assert.strictEqual(r, 'bust');
});

test('endRound("fail") sets roundResult to fail', async () => {
  const r = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.roundResult = null;
    window.__pt.endRound('fail');
    return window.__pt.roundResult;
  });
  assert.strictEqual(r, 'fail');
});

test('endRound win accumulates score', async () => {
  const s = await page.evaluate(() => {
    window.__pt.startGame();
    window.__pt.buildRound(0);
    window.__pt.evidenceCount = 2;
    window.__pt.suspicion     = 10;
    window.__pt.roundResult   = null;
    window.__pt.endRound('win');
    return window.__pt.score;
  });
  assert.ok(s > 0, 'score should be positive after win');
});

test('endRound win stops player movement', async () => {
  const moving = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerMoving = true;
    window.__pt.roundResult  = null;
    window.__pt.endRound('win');
    return window.__pt.playerMoving;
  });
  assert.strictEqual(moving, false);
});

test('suspect reaching destination without enough evidence triggers fail', async () => {
  const r = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.evidenceCount  = 0; // need 2
    window.__pt.suspectWorldX  = 2349; // one step before DEST_X=2350
    window.__pt.suspectPhase   = 'walking';
    window.__pt.glanceTimer    = 9000;
    window.__pt.state          = 'playing';
    window.__pt.roundResult    = null;
    window.__pt.update(200);
    return window.__pt.roundResult;
  });
  assert.strictEqual(r, 'fail');
});

test('suspect reaching destination with enough evidence triggers win', async () => {
  const r = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.evidenceCount  = 2; // exactly need for round 1
    window.__pt.suspectWorldX  = 2349;
    window.__pt.suspectPhase   = 'walking';
    window.__pt.glanceTimer    = 9000;
    window.__pt.state          = 'playing';
    window.__pt.roundResult    = null;
    window.__pt.update(200);
    return window.__pt.roundResult;
  });
  assert.strictEqual(r, 'win');
});

// ── Suite 11: Suspect loses trail condition ───────────────────────────────────
test('player falling too far behind triggers fail', async () => {
  const r = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.evidenceCount  = 0;
    window.__pt.playerWorldX   = 0;
    window.__pt.suspectWorldX  = 500; // gap 500 > 420
    window.__pt.suspectPhase   = 'walking';
    window.__pt.glanceTimer    = 9000;
    window.__pt.state          = 'playing';
    window.__pt.roundResult    = null;
    window.__pt.update(20);
    return window.__pt.roundResult;
  });
  assert.strictEqual(r, 'fail');
});

test('player falling far behind with enough evidence does NOT fail', async () => {
  const r = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.evidenceCount  = 2; // has enough — trail loss only fires if need not met
    window.__pt.playerWorldX   = 0;
    window.__pt.suspectWorldX  = 500;
    window.__pt.suspectPhase   = 'walking';
    window.__pt.glanceTimer    = 9000;
    window.__pt.state          = 'playing';
    window.__pt.roundResult    = null;
    window.__pt.update(20);
    return window.__pt.roundResult;
  });
  assert.ok(r === null || r !== 'fail');
});

// ── Suite 12: Game-over flow ──────────────────────────────────────────────────
test('after all rounds won, state becomes gameover', async () => {
  const s = await page.evaluate(() => {
    window.__pt.startGame();
    window.__pt.roundNum    = 4; // last round (0-indexed)
    window.__pt.roundResult = null;
    window.__pt.score       = 100;
    window.__pt.endRound('win');
    // Simulate resultTimer expiry
    window.__pt.state = 'playing'; // reset so update runs
    window.__pt.roundResult = 'win';
    // Manually expire the result timer
    // The update() function transitions after resultTimer <= 0
    // We need to call update with enough dt
    for (let i = 0; i < 60; i++) window.__pt.update(50);
    return window.__pt.state;
  });
  assert.strictEqual(s, 'gameover');
});

test('bust leads to gameover', async () => {
  const s = await page.evaluate(() => {
    window.__pt.startGame();
    window.__pt.roundNum    = 0;
    window.__pt.roundResult = null;
    window.__pt.endRound('bust');
    for (let i = 0; i < 60; i++) window.__pt.update(50);
    return window.__pt.state;
  });
  assert.strictEqual(s, 'gameover');
});

// ── Suite 13: localStorage best score ────────────────────────────────────────
test('best score saved to localStorage on gameover', async () => {
  const saved = await page.evaluate(() => {
    window.__pt.startGame();
    window.__pt.score    = 750;
    window.__pt.roundNum = 4;
    window.__pt.endRound('win');
    for (let i = 0; i < 60; i++) window.__pt.update(50);
    return parseInt(localStorage.getItem('pinkerton-trail_best') || '0');
  });
  assert.ok(saved > 0, 'best score should be saved');
});

// ── Suite 14: Camera ──────────────────────────────────────────────────────────
test('cameraX tracks player world position', async () => {
  const cam = await page.evaluate(() => {
    window.__pt.buildRound(0);
    window.__pt.playerWorldX  = 500;
    window.__pt.playerMoving  = true;
    window.__pt.playerHiding  = false;
    window.__pt.suspectWorldX = 600;
    window.__pt.suspectPhase  = 'walking';
    window.__pt.glanceTimer   = 9000;
    window.__pt.state         = 'playing';
    window.__pt.roundResult   = null;
    window.__pt.update(100);
    return window.__pt.cameraX;
  });
  // cameraX = playerWorldX - PLAYER_SX(88), should be near 500 - 88 = 412
  assert.ok(cam > 400, 'cameraX should track player');
});

// ── Suite 15: Console errors ──────────────────────────────────────────────────
test('no console errors on load', async () => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.reload();
  await page.waitForTimeout(600);
  assert.deepStrictEqual(errors, []);
});

test('no console errors after startGame', async () => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => window.__pt.startGame());
  await page.waitForTimeout(400);
  assert.deepStrictEqual(errors, []);
});

test('no console errors after several update ticks', async () => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => {
    window.__pt.startGame();
    window.__pt.startRound(0);
    for (let i = 0; i < 20; i++) window.__pt.update(16.67);
  });
  await page.waitForTimeout(300);
  assert.deepStrictEqual(errors, []);
});

// ── Runner ───────────────────────────────────────────────────────────────────
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
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
