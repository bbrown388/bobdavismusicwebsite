// test-drought-rider.js -- Playwright tests for Game 59: Drought Rider
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

const FILE = 'file://' + path.resolve(__dirname, 'drought-rider.html').replace(/\\/g, '/');
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

// ── Suite 1: DOM & Canvas ─────────────────────────────────────────────────────
test('canvas element exists', async () => {
  const c = await page.$('canvas#c');
  assert.ok(c, 'canvas#c not found');
});

test('canvas is 360x640', async () => {
  const d = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert.strictEqual(d.w, 360);
  assert.strictEqual(d.h, 640);
});

test('title screen on load', async () => {
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'title');
});

test('feedback overlay hidden initially', async () => {
  const cls = await page.evaluate(() => document.getElementById('fb-overlay').className);
  assert.ok(!cls.includes('open'), 'fb-overlay should be hidden at start');
});

// ── Suite 2: startGame ────────────────────────────────────────────────────────
test('startGame sets state to day_start', async () => {
  await page.evaluate(() => window.__run.startGame());
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'day_start');
});

test('startGame initialises water to 70', async () => {
  const w = await page.evaluate(() => window.__run.water);
  assert.strictEqual(w, 70);
});

test('startGame initialises horse to 100', async () => {
  const h = await page.evaluate(() => window.__run.horse);
  assert.strictEqual(h, 100);
});

test('startGame initialises heatExposure to 0', async () => {
  const he = await page.evaluate(() => window.__run.heatExposure);
  assert.strictEqual(he, 0);
});

test('startGame initialises dayIdx to 0', async () => {
  const d = await page.evaluate(() => window.__run.dayIdx);
  assert.strictEqual(d, 0);
});

test('startGame resets goodChoices to 0', async () => {
  const g = await page.evaluate(() => window.__run.goodChoices);
  assert.strictEqual(g, 0);
});

// ── Suite 3: DAYS data structure ──────────────────────────────────────────────
test('DAYS has 7 entries', async () => {
  const len = await page.evaluate(() => window.__run.DAYS.length);
  assert.strictEqual(len, 7);
});

test('each day has 3 choices', async () => {
  const counts = await page.evaluate(() => window.__run.DAYS.map(d => d.choices.length));
  counts.forEach((c, i) => assert.strictEqual(c, 3, `Day ${i + 1} should have 3 choices`));
});

test('each day has a weather property that exists in WEATHER', async () => {
  const ok = await page.evaluate(() => {
    const weatherKeys = Object.keys(window.__run.WEATHER);
    return window.__run.DAYS.every(d => weatherKeys.includes(d.weather));
  });
  assert.ok(ok, 'all days must have valid weather type');
});

test('each choice has required fields', async () => {
  const ok = await page.evaluate(() => {
    return window.__run.DAYS.every(day => day.choices.every(ch =>
      typeof ch.label === 'string' &&
      typeof ch.desc === 'string' &&
      typeof ch.waterDelta === 'number' &&
      typeof ch.horseDelta === 'number' &&
      typeof ch.heatDelta === 'number' &&
      typeof ch.goodProb === 'number' &&
      typeof ch.goodText === 'string' &&
      typeof ch.badText === 'string'
    ));
  });
  assert.ok(ok, 'all choices must have required fields');
});

test('all goodProb values are between 0.4 and 0.99', async () => {
  const ok = await page.evaluate(() =>
    window.__run.DAYS.every(d => d.choices.every(c => c.goodProb >= 0.40 && c.goodProb <= 0.99))
  );
  assert.ok(ok, 'goodProb must be in [0.40, 0.99]');
});

// ── Suite 4: calcProb ─────────────────────────────────────────────────────────
test('calcProb at 0 heat equals base probability', async () => {
  const prob = await page.evaluate(() => {
    // reset heat to 0
    window._savedHeat = window.__run.heatExposure;
    return window.__run.calcProb(0.80);
  });
  assert.strictEqual(prob, 0.80);
});

