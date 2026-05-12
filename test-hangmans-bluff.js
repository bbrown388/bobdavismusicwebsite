// Playwright tests for Hangman's Bluff (Game 48)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'hangmans-bluff.html').replace(/\\/g, '/');
const W = 360, H = 640;
let browser, page;
const consoleErrors = [];

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => {
    if (m.type() === 'error') { console.warn('[PAGE ERROR]', m.text()); consoleErrors.push(m.text()); }
  });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}

async function teardown() {
  if (browser) { await browser.close(); browser = null; page = null; }
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// S1: Title state on load
async function s1() {
  console.log('\nS1: Initial state is "title"');
  await setup();
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'title', 'state is "title" on load');
  await teardown();
}

// S2: Canvas dimensions
async function s2() {
  console.log('\nS2: Canvas is 360x640');
  await setup();
  const dims = await page.evaluate(() => {
    const c = document.getElementById('c');
    return { w: c.width, h: c.height };
  });
  assert(dims.w === 360, 'canvas width is 360');
  assert(dims.h === 640, 'canvas height is 640');
  await teardown();
}

// S3: startGame transitions to stage_intro
async function s3() {
  console.log('\nS3: startGame() transitions to "stage_intro"');
  await setup();
  await page.evaluate(() => window.__hb.startGame());
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'stage_intro', 'state is "stage_intro" after startGame()');
  await teardown();
}

// S4: startGame resets suspicion, questionIdx, storyMemory
async function s4() {
  console.log('\nS4: startGame() resets suspicion, questionIdx, storyMemory');
  await setup();
  await page.evaluate(() => {
    window.__hb.suspicion = 55;
    window.__hb.questionIdx = 7;
    window.__hb.storyMemory = { trade: 'ranchhand' };
    window.__hb.startGame();
  });
  const r = await page.evaluate(() => ({
    suspicion:   window.__hb.suspicion,
    questionIdx: window.__hb.questionIdx,
  }));
  assert(r.suspicion   === 0, 'suspicion resets to 0');
  assert(r.questionIdx === 0, 'questionIdx resets to 0');
  await teardown();
}

// S5: QUESTIONS array has 9 questions
async function s5() {
  console.log('\nS5: QUESTIONS array has 9 entries');
  await setup();
  const count = await page.evaluate(() => window.__hb.QUESTIONS.length);
  assert(count === 9, 'QUESTIONS.length is 9');
  await teardown();
}

// S6: Stage distribution — 3 per stage
async function s6() {
  console.log('\nS6: Stage distribution is 3-3-3');
  await setup();
  const stages = await page.evaluate(() => window.__hb.QUESTIONS.map(q => q.stage));
  const s1count = stages.filter(s => s === 1).length;
  const s2count = stages.filter(s => s === 2).length;
  const s3count = stages.filter(s => s === 3).length;
  assert(s1count === 3, 'stage 1 has 3 questions');
  assert(s2count === 3, 'stage 2 has 3 questions');
  assert(s3count === 3, 'stage 3 has 3 questions');
  await teardown();
}

// S7: Q6 is flagged dynamic
async function s7() {
  console.log('\nS7: Q6 (index 5) is flagged dynamic');
  await setup();
  const isDynamic = await page.evaluate(() => window.__hb.QUESTIONS[5].dynamic === true);
  assert(isDynamic, 'QUESTIONS[5].dynamic is true');
  await teardown();
}

// S8: chooseAnswer at stage_intro does nothing
async function s8() {
  console.log('\nS8: chooseAnswer ignored in non-question states');
  await setup();
  await page.evaluate(() => window.__hb.startGame()); // -> stage_intro
  await page.evaluate(() => window.__hb.chooseAnswer(0));
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'stage_intro', 'state unchanged when chooseAnswer called outside question state');
  await teardown();
}

// S9: chooseAnswer(0) from question state transitions to reaction
async function s9() {
  console.log('\nS9: chooseAnswer() transitions question -> reaction');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
  });
  await page.evaluate(() => window.__hb.chooseAnswer(0));
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'reaction', 'state is "reaction" after choosing an answer');
  await teardown();
}

