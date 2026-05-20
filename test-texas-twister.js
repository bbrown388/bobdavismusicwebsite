// test-texas-twister.js — Playwright tests for Texas Twister (Game 62)
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'texas-twister.html').replace(/\\/g, '/');

let browser, page;

async function setup() {
  browser = await chromium.launch();
  page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE ERROR:', m.text()); });
  await page.goto(FILE);
  await page.waitForFunction(() => typeof window.__run !== 'undefined');
}
async function teardown() { await browser.close(); }

async function run(fn, label) {
  console.log('  ' + label);
  await fn();
}

// Helpers
const get = expr => page.evaluate(expr);
const call = (fn, ...args) => page.evaluate(([f, a]) => window.__run[f](...a), [fn, args]);
const tick = (dt = 0.016) => page.evaluate(dt => window.__run.update(dt), dt);

async function resetToPlaying(roundIdx = 0) {
  await page.evaluate(ri => {
    window.__run.startGame();
    window.__run.setRound(ri);
    window.__run.startRound();
    window.__run.setState('playing');
  }, roundIdx);
}

// --- Test suites ---
async function testInitialState() {
  await run(async () => {
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'title', 'initial state is title');
  }, 'initial state is title');
}

async function testStartGame() {
  await run(async () => {
    await resetToPlaying();
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'playing');
  }, 'startGame transitions to playing');
}

async function testRound1Items() {
  await run(async () => {
    await resetToPlaying(0);
    const count = await get(() => window.__run.getItems().length);
    assert.strictEqual(count, 3, 'round 1 has 3 items');
  }, 'round 1 spawns 3 items');
}

async function testRound1Debris() {
  await run(async () => {
    await resetToPlaying(0);
    const count = await get(() => window.__run.getDebris().length);
    assert.strictEqual(count, 3, 'round 1 has 3 debris');
  }, 'round 1 spawns 3 debris');
}

async function testRound5Items() {
  await run(async () => {
    await resetToPlaying(4);
    const count = await get(() => window.__run.getItems().length);
    assert.strictEqual(count, 5, 'round 5 has 5 items');
  }, 'round 5 spawns 5 items');
}

async function testRound5Debris() {
  await run(async () => {
    await resetToPlaying(4);
    const count = await get(() => window.__run.getDebris().length);
    assert.strictEqual(count, 7, 'round 5 has 7 debris');
  }, 'round 5 spawns 7 debris');
}

async function testItemsNotSavedOrLost() {
  await run(async () => {
    await resetToPlaying(0);
    const items = await get(() => window.__run.getItems());
    items.forEach(it => {
      assert.strictEqual(it.saved, false);
      assert.strictEqual(it.lost, false);
    });
  }, 'items start unsaved and unlost');
}

async function testItemsInYardArea() {
  await run(async () => {
    await resetToPlaying(0);
    const items = await get(() => window.__run.getItems());
    items.forEach(it => {
      assert.ok(it.x >= 60 && it.x <= 310, 'item x in yard: ' + it.x);
      assert.ok(it.y >= 320 && it.y <= 520, 'item y in yard: ' + it.y);
    });
  }, 'items start within yard bounds');
}

async function testDebrisOrbits() {
  await run(async () => {
    await resetToPlaying(0);
    const before = await get(() => window.__run.getDebris().map(d => d.theta));
    await tick(0.1);
    const after = await get(() => window.__run.getDebris().map(d => d.theta));
    // All theta should have changed
    before.forEach((t, i) => assert.notStrictEqual(t, after[i], 'debris theta updated'));
  }, 'debris theta advances each update');
}

async function testDebrisInwardDrift() {
  await run(async () => {
    await resetToPlaying(0);
    const before = await get(() => window.__run.getDebris().map(d => d.r));
    await tick(0.5);
    const after = await get(() => window.__run.getDebris().map(d => d.r));
    // At least some debris should have smaller r (some may have respawned)
    const anySmaller = before.some((r, i) => after[i] < r);
    assert.ok(anySmaller, 'at least one debris drifted inward');
  }, 'debris drifts inward over time');
}