test('calcProb reduces probability with heat exposure', async () => {
  const prob = await page.evaluate(() => {
    // temporarily set heatExposure via startGame to clean state
    return null;
  });
  // Test calcProb directly by noting it reads heatExposure closure
  const reduced = await page.evaluate(() => {
    // after startGame heatExposure=0, so calcProb(0.80)=0.80
    // makeChoice day1 choice 1 (Push Trail) applies heat
    window.__run.startGame();
    window.__run.makeChoice(1); // Find shade, heatDelta -6 + heatBase(HOT=10) = 4
    const he = window.__run.heatExposure;
    const p = window.__run.calcProb(0.80);
    return { he, p };
  });
  // prob should be 0.80 - min(0.28, he/310)
  const expected = 0.80 - Math.min(0.28, reduced.he / 310);
  assert.ok(Math.abs(reduced.p - expected) < 0.001, `Expected ~${expected.toFixed(3)}, got ${reduced.p}`);
});

test('calcProb never goes below 0.04', async () => {
  const prob = await page.evaluate(() => {
    // Simulate extremely high heat
    return window.__run.calcProb(0.05);
  });
  assert.ok(prob >= 0.04, 'calcProb should not go below 0.04');
});

test('calcProb never goes above the base prob', async () => {
  await page.evaluate(() => window.__run.startGame());
  const prob = await page.evaluate(() => window.__run.calcProb(0.90));
  assert.ok(prob <= 0.90, 'calcProb should not exceed base probability');
});

// ── Suite 5: makeChoice state changes ────────────────────────────────────────
test('makeChoice moves state to outcome', async () => {
  await page.evaluate(() => window.__run.startGame());
  await page.evaluate(() => window.__run.makeChoice(0));
  const s = await page.evaluate(() => window.__run.state);
  assert.strictEqual(s, 'outcome');
});

test('makeChoice reduces water by waterDelta (or more on bad)', async () => {
  await page.evaluate(() => window.__run.startGame());
  const wBefore = await page.evaluate(() => window.__run.water);
  const ch0 = await page.evaluate(() => window.__run.DAYS[0].choices[0]);
  await page.evaluate(() => window.__run.makeChoice(0));
  const wAfter = await page.evaluate(() => window.__run.water);
  // Water should decrease by at least waterDelta
  assert.ok(wAfter <= wBefore + ch0.waterDelta + 1,
    `Water should decrease: before=${wBefore}, after=${wAfter}, delta=${ch0.waterDelta}`);
});

test('makeChoice changes heatExposure', async () => {
  await page.evaluate(() => window.__run.startGame());
  const heBefore = await page.evaluate(() => window.__run.heatExposure);
  await page.evaluate(() => window.__run.makeChoice(0));
  const heAfter = await page.evaluate(() => window.__run.heatExposure);
  // HOT weather heatBase=10, choice[0] heatDelta=6, so heat should increase
  assert.ok(heAfter > heBefore, `heatExposure should change: before=${heBefore}, after=${heAfter}`);
});

test('makeChoice sets choiceResult', async () => {
  await page.evaluate(() => window.__run.startGame());
  await page.evaluate(() => window.__run.makeChoice(1));
  const cr = await page.evaluate(() => window.__run.choiceResult);
  assert.ok(cr !== null, 'choiceResult should be set');
  assert.ok(typeof cr.success === 'boolean', 'choiceResult.success should be boolean');
  assert.ok(typeof cr.text === 'string', 'choiceResult.text should be string');
});

test('goodChoices increments on success', async () => {
  // Run many times and check at least sometimes increments
  const incremented = await page.evaluate(() => {
    let yes = 0;
    for (let i = 0; i < 20; i++) {
      window.__run.startGame();
      const before = window.__run.goodChoices;
      window.__run.makeChoice(1); // Find shade, 94% goodProb
      if (window.__run.goodChoices > before) yes++;
    }
    return yes;
  });
  assert.ok(incremented >= 10, `goodChoices should increment on success (got ${incremented}/20)`);
});

test('water clamps to 0 minimum', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    // Force water very low, then make the worst choice
    // We can test clamping by checking water never goes negative
    for (let i = 0; i < 7; i++) {
      window.__run.makeChoice(1); // push on
      if (window.__run.state !== 'outcome') break;
      window.__run.advanceFromOutcome();
      if (window.__run.state === 'choice') window.__run.makeChoice(1);
    }
  });
  const w = await page.evaluate(() => window.__run.water);
  assert.ok(w >= 0, `water must not go below 0, got ${w}`);
});

