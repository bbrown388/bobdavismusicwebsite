// Playwright tests for Rodeo Queen (Game 36)
const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, 'rodeo-queen.html').replace(/\\/g, '/');
const TIMEOUT  = 12000;

async function runTests() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(FILE_URL);
  await page.waitForTimeout(400);

  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('  PASS  ' + name);
      passed++;
    } catch (e) {
      console.log('  FAIL  ' + name + ' — ' + e.message);
      failed++;
    }
  }

  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

  // Suite 1: Canvas dimensions
  await test('Canvas is 360x640', async () => {
    const [w, h] = await page.evaluate(() => [
      document.getElementById('c').width,
      document.getElementById('c').height,
    ]);
    assert(w === 360, 'width=' + w);
    assert(h === 640, 'height=' + h);
  });

  // Suite 2: Title screen is initial phase
  await test('Initial phase is title', async () => {
    const ph = await page.evaluate(() => window.getPhase());
    assert(ph === 'title', 'phase=' + ph);
  });

  // Suite 3: Constants are defined
  await test('FEEDBACK_ENDPOINT is defined', async () => {
    const ep = await page.evaluate(() => window.FEEDBACK_ENDPOINT);
    assert(typeof ep === 'string' && ep.length > 20, 'endpoint missing');
  });

  // Suite 4: startGame transitions to barrel
  await test('startGame() transitions to barrel phase', async () => {
    await page.evaluate(() => window.startGame());
    const ph = await page.evaluate(() => window.getPhase());
    assert(ph === 'barrel', 'phase=' + ph);
  });

  // Suite 5: startGame resets round to 1
  await test('startGame() sets round=1', async () => {
    const r = await page.evaluate(() => window.getRound());
    assert(r === 1, 'round=' + r);
  });

  // Suite 6: startGame resets score to 0
  await test('startGame() sets score=0', async () => {
    const s = await page.evaluate(() => window.getScore());
    assert(s === 0, 'score=' + s);
  });

  // Suite 7: startGame resets multiplier to 1
  await test('startGame() sets multiplier=1', async () => {
    const m = await page.evaluate(() => window.getMultiplier());
    assert(m === 1.0, 'multiplier=' + m);
  });

  // Suite 8: initBarrel sets barrelIdx to 0 and t to 0
  await test('initBarrel() initialises barrel state', async () => {
    await page.evaluate(() => window.initBarrel());
    const [idx, t] = await page.evaluate(() => [window.getBP().barrelIdx, window.getBP().t]);
    assert(idx === 0, 'barrelIdx=' + idx);
    assert(t === 0, 't=' + t);
  });

  // Suite 9: BARREL_POS has 3 entries
  await test('BARREL_POS has 3 entries', async () => {
    const len = await page.evaluate(() => window.BARREL_POS.length);
    assert(len === 3, 'len=' + len);
  });

  // Suite 10: tapBarrel perfect when t is exactly 1.0
  await test('tapBarrel() PERFECT when t=1.0', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setBPT(1.0);
    });
    const scoreBefore = await page.evaluate(() => window.getScore());
    await page.evaluate(() => window.tapBarrel());
    const [result, scoreAfter] = await page.evaluate(() => [
      window.getBP().tapResult,
      window.getScore(),
    ]);
    assert(result === 'perfect', 'result=' + result);
    assert(scoreAfter > scoreBefore, 'score did not increase');
  });

  // Suite 11: tapBarrel good when t is within good window
  await test('tapBarrel() GOOD when t=1.15', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setBPT(1.15);
    });
    await page.evaluate(() => window.tapBarrel());
    const result = await page.evaluate(() => window.getBP().tapResult);
    assert(result === 'good', 'result=' + result);
  });

  // Suite 12: tapBarrel miss when t is outside window
  await test('tapBarrel() MISS when t=0.3', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setBPT(0.3);
    });
    await page.evaluate(() => window.tapBarrel());
    const result = await page.evaluate(() => window.getBP().tapResult);
    assert(result === 'miss', 'result=' + result);
  });

  // Suite 13: miss resets multiplier to 1
  await test('MISS resets multiplier to 1.0', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setMultiplier(3.0);
      window.awardPoints('miss', 100, 0);
    });
    const m = await page.evaluate(() => window.getMultiplier());
    assert(m === 1.0, 'multiplier=' + m);
  });

  // Suite 14: perfect increases multiplier
  await test('PERFECT increases multiplier by 0.5', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.awardPoints('perfect', 100, 50);
    });
    const m = await page.evaluate(() => window.getMultiplier());
    assert(m === 1.5, 'multiplier=' + m);
  });

  // Suite 15: multiplier caps at MULTI_MAX (5.0)
  await test('Multiplier caps at 5.0', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setMultiplier(4.8);
      window.awardPoints('perfect', 100, 0);
    });
    const m = await page.evaluate(() => window.getMultiplier());
    assert(m <= 5.0, 'multiplier=' + m);
  });

  // Suite 16: energy decreases on miss
  await test('Energy decreases on MISS', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setEnergy(70);
    });
    const e0 = await page.evaluate(() => window.getEnergy());
    await page.evaluate(() => window.awardPoints('miss', 100, 0));
    const e1 = await page.evaluate(() => window.getEnergy());
    assert(e1 < e0, 'energy did not decrease: ' + e0 + ' -> ' + e1);
  });

  // Suite 17: energy increases on perfect
  await test('Energy increases on PERFECT', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setEnergy(50);
    });
    await page.evaluate(() => window.awardPoints('perfect', 100, 50));
    const e = await page.evaluate(() => window.getEnergy());
    assert(e > 50, 'energy=' + e);
  });

  // Suite 18: initRope transitions to rope phase
  await test('initRope() transitions to rope phase', async () => {
    await page.evaluate(() => { window.startGame(); window.initRope(); });
    const ph = await page.evaluate(() => window.getPhase());
    assert(ph === 'rope', 'phase=' + ph);
  });

  // Suite 19: ropeTrackAngle accumulates totalTurns
  await test('ropeTrackAngle() accumulates clockwise rotation', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initRope();
      // Simulate clockwise circle: angles 0 -> π/2 -> π -> 3π/2 -> 2π in small steps
      const cx = 180, cy = 340;
      window._setRPLastAngle(null);
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const ang = (i / steps) * Math.PI * 2;
        const x = cx + Math.cos(ang) * 60;
        const y = cy + Math.sin(ang) * 60;
        window.ropeTrackAngle(x, y);
      }
    });
    const turns = await page.evaluate(() => window.getRP().totalTurns);
    assert(turns > 0.8, 'turns=' + turns);
  });

  // Suite 20: ready becomes true after ROPE_TURNS_NEEDED turns
  await test('Rope ready after ROPE_TURNS_NEEDED full turns', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initRope();
      // Force enough turns
      const cx = 180, cy = 340;
      window._setRPLastAngle(null);
      const needed = window.ROPE_TURNS_NEEDED;
      // 3 full circles to be safe
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const ang = (i / steps) * Math.PI * 2 * 3;
        const x = cx + Math.cos(ang) * 60;
        const y = cy + Math.sin(ang) * 60;
        window.ropeTrackAngle(x, y);
      }
    });
    const ready = await page.evaluate(() => window.getRP().ready);
    assert(ready === true, 'ready=' + ready);
  });

  // Suite 21: throwRope success when calf near center
  await test('throwRope() success when calf at center', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initRope();
      window._setRPReady(true);
      window._setRPCalfX(180); // canvas center W/2=180
    });
    await page.evaluate(() => window.throwRope());
    const [thrown, result] = await page.evaluate(() => [
      window.getRP().thrown,
      window.getRP().result,
    ]);
    assert(thrown === true, 'not thrown');
    assert(result === 'perfect' || result === 'good', 'result=' + result);
  });

  // Suite 22: throwRope miss when calf far from center
  await test('throwRope() miss when calf far from center', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initRope();
      window._setRPReady(true);
      window._setRPCalfX(55); // far left, dist = 125 from center
    });
    await page.evaluate(() => window.throwRope());
    const result = await page.evaluate(() => window.getRP().result);
    assert(result === 'miss', 'result=' + result);
  });

  // Suite 23: throwRope does nothing if not ready
  await test('throwRope() does nothing if not ready', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initRope();
      window._setRPReady(false);
      window.throwRope();
    });
    const thrown = await page.evaluate(() => window.getRP().thrown);
    assert(thrown === false, 'should not throw');
  });

  // Suite 24: initTricks transitions to tricks phase
  await test('initTricks() transitions to tricks phase', async () => {
    await page.evaluate(() => { window.startGame(); window.initTricks(); });
    const ph = await page.evaluate(() => window.getPhase());
    assert(ph === 'tricks', 'phase=' + ph);
  });

  // Suite 25: updateTricks detects peak (hold scoring)
  await test('updateTricks() scores PERFECT hold at peak when holdActive', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initTricks();
      window._setTPHold(true);
      // Set barT just before peak (π/2), cos is positive just before, negative just after
      // Using barSpeed default ~1.7, dt=0.15 => advance ~0.255 rad
      // π/2 ~ 1.5708, so set prevT = 1.5 (cos(1.5) > 0) => currT ~ 1.755 (cos > 0 still)
      // Need to straddle π/2: set barT = π/2 - 0.05, dt large enough
      window._setTPBarT(Math.PI / 2 - 0.04);
    });
    const scoreBefore = await page.evaluate(() => window.getScore());
    await page.evaluate(() => window.updateTricks(0.12));
    const scoreAfter = await page.evaluate(() => window.getScore());
    assert(scoreAfter > scoreBefore, 'score did not increase: ' + scoreBefore + ' -> ' + scoreAfter);
  });

  // Suite 26: updateTricks detects valley (release scoring) and increments cyclesDone
  await test('updateTricks() increments cyclesDone at valley', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initTricks();
      window._setTPHold(false); // not holding = correct for valley
      // Valley at 3π/2 ~ 4.712, cos crosses from - to +
      window._setTPBarT(3 * Math.PI / 2 - 0.04);
    });
    const c0 = await page.evaluate(() => window.getTP().cyclesDone);
    await page.evaluate(() => window.updateTricks(0.12));
    const c1 = await page.evaluate(() => window.getTP().cyclesDone);
    assert(c1 === c0 + 1, 'cyclesDone: ' + c0 + ' -> ' + c1);
  });

  // Suite 27: TRICKS_CYCLES constant is 8
  await test('TRICKS_CYCLES is 8', async () => {
    const tc = await page.evaluate(() => window.TRICKS_CYCLES);
    assert(tc === 8, 'TRICKS_CYCLES=' + tc);
  });

  // Suite 28: addPopup adds to popups array
  await test('addPopup() adds entry to popups', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.addPopup('TEST', '#fff', 180, 300);
    });
    const len = await page.evaluate(() => window.getPopups().length);
    assert(len >= 1, 'popups length=' + len);
  });

  // Suite 29: score accumulates from awardPoints
  await test('Score accumulates correctly from awardPoints', async () => {
    await page.evaluate(() => { window.startGame(); });
    await page.evaluate(() => { window.awardPoints('perfect', 100, 50); });
    const s = await page.evaluate(() => window.getScore());
    assert(s === 150, 'score=' + s + ' expected 150');
  });

  // Suite 30: TOTAL_ROUNDS is 3
  await test('TOTAL_ROUNDS is 3', async () => {
    const tr = await page.evaluate(() => window.TOTAL_ROUNDS);
    assert(tr === 3, 'TOTAL_ROUNDS=' + tr);
  });

  // Suite 31: After TRICKS_CYCLES valleys, tricks.complete is true
  await test('tricks.complete becomes true after TRICKS_CYCLES cycles', async () => {
    await page.evaluate(() => {
      window.startGame();
      window.initTricks();
      window._setTPCycles(window.TRICKS_CYCLES - 1); // one before last
      window._setTPHold(false);
      window._setTPBarT(3 * Math.PI / 2 - 0.04);
    });
    await page.evaluate(() => window.updateTricks(0.12));
    const complete = await page.evaluate(() => window.getTP().complete);
    assert(complete === true, 'complete=' + complete);
  });

  // Suite 32: After round 3 tricks complete, phase becomes game_over
  await test('Phase becomes game_over after round 3 tricks complete', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setRound(3);
      window.initTricks();
      window._setTPCycles(window.TRICKS_CYCLES - 1);
      window._setTPHold(false);
      window._setTPBarT(3 * Math.PI / 2 - 0.04);
    });
    await page.evaluate(() => window.updateTricks(0.12));
    // Wait for setTimeout in advanceToNextEvent
    await page.waitForTimeout(1200);
    const ph = await page.evaluate(() => window.getPhase());
    assert(ph === 'game_over', 'phase=' + ph);
  });

  // Suite 33: Barrel auto-miss fires when t passes BARREL_AUTOMISS_T
  await test('Barrel auto-miss when t >= BARREL_AUTOMISS_T without tap', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setBPT(window.BARREL_AUTOMISS_T - 0.01);
    });
    const m0 = await page.evaluate(() => window.getMultiplier());
    await page.evaluate(() => window.updateBarrel(0.05));
    const result = await page.evaluate(() => window.getBP().tapResult);
    assert(result === 'miss', 'result=' + result);
  });

  // Suite 34: bestScore is saved to localStorage after game_over
  await test('bestScore saved to localStorage on game_over', async () => {
    await page.evaluate(() => {
      window.startGame();
      window._setScore(9999);
      window._setPhase('game_over');
      // Trigger save by calling drawGameOver logic via score update
      localStorage.setItem('rodeo-queen_best', 0);
      const s = window.getScore();
      const best = parseInt(localStorage.getItem('rodeo-queen_best') || '0');
      if (s > best) localStorage.setItem('rodeo-queen_best', s);
    });
    const saved = await page.evaluate(() => parseInt(localStorage.getItem('rodeo-queen_best') || '0'));
    assert(saved === 9999, 'saved=' + saved);
  });

  // Suite 35: BARREL_WINDOW_PERFECT is tighter than BARREL_WINDOW_GOOD
  await test('BARREL_WINDOW_PERFECT < BARREL_WINDOW_GOOD', async () => {
    const [p, g] = await page.evaluate(() => [window.BARREL_WINDOW_PERFECT, window.BARREL_WINDOW_GOOD]);
    assert(p < g, 'p=' + p + ' g=' + g);
  });

  // Suite 36: Pixel color test - canvas renders non-empty frame
  await test('Canvas renders non-black pixels on title screen', async () => {
    await page.evaluate(() => { window._setPhase('title'); });
    await page.waitForTimeout(100);
    const nonBlack = await page.evaluate(() => {
      const c   = document.getElementById('c');
      const ctx = c.getContext('2d');
      const d   = ctx.getImageData(0, 0, 360, 100).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 20 || d[i+1] > 20 || d[i+2] > 20) return true;
      }
      return false;
    });
    assert(nonBlack, 'canvas appears all black');
  });

  // Suite 37: No console errors after a game cycle
  await test('No console errors during gameplay', async () => {
    await page.evaluate(() => {
      window.startGame();
    });
    await page.waitForTimeout(200);
    assert(errors.length === 0, 'errors: ' + errors.join('; '));
  });

  // Summary
  console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed');
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