async function testDebrisRespawn() {
  await run(async () => {
    await resetToPlaying(0);
    // Force all debris to minimum r
    await page.evaluate(() => {
      window.__run.getDebris().forEach(d => { d.r = 1; });
    });
    await tick(0.1);
    const radii = await get(() => window.__run.getDebris().map(d => d.r));
    radii.forEach(r => assert.ok(r >= 55, 'respawned debris r >= MIN_DEBRIS_R, got ' + r));
  }, 'debris respawns at outer radius when r < MIN');
}

async function testSuctionPullsItems() {
  await run(async () => {
    await resetToPlaying(0);
    // Place item far below vortex center
    await page.evaluate(() => {
      window.__run.forceItemPos(0, 180, 490);
      window.__run.getItems()[0].vx = 0;
      window.__run.getItems()[0].vy = 0;
    });
    await tick(0.5);
    const item = await get(() => window.__run.getItems()[0]);
    assert.ok(item.y < 490, 'suction pulled item upward, y=' + item.y);
  }, 'suction pulls item toward vortex over time');
}

async function testItemLostWhenReachesVortex() {
  await run(async () => {
    await resetToPlaying(0);
    // Place item at vortex center
    await page.evaluate(() => {
      const cx = window.__run.VORTEX_CX, cy = window.__run.VORTEX_CY;
      window.__run.forceItemPos(0, cx + 10, cy + 10);
    });
    await tick(0.1);
    const lost = await get(() => window.__run.getItems()[0].lost);
    assert.strictEqual(lost, true, 'item marked lost near vortex center');
  }, 'item marked lost when within 35px of vortex center');
}

async function testGrabItem() {
  await run(async () => {
    await resetToPlaying(0);
    const pos = await get(() => ({ x: window.__run.getItems()[0].x, y: window.__run.getItems()[0].y }));
    await page.evaluate(pos => {
      window.__run.forceHold(0);
    }, pos);
    const held = await get(() => window.__run.getItems()[0].held);
    const heldIdx = await get(() => window.__run.getHeldIdx());
    assert.strictEqual(held, true, 'item held after forceHold');
    assert.strictEqual(heldIdx, 0, 'heldIdx is 0');
  }, 'forceHold marks item as held');
}

async function testSpringFollow() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      window.__run.forceItemPos(0, 180, 400);
      window.__run.forceHold(0);
      window.__run.moveGrip(200, 360);
    });
    await tick(0.2);
    const item = await get(() => window.__run.getItems()[0]);
    assert.ok(item.x > 180, 'item x moved toward grip x=200');
    assert.ok(item.y < 400, 'item y moved toward grip y=360');
  }, 'held item spring-follows grip position');
}

async function testDebrisKnocksHeldItem() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      window.__run.forceItemPos(0, 180, 400);
      window.__run.forceHold(0);
      window.__run.moveGrip(180, 400);
    });
    // Move debris directly onto item
    await page.evaluate(() => {
      const ITEM_HIT_R = window.__run.ITEM_HIT_R;
      const DEBRIS_HIT_R = window.__run.DEBRIS_HIT_R;
      window.__run.moveDebrisTo(0, 180, 400 + ITEM_HIT_R + DEBRIS_HIT_R - 5);
    });
    await tick(0.05);
    const held = await get(() => window.__run.getItems()[0].held);
    assert.strictEqual(held, false, 'item knocked loose by debris collision');
  }, 'debris collision knocks held item loose');
}

async function testSaveItem() {
  await run(async () => {
    await resetToPlaying(0);
    const c = await get(() => window.__run.CELLAR);
    await page.evaluate(c => {
      window.__run.forceItemPos(0, c.x, c.y);
      window.__run.forceHold(0);
      window.__run.moveGrip(c.x, c.y);
    }, c);
    await tick(0.3);
    const saved = await get(() => window.__run.getItems()[0].saved);
    const sc = await get(() => window.__run.getSavedCount());
    assert.strictEqual(saved, true, 'item marked saved in cellar');
    assert.strictEqual(sc, 1, 'savedCount is 1');
  }, 'item delivered to cellar is saved');
}

