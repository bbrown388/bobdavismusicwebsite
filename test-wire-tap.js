// Playwright tests for Wire Tap (Game 40)
const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, 'wire-tap.html').replace(/\\/g, '/');
const TIMEOUT = 14000;

async function runTests() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(FILE_URL);
  await page.waitForTimeout(500);

  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('  PASS  ' + name);
      passed++;
    } catch (e) {
      console.log('  FAIL  ' + name + ' -- ' + e.message);
      failed++;
    }
  }

  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
  function assertClose(a, b, tol, msg) {
    if (Math.abs(a - b) > tol) throw new Error((msg || '') + ' got ' + a + ' expected ~' + b);
  }

  // ── Suite 1: Canvas ────────────────────────────────────────────────────────
  await test('S01 Canvas is 360x640', async () => {
    const [w, h] = await page.evaluate(() => [
      document.getElementById('c').width,
      document.getElementById('c').height,
    ]);
    assert(w === 360 && h === 640, 'dims=' + w + 'x' + h);
  });

  // ── Suite 2: Namespace ─────────────────────────────────────────────────────
  await test('S02 window._wt namespace exists', async () => {
    const ok = await page.evaluate(() => typeof window._wt === 'object' && window._wt !== null);
    assert(ok, 'window._wt not found');
  });

  await test('S03 Initial state is title', async () => {
    const s = await page.evaluate(() => window._wt.state);
    assert(s === 'title', 'state=' + s);
  });

  await test('S04 Initial score is 0', async () => {
    const sc = await page.evaluate(() => window._wt.score);
    assert(sc === 0, 'score=' + sc);
  });

  // ── Suite 3: Constants ─────────────────────────────────────────────────────
  await test('S05 DOT_DUR > 0', async () => {
    const v = await page.evaluate(() => window._wt.DOT_DUR);
    assert(v > 0, 'DOT_DUR=' + v);
  });

  await test('S06 DASH_DUR > 0', async () => {
    const v = await page.evaluate(() => window._wt.DASH_DUR);
    assert(v > 0, 'DASH_DUR=' + v);
  });

  await test('S07 DASH_DUR >= 2 * DOT_DUR', async () => {
    const [dot, dash] = await page.evaluate(() => [window._wt.DOT_DUR, window._wt.DASH_DUR]);
    assert(dash >= 2 * dot, 'dash=' + dash + ' dot=' + dot);
  });

  await test('S08 ELEM_GAP > 0', async () => {
    const v = await page.evaluate(() => window._wt.ELEM_GAP);
    assert(v > 0, 'ELEM_GAP=' + v);
  });

  await test('S09 LETTER_GAP > 0', async () => {
    const v = await page.evaluate(() => window._wt.LETTER_GAP);
    assert(v > 0, 'LETTER_GAP=' + v);
  });

  await test('S10 INPUT_GRACE > 0', async () => {
    const v = await page.evaluate(() => window._wt.INPUT_GRACE);
    assert(v > 0, 'INPUT_GRACE=' + v);
  });

  await test('S11 LETTER_GAP >= ELEM_GAP', async () => {
    const [lg, eg] = await page.evaluate(() => [window._wt.LETTER_GAP, window._wt.ELEM_GAP]);
    assert(lg >= eg, 'LETTER_GAP=' + lg + ' ELEM_GAP=' + eg);
  });

  await test('S12 MAP_Y > 0', async () => {
    const v = await page.evaluate(() => window._wt.MAP_Y);
    assert(v > 0, 'MAP_Y=' + v);
  });

  // ── Suite 4: Morse alphabet ────────────────────────────────────────────────
  await test('S13 MORSE.A = .-', async () => {
    const v = await page.evaluate(() => window._wt.MORSE.A);
    assert(v === '.-', 'MORSE.A=' + v);
  });

  await test('S14 MORSE.E = .', async () => {
    const v = await page.evaluate(() => window._wt.MORSE.E);
    assert(v === '.', 'MORSE.E=' + v);
  });

  await test('S15 MORSE.M = --', async () => {
    const v = await page.evaluate(() => window._wt.MORSE.M);
    assert(v === '--', 'MORSE.M=' + v);
  });

  await test('S16 MORSE.T = -', async () => {
    const v = await page.evaluate(() => window._wt.MORSE.T);
    assert(v === '-', 'MORSE.T=' + v);
  });

  await test('S17 MORSE has 26 entries', async () => {
    const n = await page.evaluate(() => Object.keys(window._wt.MORSE).length);
    assert(n === 26, 'MORSE entries=' + n);
  });

  await test('S18 MORSE.B = -...', async () => {
    const v = await page.evaluate(() => window._wt.MORSE.B);
    assert(v === '-...', 'MORSE.B=' + v);
  });

  await test('S19 MORSE.K = -.-', async () => {
    const v = await page.evaluate(() => window._wt.MORSE.K);
    assert(v === '-.-', 'MORSE.K=' + v);
  });

  await test('S20 MORSE.F = ..-.', async () => {
    const v = await page.evaluate(() => window._wt.MORSE.F);
    assert(v === '..-.', 'MORSE.F=' + v);
  });

  // ── Suite 5: Rounds data ───────────────────────────────────────────────────
  await test('S21 ROUNDS.length = 3', async () => {
    const n = await page.evaluate(() => window._wt.ROUNDS.length);
    assert(n === 3, 'ROUNDS=' + n);
  });

  await test('S22 Round 0 word = BANK', async () => {
    const w = await page.evaluate(() => window._wt.ROUNDS[0].word);
    assert(w === 'BANK', 'word=' + w);
  });

  await test('S23 Round 1 word = MINE', async () => {
    const w = await page.evaluate(() => window._wt.ROUNDS[1].word);
    assert(w === 'MINE', 'word=' + w);
  });

  await test('S24 Round 2 word = FORD', async () => {
    const w = await page.evaluate(() => window._wt.ROUNDS[2].word);
    assert(w === 'FORD', 'word=' + w);
  });

  await test('S25 All ROUNDS have valid locationIdx', async () => {
    const ok = await page.evaluate(() => {
      const nLocs = window._wt.LOCATIONS.length;
      return window._wt.ROUNDS.every(r => r.locationIdx >= 0 && r.locationIdx < nLocs);
    });
    assert(ok, 'locationIdx out of range');
  });

  await test('S26 Round locationIdx values are distinct', async () => {
    const ok = await page.evaluate(() => {
      const ids = window._wt.ROUNDS.map(r => r.locationIdx);
      return new Set(ids).size === ids.length;
    });
    assert(ok, 'duplicate locationIdx');
  });

  // ── Suite 6: Locations ─────────────────────────────────────────────────────
  await test('S27 LOCATIONS.length = 5', async () => {
    const n = await page.evaluate(() => window._wt.LOCATIONS.length);
    assert(n === 5, 'LOCATIONS=' + n);
  });

  await test('S28 All LOCATIONS have positive radius', async () => {
    const ok = await page.evaluate(() => window._wt.LOCATIONS.every(l => l.r > 0));
    assert(ok, 'some location radius <= 0');
  });

  await test('S29 LOCATIONS[0].name = BANK', async () => {
    const n = await page.evaluate(() => window._wt.LOCATIONS[0].name);
    assert(n === 'BANK', 'name=' + n);
  });

  await test('S30 All LOCATIONS have x within canvas width', async () => {
    const ok = await page.evaluate(() => window._wt.LOCATIONS.every(l => l.x > 0 && l.x < 360));
    assert(ok, 'location x out of range');
  });

  await test('S31 All LOCATIONS have y > 0', async () => {
    const ok = await page.evaluate(() => window._wt.LOCATIONS.every(l => l.y > 0));
    assert(ok, 'location y <= 0');
  });

  // ── Suite 7: buildTimeline ─────────────────────────────────────────────────
  await test('S32 buildTimeline returns array', async () => {
    const ok = await page.evaluate(() => Array.isArray(window._wt.buildTimeline('E')));
    assert(ok, 'not an array');
  });

  await test('S33 buildTimeline(E) has 1 element', async () => {
    const n = await page.evaluate(() => window._wt.buildTimeline('E').length);
    assert(n === 1, 'length=' + n);
  });

  await test('S34 buildTimeline(E) element isDash=false', async () => {
    const v = await page.evaluate(() => window._wt.buildTimeline('E')[0].isDash);
    assert(v === false, 'isDash=' + v);
  });

  await test('S35 buildTimeline(E) startT=0', async () => {
    const v = await page.evaluate(() => window._wt.buildTimeline('E')[0].startT);
    assert(v === 0, 'startT=' + v);
  });

  await test('S36 buildTimeline(E) endT = DOT_DUR', async () => {
    const [endT, dot] = await page.evaluate(() => [
      window._wt.buildTimeline('E')[0].endT,
      window._wt.DOT_DUR,
    ]);
    assert(endT === dot, 'endT=' + endT + ' DOT_DUR=' + dot);
  });

  await test('S37 buildTimeline(E) winEnd = endT + INPUT_GRACE', async () => {
    const [winEnd, dot, grace] = await page.evaluate(() => [
      window._wt.buildTimeline('E')[0].winEnd,
      window._wt.DOT_DUR,
      window._wt.INPUT_GRACE,
    ]);
    assert(winEnd === dot + grace, 'winEnd=' + winEnd);
  });

  await test('S38 buildTimeline(BANK) has 11 elements', async () => {
    const n = await page.evaluate(() => window._wt.buildTimeline('BANK').length);
    assert(n === 11, 'length=' + n);
  });

  await test('S39 buildTimeline(MINE) has 7 elements', async () => {
    const n = await page.evaluate(() => window._wt.buildTimeline('MINE').length);
    assert(n === 7, 'length=' + n);
  });

  await test('S40 buildTimeline(FORD) has 13 elements', async () => {
    const n = await page.evaluate(() => window._wt.buildTimeline('FORD').length);
    assert(n === 13, 'length=' + n);
  });

  await test('S41 BANK timeline first element is dash (B = -...)', async () => {
    const v = await page.evaluate(() => window._wt.buildTimeline('BANK')[0].isDash);
    assert(v === true, 'isDash=' + v);
  });

  await test('S42 Timeline startT increases monotonically', async () => {
    const ok = await page.evaluate(() => {
      const tl = window._wt.buildTimeline('BANK');
      for (let i = 1; i < tl.length; i++) {
        if (tl[i].startT <= tl[i - 1].startT) return false;
      }
      return true;
    });
    assert(ok, 'startT not monotonic');
  });

  await test('S43 No element overlaps (startT >= prev endT + gap)', async () => {
    const ok = await page.evaluate(() => {
      const tl = window._wt.buildTimeline('BANK');
      for (let i = 1; i < tl.length; i++) {
        if (tl[i].startT < tl[i - 1].endT) return false;
      }
      return true;
    });
    assert(ok, 'elements overlap');
  });

  await test('S44 Letter indices span 0..wordLen-1 correctly', async () => {
    const ok = await page.evaluate(() => {
      const tl = window._wt.buildTimeline('MINE');
      const liVals = [...new Set(tl.map(e => e.li))].sort((a, b) => a - b);
      return liVals.length === 4 && liVals[0] === 0 && liVals[3] === 3;
    });
    assert(ok, 'letter indices wrong');
  });

  await test('S45 Element idx field is sequential 0..n-1', async () => {
    const ok = await page.evaluate(() => {
      const tl = window._wt.buildTimeline('FORD');
      return tl.every((e, i) => e.idx === i);
    });
    assert(ok, 'idx not sequential');
  });

  // ── Suite 8: Game start ────────────────────────────────────────────────────
  await test('S46 startGame sets state to playing', async () => {
    await page.evaluate(() => { window._wt.startGame(); });
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => window._wt.state);
    assert(s === 'playing', 'state=' + s);
  });

  await test('S47 startGame sets round to 0', async () => {
    const r = await page.evaluate(() => window._wt.round);
    assert(r === 0, 'round=' + r);
  });

  await test('S48 startGame sets confidence to 50', async () => {
    const c = await page.evaluate(() => window._wt.confidence);
    assert(c === 50, 'confidence=' + c);
  });

  await test('S49 startGame initializes timeline for BANK (11 elements)', async () => {
    const n = await page.evaluate(() => window._wt.timeline.length);
    assert(n === 11, 'timeline.length=' + n);
  });

  await test('S50 startGame inputs array has 11 nulls', async () => {
    const ok = await page.evaluate(() => {
      const inp = window._wt.inputs;
      return inp.length === 11 && inp.every(v => v === null);
    });
    assert(ok, 'inputs not 11 nulls');
  });

  // ── Suite 9: Console errors ────────────────────────────────────────────────
  await test('S51 No console errors after load and startGame', async () => {
    assert(errors.length === 0, 'errors: ' + errors.join('; '));
  });

  // ── Results ────────────────────────────────────────────────────────────────
  console.log('\n  ' + passed + ' passed, ' + failed + ' failed\n');
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