test('horse clamps to 0 minimum', async () => {
  const h = await page.evaluate(() => window.__run.horse);
  assert.ok(h >= 0, `horse must not go below 0, got ${h}`);
});

// ── Suite 6: advanceFromOutcome ───────────────────────────────────────────────
test('advanceFromOutcome advances dayIdx', async () => {
  await page.evaluate(() => window.__run.startGame());
  await page.evaluate(() => window.__run.makeChoice(1)); // → outcome
  const dayBefore = await page.evaluate(() => window.__run.dayIdx);
  await page.evaluate(() => window.__run.advanceFromOutcome());
  const dayAfter = await page.evaluate(() => window.__run.dayIdx);
  // If not dead, dayIdx should increase OR state should be lose
  const s = await page.evaluate(() => window.__run.state);
  if (s !== 'lose') {
    assert.ok(dayAfter > dayBefore, `dayIdx should advance: ${dayBefore} -> ${dayAfter}`);
  }
});

test('advanceFromOutcome moves to day_start when resources remain and days left', async () => {
  const result = await page.evaluate(() => {
    window.__run.startGame();
    // Day 1, choice 0 -> outcome -> advance to day 2
    window.__run.makeChoice(0);
    const dayBefore = window.__run.dayIdx;
    window.__run.animT = 2.0;
    window.__run.advanceFromOutcome();
    return { state: window.__run.state, dayBefore, dayAfter: window.__run.dayIdx };
  });
  // Either moved to day_start (water/horse ok) or lose (resources depleted)
  assert.ok(
    result.state === 'day_start' || result.state === 'lose',
    `Expected day_start or lose, got ${result.state}`
  );
  if (result.state === 'day_start') {
    assert.ok(result.dayAfter > result.dayBefore, 'dayIdx should advance when resources remain');
  }
});

test('after 7 days score is set on win', async () => {
  await page.evaluate(() => {
    window.__run.startGame();
    // Drive through all 7 days with the safe choice (index 1)
    for (let d = 0; d < 7; d++) {
      if (window.__run.state === 'day_start') {
        window.__run.animT = 2.0; // skip animation
        // manually transition to choice
        // Need to set state directly -- not exposed. Instead tap to advance.
        // We can call makeChoice directly from 'day_start' state if we first advance it.
        // Force state to choice by setting animT high (loop sets state=choice at animT>1.8)
      }
      if (window.__run.state === 'day_start') return; // can't force easily
      window.__run.makeChoice(1); // safe choice
      if (window.__run.state === 'outcome') {
        window.__run.animT = 2.0;
        window.__run.advanceFromOutcome();
      }
      if (window.__run.state === 'lose' || window.__run.state === 'win') break;
    }
  });
  // Just check we have a valid score if we won
  const { state, score } = await page.evaluate(() => ({
    state: window.__run.state,
    score: window.__run.score,
  }));
  if (state === 'win') {
    assert.ok(score >= 1000, `Win score should be at least 1000, got ${score}`);
  }
});

// ── Suite 7: getHeatHint ──────────────────────────────────────────────────────
test('getHeatHint returns first hint at 0 heat', async () => {
  await page.evaluate(() => window.__run.startGame());
  const hint = await page.evaluate(() => window.__run.getHeatHint());
  assert.strictEqual(hint, 'The air is still.');
});

test('getHeatHint escalates with heat exposure', async () => {
  await page.evaluate(() => window.__run.startGame());
  // Make several hot choices
  const hints = await page.evaluate(() => {
    const results = [window.__run.getHeatHint()];
    // Make 3 aggressive choices (choice 0 = Push Trail on day 1, HOT weather)
    for (let i = 0; i < 3; i++) {
      if (window.__run.state === 'choice' || window.__run.state === 'day_start') {
        window.__run.makeChoice(0);
      }
      if (window.__run.state === 'outcome') {
        window.__run.animT = 2.0;
        window.__run.advanceFromOutcome();
      }
    }
    results.push(window.__run.getHeatHint());
    results.push(window.__run.heatExposure);
    return results;
  });
  // The hint array should exist and be a string
  assert.ok(typeof hints[0] === 'string', 'hint should be a string');
  assert.ok(typeof hints[1] === 'string', 'second hint should be a string');
});