// S10: Low-suspicion answer adds correct delta
async function s10() {
  console.log('\nS10: Answer delta 0 adds 0 suspicion');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.suspicion = 10;
  });
  const q0delta = await page.evaluate(() => window.__hb.QUESTIONS[0].answers[0].delta);
  await page.evaluate(() => window.__hb.chooseAnswer(0)); // answer 0 of Q1 should be delta 0
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === 10 + q0delta, `suspicion is 10 + ${q0delta}`);
  await teardown();
}

// S11: High-suspicion answer adds correct delta
async function s11() {
  console.log('\nS11: Evasive answer adds suspicion correctly');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.suspicion = 0;
  });
  // Q1 answer 3 ("Ain't your concern") = delta 22
  const delta = await page.evaluate(() => window.__hb.QUESTIONS[0].answers[3].delta);
  await page.evaluate(() => window.__hb.chooseAnswer(3));
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === delta, `evasive answer added ${delta} suspicion`);
  await teardown();
}

// S12: storyMemory gets tag from answer
async function s12() {
  console.log('\nS12: Choosing answer with tag stores it in storyMemory');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
  });
  // Q1 answer 0 has tag {dest: 'amarillo'}
  await page.evaluate(() => window.__hb.chooseAnswer(0));
  const mem = await page.evaluate(() => window.__hb.storyMemory);
  assert(mem.dest === 'amarillo', 'storyMemory.dest is "amarillo"');
  await teardown();
}

// S13: storyMemory stores trade from Q2
async function s13() {
  console.log('\nS13: Q2 answer stores trade in storyMemory');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 1; // Q2
  });
  await page.evaluate(() => window.__hb.chooseAnswer(0)); // "Ranch hand" -> trade: ranchhand
  const mem = await page.evaluate(() => window.__hb.storyMemory);
  assert(mem.trade === 'ranchhand', 'storyMemory.trade is "ranchhand"');
  await teardown();
}

// S14: Q6 consistency check — contradiction adds bonus suspicion
async function s14() {
  console.log('\nS14: Q6 contradiction adds CONTRADICTION_BONUS suspicion');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 5; // Q6
    window.__hb.suspicion = 10;
    window.__hb.storyMemory = { trade: 'ranchhand' }; // ranchhand expects answer index 0
  });
  const base = await page.evaluate(() => window.__hb.QUESTIONS[5].answers[1].delta); // Harrison Bros = wrong for ranchhand
  const bonus = await page.evaluate(() => window.__hb.CONTRADICTION_BONUS);
  await page.evaluate(() => window.__hb.chooseAnswer(1)); // Harrison Brothers - contradiction!
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === 10 + base + bonus, `contradiction: 10 + ${base}(delta) + ${bonus}(bonus) = ${10+base+bonus}, got ${sus}`);
  await teardown();
}

// S15: Q6 consistency check — correct answer adds only base delta
async function s15() {
  console.log('\nS15: Q6 consistent answer adds only base delta (no bonus)');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 5;
    window.__hb.suspicion = 5;
    window.__hb.storyMemory = { trade: 'ranchhand' };
  });
  const base = await page.evaluate(() => window.__hb.QUESTIONS[5].answers[0].delta); // Lazy R = correct for ranchhand
  await page.evaluate(() => window.__hb.chooseAnswer(0));
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === 5 + base, `consistent answer: 5 + ${base}(delta) = ${5+base}, got ${sus}`);
  await teardown();
}

// S16: Q6 "Prefer not to say" never triggers contradiction
async function s16() {
  console.log('\nS16: Q6 "Prefer not to say" skips consistency check');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 5;
    window.__hb.suspicion = 0;
    window.__hb.storyMemory = { trade: 'ranchhand' };
  });
  const base = await page.evaluate(() => window.__hb.QUESTIONS[5].answers[3].delta); // "Prefer not to say"
  const bonus = await page.evaluate(() => window.__hb.CONTRADICTION_BONUS);
  await page.evaluate(() => window.__hb.chooseAnswer(3));
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === base, `"Prefer not to say" adds only ${base}, not ${base + bonus}`);
  await teardown();
}