async function testScoreIncreasesOnSave() {
  await run(async () => {
    await resetToPlaying(0);
    const c = await get(() => window.__run.CELLAR);
    await page.evaluate(c => {
      window.__run.forceItemPos(0, c.x, c.y);
      window.__run.forceHold(0);
      window.__run.moveGrip(c.x, c.y);
    }, c);
    await tick(0.3);
    const sc = await get(() => window.__run.getScore());
    assert.ok(sc > 0, 'score increased after save, got ' + sc);
  }, 'score increases when item saved');
}

async function testRound1ScorePerSave() {
  await run(async () => {
    await resetToPlaying(0);
    const c = await get(() => window.__run.CELLAR);
    await page.evaluate(c => {
      window.__run.forceItemPos(0, c.x, c.y);
      window.__run.forceHold(0);
      window.__run.moveGrip(c.x, c.y);
    }, c);
    await tick(0.3);
    const sc = await get(() => window.__run.getScore());
    // Round 0 reward = 200 + 0*50 = 200
    assert.strictEqual(sc, 200, 'round 1 save rewards $200, got ' + sc);
  }, 'round 1 save awards $200');
}

async function testRound3ScorePerSave() {
  await run(async () => {
    await resetToPlaying(2); // roundIdx=2
    const c = await get(() => window.__run.CELLAR);
    await page.evaluate(c => {
      window.__run.forceItemPos(0, c.x, c.y);
      window.__run.forceHold(0);
      window.__run.moveGrip(c.x, c.y);
    }, c);
    await tick(0.3);
    const sc = await get(() => window.__run.getScore());
    // Round 2 reward = 200 + 2*50 = 300
    assert.strictEqual(sc, 300, 'round 3 save rewards $300, got ' + sc);
  }, 'round 3 save awards $300');
}

async function testTimerCounts() {
  await run(async () => {
    await resetToPlaying(0);
    const before = await get(() => window.__run.getTimeLeft());
    await tick(1.0);
    const after = await get(() => window.__run.getTimeLeft());
    assert.ok(after < before, 'timeLeft decreased after tick');
    assert.ok(Math.abs((before - after) - 1.0) < 0.01, 'timeLeft decreased by ~1s');
  }, 'timeLeft decreases each update');
}

async function testTimerExpiryEndsRound() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => { window.__run.setTimeLeft(0.01); });
    await tick(0.1);
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'round_end', 'state is round_end after timer expires');
  }, 'round ends when timer expires');
}

async function testFailWhenNotEnoughSaved() {
  await run(async () => {
    await resetToPlaying(0);
    // Need 2 saved in round 1; mark all 3 as lost
    await page.evaluate(() => {
      window.__run.getItems().forEach(it => { it.lost = true; });
    });
    await tick(0.1);
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'round_end', 'round ends when impossible to meet quota');
  }, 'round ends when impossible to reach needSaved');
}

async function testPassRoundWhenEnoughSaved() {
  await run(async () => {
    await resetToPlaying(0);
    // Save 2 items (need 2 for round 1) using forceSave
    await page.evaluate(() => { window.__run.forceSave(0); window.__run.forceSave(1); });
    await tick(0.1); // trigger endRound check
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'round_end', 'round ends after saving enough items');
  }, 'round ends when needSaved items saved');
}

async function testRoundResultPass() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => { window.__run.forceSave(0); window.__run.forceSave(1); });
    await tick(0.1);
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'round_end');
  }, 'saving enough items puts state in round_end');
}

async function testAdvanceToNextRound() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => { window.__run.forceSave(0); window.__run.forceSave(1); });
    await tick(0.1); // triggers endRound → state=round_end
    await tick(2.0); // roundEndTimer expires → advanceRound
    const ri = await get(() => window.__run.getRoundIdx());
    assert.strictEqual(ri, 1, 'roundIdx advanced to 1');
  }, 'passing round 1 advances to round 2');
}

async function testFailRoundLeadsToLose() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      window.__run.getItems().forEach(it => { it.lost = true; });
    });
    await tick(0.1); // triggers round_end
    await tick(2.0); // round_end timer expires
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'lose', 'failing a round goes to lose screen');
  }, 'failing a round leads to lose state');
}