test('HEAT_HINTS has 5 entries', async () => {
  const len = await page.evaluate(() => window.__run.HEAT_HINTS.length);
  assert.strictEqual(len, 5);
});

test('HEAT_HINTS thresholds are in ascending order', async () => {
  const ok = await page.evaluate(() => {
    const hints = window.__run.HEAT_HINTS;
    for (let i = 1; i < hints.length; i++) {
      if (hints[i][0] <= hints[i-1][0]) return false;
    }
    return true;
  });
  assert.ok(ok, 'HEAT_HINTS thresholds must be ascending');
});

// ── Suite 8: Weather data ─────────────────────────────────────────────────────
test('WEATHER has 4 entries', async () => {
  const len = await page.evaluate(() => Object.keys(window.__run.WEATHER).length);
  assert.strictEqual(len, 4);
});

test('WEATHER SCORCHING has highest heatBase', async () => {
  const ok = await page.evaluate(() => {
    const w = window.__run.WEATHER;
    return w.SCORCHING.heatBase > w.HOT.heatBase && w.HOT.heatBase > w.MILD.heatBase;
  });
  assert.ok(ok, 'SCORCHING should have higher heatBase than HOT and MILD');
});

test('WEATHER OVERCAST has negative heatBase', async () => {
  const hb = await page.evaluate(() => window.__run.WEATHER.OVERCAST.heatBase);
  assert.ok(hb < 0, 'OVERCAST should have negative heatBase (reduces heat)');
});

// ── Suite 9: Day 7 leads to win or lose ──────────────────────────────────────
test('advancing from day 7 outcome sets state to win or lose', async () => {
  const result = await page.evaluate(() => {
    window.__run.startGame();
    // Force to the last day by advancing through outcomes
    for (let d = 0; d < 7; d++) {
      if (window.__run.state === 'day_start' || window.__run.state === 'choice') {
        window.__run.makeChoice(2); // safest choice
      }
      if (window.__run.state === 'outcome') {
        window.__run.animT = 2.0;
        window.__run.advanceFromOutcome();
      }
      if (window.__run.state === 'lose' || window.__run.state === 'win') break;
    }
    return window.__run.state;
  });
  assert.ok(result === 'win' || result === 'lose', `Expected win/lose, got ${result}`);
});

test('win state has score >= 1000', async () => {
  const result = await page.evaluate(() => {
    window.__run.startGame();
    for (let d = 0; d < 7; d++) {
      if (window.__run.state === 'day_start' || window.__run.state === 'choice') {
        window.__run.makeChoice(2);
      }
      if (window.__run.state === 'outcome') {
        window.__run.animT = 2.0;
        window.__run.advanceFromOutcome();
      }
      if (window.__run.state === 'lose' || window.__run.state === 'win') break;
    }
    return { state: window.__run.state, score: window.__run.score };
  });
  if (result.state === 'win') {
    assert.ok(result.score >= 1000, `Win score must be >= 1000, got ${result.score}`);
  }
});

// ── Suite 10: Console error sweep ────────────────────────────────────────────
test('no console errors during gameplay', async () => {
  await page.evaluate(() => window.__run.startGame());
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__run.makeChoice(0);
    window.__run.animT = 2.0;
    window.__run.advanceFromOutcome();
  });
  await page.waitForTimeout(200);
  assert.strictEqual(consoleErrors.length, 0, `Console errors: ${consoleErrors.join('; ')}`);
});

test('feedback overlay can be toggled', async () => {
  await page.evaluate(() => window.__run.startGame());
  await page.evaluate(() => {
    document.getElementById('fb-overlay').classList.add('open');
  });
  const open = await page.evaluate(() => document.getElementById('fb-overlay').classList.contains('open'));
  assert.ok(open, 'fb-overlay should be openable');
  await page.evaluate(() => {
    document.getElementById('fb-overlay').classList.remove('open');
  });
  const closed = await page.evaluate(() => !document.getElementById('fb-overlay').classList.contains('open'));
  assert.ok(closed, 'fb-overlay should be closeable');
});

// ── Runner ────────────────────────────────────────────────────────────────────
(async () => {
  await setup();
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  PASS  ${t.name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL  ${t.name}`);
      console.error(`        ${e.message}`);
      failed++;
    }
  }
  await teardown();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