// S17: Reaching INSTANT_ARREST_SUS triggers arrested state after reaction
async function s17() {
  console.log('\nS17: Suspicion >= INSTANT_ARREST_SUS leads to arrested state');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.suspicion = 75; // 75 + any non-zero answer will hit 80
    window.__hb.questionIdx = 6; // Q7, answer 3 = delta 28
  });
  await page.evaluate(() => window.__hb.chooseAnswer(3)); // +28 -> 103 -> arrested
  await page.waitForTimeout(REACTION_DURATION + 800);
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'arrested', 'state is "arrested" after suspicion exceeded limit');
  await teardown();
}

const REACTION_DURATION = 1800;

// S18: Completing all 9 questions with low suspicion leads to cleared
async function s18() {
  console.log('\nS18: Completing all questions with low suspicion clears the game');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.suspicion = 5;
    window.__hb.questionIdx = 8; // Last question
  });
  await page.evaluate(() => window.__hb.chooseAnswer(1)); // "Always nervous around the law" delta 0
  await page.waitForTimeout(REACTION_DURATION + 400);
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'cleared', 'state is "cleared" after completing all questions with low suspicion');
  await teardown();
}

// S19: Completing all questions with suspicion >= PASS_THRESHOLD leads to arrested
async function s19() {
  console.log('\nS19: High final suspicion (>= PASS_THRESHOLD) leads to arrested');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.suspicion = 65; // Above pass threshold, below instant_arrest
    window.__hb.questionIdx = 8;
  });
  await page.evaluate(() => window.__hb.chooseAnswer(1)); // delta 0 -> stays at 65 -> arrested
  await page.waitForTimeout(REACTION_DURATION + 400);
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'arrested', 'state is "arrested" when final suspicion >= PASS_THRESHOLD');
  await teardown();
}

// S20: calcScore() is (PASS_THRESHOLD - suspicion) * 10
async function s20() {
  console.log('\nS20: calcScore() = (PASS_THRESHOLD - suspicion) * 10');
  await setup();
  await page.evaluate(() => {
    window.__hb.suspicion = 20;
  });
  const score = await page.evaluate(() => window.__hb.calcScore());
  const expected = await page.evaluate(() => (window.__hb.PASS_THRESHOLD - 20) * 10);
  assert(score === expected, `calcScore() = ${expected}, got ${score}`);
  await teardown();
}

// S21: calcScore() returns 0 when suspicion >= PASS_THRESHOLD
async function s21() {
  console.log('\nS21: calcScore() = 0 when suspicion >= PASS_THRESHOLD');
  await setup();
  await page.evaluate(() => { window.__hb.suspicion = 70; });
  const score = await page.evaluate(() => window.__hb.calcScore());
  assert(score === 0, `calcScore() is 0 when suspicion 70 >= threshold ${60}`);
  await teardown();
}

// S22: suspicion is capped at MAX_SUSPICION
async function s22() {
  console.log('\nS22: suspicion is capped at MAX_SUSPICION (100)');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.suspicion = 95;
    window.__hb.questionIdx = 0;
  });
  await page.evaluate(() => window.__hb.chooseAnswer(3)); // big delta
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus <= 100, 'suspicion never exceeds 100');
  await teardown();
}

// S23: TRADE_ANSWER_IDX maps all 4 trades
async function s23() {
  console.log('\nS23: TRADE_ANSWER_IDX covers all 4 trades');
  await setup();
  const map = await page.evaluate(() => window.__hb.TRADE_ANSWER_IDX);
  assert(map.ranchhand   !== undefined, 'TRADE_ANSWER_IDX has ranchhand');
  assert(map.horsetrader !== undefined, 'TRADE_ANSWER_IDX has horsetrader');
  assert(map.merchant    !== undefined, 'TRADE_ANSWER_IDX has merchant');
  assert(map.drifter     !== undefined, 'TRADE_ANSWER_IDX has drifter');
  await teardown();
}

// S24: horsetrader consistent with Harrison Brothers (idx 1)
async function s24() {
  console.log('\nS24: horsetrader + Harrison Brothers (idx 1) is consistent');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 5;
    window.__hb.suspicion = 0;
    window.__hb.storyMemory = { trade: 'horsetrader' };
  });
  const base = await page.evaluate(() => window.__hb.QUESTIONS[5].answers[1].delta);
  await page.evaluate(() => window.__hb.chooseAnswer(1)); // Harrison Brothers
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === base, `horsetrader + Harrison is consistent: only base delta ${base}`);
  await teardown();
}