async function testWinAfterAllRounds() {
  await run(async () => {
    await page.evaluate(() => { window.__run.startGame(); });
    for (let r = 0; r < 5; r++) {
      await page.evaluate(r => {
        window.__run.setRound(r);
        window.__run.startRound();
        window.__run.setState('playing');
      }, r);
      const needSaved = await page.evaluate(r => window.__run.ROUNDS[r].needSaved, r);
      // Force-save enough items to pass this round
      for (let i = 0; i < needSaved; i++) {
        await page.evaluate(i => { window.__run.forceSave(i); }, i);
      }
      // Trigger and advance past round_end (savedCount >= needSaved → endRound)
      await tick(0.1); // endRound called, state → round_end
      await tick(2.0); // roundEndTimer expires → advanceRound
    }
    const st = await get(() => window.__run.getState());
    assert.strictEqual(st, 'win', 'completing all 5 rounds leads to win state');
  }, 'completing all 5 rounds leads to win state');
}

async function testDebrisXYFromPolar() {
  await run(async () => {
    await resetToPlaying(0);
    // Set known r and theta, tick, verify x/y
    await page.evaluate(() => {
      const d = window.__run.getDebris()[0];
      d.r = 100;
      d.theta = 0; // pointing right
    });
    await tick(0.001);
    const d = await get(() => window.__run.getDebris()[0]);
    // x = VORTEX_CX + cos(theta)*r = 180 + cos(~0)*100 = ~280
    assert.ok(Math.abs(d.x - (180 + Math.cos(d.theta) * d.r)) < 2, 'debris x matches polar calc');
    assert.ok(Math.abs(d.y - (180 + Math.sin(d.theta) * d.r)) < 2, 'debris y matches polar calc');
  }, 'debris position computed from polar coordinates');
}

async function testDebrisRotates() {
  await run(async () => {
    await resetToPlaying(0);
    const before = await get(() => window.__run.getDebris()[0].rot);
    await tick(0.5);
    const after = await get(() => window.__run.getDebris()[0].rot);
    assert.notStrictEqual(before, after, 'debris rot changes each frame');
  }, 'debris rotates each update');
}

async function testHeldItemNotSucked() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      window.__run.forceItemPos(0, 180, 450);
      window.__run.forceHold(0);
      window.__run.moveGrip(180, 450);
    });
    // velocity should not be applied when held
    await tick(0.5);
    const it = await get(() => window.__run.getItems()[0]);
    assert.ok(it.vx === 0 && it.vy === 0, 'held item has no suction velocity');
  }, 'suction not applied to held item');
}

async function testHeldItemFollowsGripX() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      window.__run.forceItemPos(0, 100, 400);
      window.__run.forceHold(0);
      window.__run.moveGrip(280, 400);
    });
    await tick(0.5);
    const x = await get(() => window.__run.getItems()[0].x);
    assert.ok(x > 200, 'item x moved toward grip x=280, got ' + x);
  }, 'held item moves toward grip x over time');
}

async function testMultipleSaves() {
  await run(async () => {
    await resetToPlaying(0);
    // Force-save all 3 items using the forceSave helper
    for (let i = 0; i < 3; i++) {
      await page.evaluate(i => { window.__run.forceSave(i); }, i);
    }
    const sc = await get(() => window.__run.getSavedCount());
    const score = await get(() => window.__run.getScore());
    assert.strictEqual(sc, 3, 'all 3 items saved');
    // Score: 200 + 200 + 200 = 600 (round 0)
    assert.strictEqual(score, 600, 'score is $600 for 3 round-1 saves, got ' + score);
  }, 'forceSave accumulates savedCount and score correctly');
}

async function testSavedItemNotUpdated() {
  await run(async () => {
    await resetToPlaying(0);
    const c = await get(() => window.__run.CELLAR);
    // Save item 0
    await page.evaluate(c => {
      window.__run.forceItemPos(0, c.x, c.y);
      window.__run.forceHold(0);
      window.__run.moveGrip(c.x, c.y);
    }, c);
    await tick(0.3);
    const savedX = await get(() => window.__run.getItems()[0].x);
    // Tick more
    await tick(1.0);
    const afterX = await get(() => window.__run.getItems()[0].x);
    // Saved item position shouldn't drift from suction
    assert.strictEqual(savedX, afterX, 'saved item position unchanged after save');
  }, 'saved item not affected by suction');
}