// S25: merchant consistent with Harrison Brothers (idx 1)
async function s25() {
  console.log('\nS25: merchant + Harrison Brothers (idx 1) is consistent');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 5;
    window.__hb.suspicion = 0;
    window.__hb.storyMemory = { trade: 'merchant' };
  });
  const base = await page.evaluate(() => window.__hb.QUESTIONS[5].answers[1].delta);
  await page.evaluate(() => window.__hb.chooseAnswer(1));
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === base, `merchant + Harrison is consistent: only base delta ${base}`);
  await teardown();
}

// S26: drifter consistent with "Nobody regular" (idx 2)
async function s26() {
  console.log('\nS26: drifter + Nobody regular (idx 2) is consistent');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 5;
    window.__hb.suspicion = 0;
    window.__hb.storyMemory = { trade: 'drifter' };
  });
  const base = await page.evaluate(() => window.__hb.QUESTIONS[5].answers[2].delta);
  await page.evaluate(() => window.__hb.chooseAnswer(2));
  const sus = await page.evaluate(() => window.__hb.suspicion);
  assert(sus === base, `drifter + Nobody regular is consistent: only base delta ${base}`);
  await teardown();
}

// S27: Stage boundary causes stage_intro between stages
async function s27() {
  console.log('\nS27: Answering Q3 triggers stage_intro before Q4');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 2; // Q3 (last of stage 1)
    window.__hb.suspicion = 0;
  });
  await page.evaluate(() => window.__hb.chooseAnswer(0));
  // Reaction plays, then should go to stage_intro
  await page.waitForTimeout(REACTION_DURATION + 300);
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'stage_intro', 'state is "stage_intro" after finishing stage 1');
  await teardown();
}

// S28: Stage boundary between stage 2 and 3
async function s28() {
  console.log('\nS28: Answering Q6 triggers stage_intro before Q7');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.questionIdx = 5; // Q6 (last of stage 2)
    window.__hb.suspicion = 0;
    window.__hb.storyMemory = { trade: 'ranchhand' };
  });
  await page.evaluate(() => window.__hb.chooseAnswer(0)); // consistent answer
  await page.waitForTimeout(REACTION_DURATION + 300);
  const st = await page.evaluate(() => window.__hb.state);
  assert(st === 'stage_intro', 'state is "stage_intro" after finishing stage 2');
  await teardown();
}

// S29: All questions have at least 2 answers
async function s29() {
  console.log('\nS29: All questions have at least 2 answers');
  await setup();
  const counts = await page.evaluate(() => window.__hb.QUESTIONS.map(q => q.answers.length));
  const allValid = counts.every(c => c >= 2);
  assert(allValid, 'all questions have >= 2 answers: ' + JSON.stringify(counts));
  await teardown();
}

// S30: All answer deltas are non-negative
async function s30() {
  console.log('\nS30: All answer deltas are >= 0');
  await setup();
  const deltas = await page.evaluate(() =>
    window.__hb.QUESTIONS.flatMap(q => q.answers.map(a => a.delta))
  );
  const allNonNeg = deltas.every(d => d >= 0);
  assert(allNonNeg, 'all deltas are >= 0: ' + JSON.stringify(deltas));
  await teardown();
}

// S31: Each question has a stage field 1, 2, or 3
async function s31() {
  console.log('\nS31: All questions have stage 1, 2, or 3');
  await setup();
  const stages = await page.evaluate(() => window.__hb.QUESTIONS.map(q => q.stage));
  const valid = stages.every(s => s === 1 || s === 2 || s === 3);
  assert(valid, 'all stages are 1, 2, or 3');
  await teardown();
}