async function testLostCountIncrement() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      const cx = window.__run.VORTEX_CX, cy = window.__run.VORTEX_CY;
      window.__run.forceItemPos(0, cx + 10, cy + 10);
    });
    await tick(0.1);
    const lc = await get(() => window.__run.getLostCount());
    assert.strictEqual(lc, 1, 'lostCount is 1 after item reaches vortex');
  }, 'lostCount increments when item sucked into vortex');
}

async function testOmegaFactorScalesWithRound() {
  await run(async () => {
    // Round 4 has higher omegaFactor, so debris should move more theta per tick
    await resetToPlaying(0);
    const thetaBefore0 = await get(() => window.__run.getDebris()[0].theta);
    await tick(0.5);
    const thetaAfter0 = await get(() => window.__run.getDebris()[0].theta);
    const delta0 = thetaAfter0 - thetaBefore0;

    await resetToPlaying(4);
    const thetaBefore4 = await get(() => window.__run.getDebris()[0].theta);
    await tick(0.5);
    const thetaAfter4 = await get(() => window.__run.getDebris()[0].theta);
    const delta4 = thetaAfter4 - thetaBefore4;

    assert.ok(delta4 > delta0, 'round 5 debris moves faster than round 1 (omega factor)');
  }, 'round 5 debris orbits faster than round 1');
}

async function testTimeBonus() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => { window.__run.setTimeLeft(10); });
    // Force-save 2 items (round 0 needs 2)
    for (let i = 0; i < 2; i++) {
      await page.evaluate(i => { window.__run.forceSave(i); }, i);
    }
    // Trigger endRound (savedCount=2 >= needSaved=2)
    await tick(0.1);
    const score = await get(() => window.__run.getScore());
    // 2 saves * $200 = 400, plus time bonus floor(~9.9) * 15 = 148 → total > 400
    assert.ok(score > 400, 'score includes time bonus, got ' + score);
  }, 'time bonus added when round passes with time remaining');
}

async function testItemTypesUnique() {
  await run(async () => {
    await resetToPlaying(0);
    const types = await get(() => window.__run.getItems().map(it => it.type));
    const unique = new Set(types);
    assert.strictEqual(unique.size, types.length, 'each item has unique type index');
  }, 'items have unique types within a round');
}

async function testCellarBounds() {
  await run(async () => {
    const c = await get(() => window.__run.CELLAR);
    assert.ok(c.x > 0 && c.x < 180, 'cellar x in left zone');
    assert.ok(c.y > 500 && c.y < 640, 'cellar y near bottom');
    assert.ok(c.w >= 80, 'cellar wide enough to target');
  }, 'cellar positioned at bottom-left with adequate width');
}

async function testNoConsoleErrors() {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await run(async () => {
    await resetToPlaying(0);
    await tick(0.5);
    assert.strictEqual(errors.length, 0, 'No console errors: ' + errors.join(', '));
  }, 'no console errors during play');
}

async function testStateAfterRestart() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      window.__run.setState('lose');
      window.__run.startGame();
    });
    const [st, ri, sc] = await get(() => [
      window.__run.getState(),
      window.__run.getRoundIdx(),
      window.__run.getScore(),
    ]);
    assert.strictEqual(st, 'playing', 'state is playing after restart');
    assert.strictEqual(ri, 0, 'roundIdx resets to 0');
    assert.strictEqual(sc, 0, 'score resets to 0');
  }, 'startGame resets state, round, and score');
}

async function testDebrisPositionInScreen() {
  await run(async () => {
    await resetToPlaying(0);
    await tick(0.1);
    // Debris with large r might be off screen - that's acceptable - just check NaN
    const debris = await get(() => window.__run.getDebris().map(d => ({ x: d.x, y: d.y })));
    debris.forEach(d => {
      assert.ok(!isNaN(d.x), 'debris x is not NaN');
      assert.ok(!isNaN(d.y), 'debris y is not NaN');
    });
  }, 'debris positions are valid numbers');
}