// S32: PASS_THRESHOLD and INSTANT_ARREST_SUS correct values
async function s32() {
  console.log('\nS32: Config constants have correct values');
  await setup();
  const r = await page.evaluate(() => ({
    pass:   window.__hb.PASS_THRESHOLD,
    arrest: window.__hb.INSTANT_ARREST_SUS,
    max:    window.__hb.MAX_SUSPICION,
    bonus:  window.__hb.CONTRADICTION_BONUS,
  }));
  assert(r.pass   === 60,  'PASS_THRESHOLD is 60');
  assert(r.arrest === 80,  'INSTANT_ARREST_SUS is 80');
  assert(r.max    === 100, 'MAX_SUSPICION is 100');
  assert(r.bonus  === 25,  'CONTRADICTION_BONUS is 25');
  await teardown();
}

// S33: TRADE_LABELS covers all 4 trades
async function s33() {
  console.log('\nS33: TRADE_LABELS covers all 4 trade keys');
  await setup();
  const labels = await page.evaluate(() => window.__hb.TRADE_LABELS);
  assert(typeof labels.ranchhand   === 'string', 'TRADE_LABELS.ranchhand is string');
  assert(typeof labels.horsetrader === 'string', 'TRADE_LABELS.horsetrader is string');
  assert(typeof labels.merchant    === 'string', 'TRADE_LABELS.merchant is string');
  assert(typeof labels.drifter     === 'string', 'TRADE_LABELS.drifter is string');
  await teardown();
}

// S34: No console errors on load
async function s34() {
  console.log('\nS34: No console errors on page load');
  await setup();
  await page.waitForTimeout(500);
  assert(consoleErrors.length === 0, 'no console errors on load (got: ' + consoleErrors.join(', ') + ')');
  await teardown();
}

// S35: No console errors after startGame
async function s35() {
  console.log('\nS35: No console errors after startGame()');
  const localErrors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => {
    if (m.type() === 'error') { console.warn('[PAGE ERROR]', m.text()); localErrors.push(m.text()); }
  });
  await page.goto(FILE);
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__hb.startGame());
  await page.waitForTimeout(500);
  assert(localErrors.length === 0, 'no console errors after startGame (got: ' + localErrors.join(', ') + ')');
  await teardown();
}

// S36: Q6 matchesTrade field is array or null for all answers
async function s36() {
  console.log('\nS36: Q6 answers all have matchesTrade field');
  await setup();
  const q6answers = await page.evaluate(() => window.__hb.QUESTIONS[5].answers.map(a => ({
    text: a.text.substring(0, 20),
    matchesTrade: a.matchesTrade,
  })));
  const allHaveField = q6answers.every(a => a.matchesTrade !== undefined);
  assert(allHaveField, 'all Q6 answers have matchesTrade field');
  await teardown();
}

// S37: Full walkthrough with all 0-delta answers clears the game
async function s37() {
  console.log('\nS37: Full walkthrough choosing safest answers leads to cleared');
  await setup();
  await page.evaluate(() => {
    window.__hb.startGame();
    window.__hb.state = 'question';
    window.__hb.suspicion = 0;
    window.__hb.storyMemory = {};
    window.__hb.questionIdx = 0;
  });
  // Walk through all 9 questions, picking answer index 0 each time
  // Q6 (idx 5): answer 0 is Lazy R Ranch which is consistent with ranchhand (Q2 answer 0)
  for (let i = 0; i < 9; i++) {
    const st = await page.evaluate(() => window.__hb.state);
    if (st !== 'question') {
      // If in stage_intro, wait for it to pass
      await page.waitForTimeout(REACTION_DURATION + 400);
    }
    await page.evaluate(() => {
      if (window.__hb.state === 'question') window.__hb.chooseAnswer(0);
    });
    await page.waitForTimeout(REACTION_DURATION + 200);
    // Skip stage_intro if present
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
  const finalState = await page.evaluate(() => window.__hb.state);
  assert(finalState === 'cleared', 'full walkthrough with safest answers ends in cleared');
  await teardown();
}

// Run all tests
async function main() {
  console.log('=== Hangman\'s Bluff Tests ===');
  const tests = [s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,
                 s21,s22,s23,s24,s25,s26,s27,s28,s29,s30,s31,s32,s33,s34,s35,s36,s37];
  let passed = 0, failed = 0;
  for (const t of tests) {
    try {
      await t();
      passed++;
    } catch(e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await browser.close(); } catch(_) {} browser = null; page = null; }
    }
  }
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