async function testDebrisShovesItems() {
  await run(async () => {
    await resetToPlaying(0);
    await page.evaluate(() => {
      window.__run.forceItemPos(0, 180, 400);
      window.__run.getItems()[0].vx = 0;
      window.__run.getItems()[0].vy = 0;
    });
    // Place debris overlapping item (not knocked - just touching, within shove range)
    await page.evaluate(() => {
      const ITEM_HIT_R = window.__run.ITEM_HIT_R;
      const DEBRIS_HIT_R = window.__run.DEBRIS_HIT_R;
      window.__run.moveDebrisTo(0, 180 + ITEM_HIT_R + DEBRIS_HIT_R - 2, 400);
    });
    await tick(0.1);
    const vx = await get(() => window.__run.getItems()[0].vx);
    assert.ok(vx !== 0, 'debris shove applied velocity to idle item');
  }, 'debris shoves non-held item with impulse');
}

async function testRound2NeedsSavedConfig() {
  await run(async () => {
    const cfg = await get(() => window.__run.ROUNDS[1]);
    assert.strictEqual(cfg.itemCount, 3);
    assert.strictEqual(cfg.needSaved, 2);
    assert.strictEqual(cfg.debrisCount, 4);
  }, 'round 2 config: 3 items, need 2, 4 debris');
}

async function testRound4NeedsSavedConfig() {
  await run(async () => {
    const cfg = await get(() => window.__run.ROUNDS[3]);
    assert.strictEqual(cfg.itemCount, 4);
    assert.strictEqual(cfg.needSaved, 3);
    assert.strictEqual(cfg.debrisCount, 6);
  }, 'round 4 config: 4 items, need 3, 6 debris');
}

async function testItemHasTypeProperty() {
  await run(async () => {
    await resetToPlaying(0);
    const items = await get(() => window.__run.getItems());
    items.forEach(it => {
      assert.ok(it.type >= 0 && it.type < 5, 'item type in [0,4]');
    });
  }, 'each item has valid type index (0-4)');
}

async function testVortexConstants() {
  await run(async () => {
    const vcx = await get(() => window.__run.VORTEX_CX);
    const vcy = await get(() => window.__run.VORTEX_CY);
    assert.strictEqual(vcx, 180, 'VORTEX_CX is 180');
    assert.ok(vcy > 100 && vcy < 300, 'VORTEX_CY in upper screen');
  }, 'vortex center is at screen top-center area');
}

// --- Run all ---
async function main() {
  let passed = 0, failed = 0;
  await setup();
  console.log('\nTexas Twister Tests\n');
  const tests = [
    testInitialState,
    testStartGame,
    testRound1Items,
    testRound1Debris,
    testRound5Items,
    testRound5Debris,
    testItemsNotSavedOrLost,
    testItemsInYardArea,
    testDebrisOrbits,
    testDebrisInwardDrift,
    testDebrisRespawn,
    testSuctionPullsItems,
    testItemLostWhenReachesVortex,
    testGrabItem,
    testSpringFollow,
    testDebrisKnocksHeldItem,
    testSaveItem,
    testScoreIncreasesOnSave,
    testRound1ScorePerSave,
    testRound3ScorePerSave,
    testTimerCounts,
    testTimerExpiryEndsRound,
    testFailWhenNotEnoughSaved,
    testPassRoundWhenEnoughSaved,
    testRoundResultPass,
    testAdvanceToNextRound,
    testFailRoundLeadsToLose,
    testWinAfterAllRounds,
    testDebrisXYFromPolar,
    testDebrisRotates,
    testHeldItemNotSucked,
    testHeldItemFollowsGripX,
    testMultipleSaves,
    testSavedItemNotUpdated,
    testLostCountIncrement,
    testOmegaFactorScalesWithRound,
    testTimeBonus,
    testItemTypesUnique,
    testCellarBounds,
    testNoConsoleErrors,
    testStateAfterRestart,
    testDebrisPositionInScreen,
    testDebrisShovesItems,
    testRound2NeedsSavedConfig,
    testRound4NeedsSavedConfig,
    testItemHasTypeProperty,
    testVortexConstants,
  ];
  let ti = 0;
  for (const t of tests) {
    ti++;
    try {
      await t();
      passed++;
    } catch(e) {
      console.error(`  FAIL (#${ti} ${t.name}):`, e.message);
      failed++;
    }
  }
  await teardown();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
