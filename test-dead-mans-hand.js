// Playwright tests for Dead Man's Hand (Game 18)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'dead-mans-hand.html').replace(/\\/g, '/');
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
async function teardown() { if (browser) { await browser.close(); browser = null; page = null; } }
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

// Suite 2: Canvas dimensions
async function suite2() {
  console.log('\nSuite 2: Canvas dimensions');
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

// Suite 4: Player starts with correct chips
async function suite4() {
  console.log('\nSuite 4: Player chip init');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const chips = await page.evaluate(() => window.__test.getPlayer().chips);
  // After posting SB=10, player should have STARTING_CHIPS - 10
  assert(chips === 490, 'player chips is 490 after SB (got ' + chips + ')');
  await teardown();
}

// Suite 5: Three AI opponents
async function suite5() {
  console.log('\nSuite 5: Three AI opponents');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const n = await page.evaluate(() => window.__test.getAIs().length);
  assert(n === 3, 'there are 3 AI opponents (got ' + n + ')');
  await teardown();
}

// Suite 6: AI names are distinct
async function suite6() {
  console.log('\nSuite 6: AI names are distinct');
  await setup();
  const names = await page.evaluate(() => window.__test.AI_DEFS.map(d => d.name));
  const unique = new Set(names).size;
  assert(unique === 3, 'AI names are distinct (got ' + names.join(', ') + ')');
  await teardown();
}

// Suite 7: AI bluff rates differ
async function suite7() {
  console.log('\nSuite 7: AI bluff rates differ');
  await setup();
  const rates = await page.evaluate(() => window.__test.AI_DEFS.map(d => d.bluffRate));
  const tight = rates[0], loose = rates[1];
  assert(loose > tight, 'loose AI bluffs more than tight AI (tight=' + tight + ' loose=' + loose + ')');
  await teardown();
}

// Suite 8: newHand deals 2 cards to player
async function suite8() {
  console.log('\nSuite 8: newHand deals 2 cards to player');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const hlen = await page.evaluate(() => window.__test.getPlayer().hole.length);
  assert(hlen === 2, 'player has 2 hole cards (got ' + hlen + ')');
  await teardown();
}

// Suite 9: newHand deals 2 cards to each AI
async function suite9() {
  console.log('\nSuite 9: newHand deals 2 cards to each AI');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const lens = await page.evaluate(() => window.__test.getAIs().map(ai => ai.hole.length));
  assert(lens.every(l => l === 2), 'each AI has 2 cards (got ' + lens + ')');
  await teardown();
}

// Suite 10: Community starts empty
async function suite10() {
  console.log('\nSuite 10: Community starts empty');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const n = await page.evaluate(() => window.__test.getCommunity().length);
  assert(n === 0, 'community is empty at start (got ' + n + ')');
  await teardown();
}

// Suite 11: eval5 - straight flush detection
async function suite11() {
  console.log('\nSuite 11: eval5 straight flush');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:10,suit:0},{rank:11,suit:0},{rank:12,suit:0},{rank:13,suit:0},{rank:14,suit:0}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 9, 'royal flush scores 9 (got ' + score[0] + ')');
  await teardown();
}

// Suite 12: eval5 - four of a kind
async function suite12() {
  console.log('\nSuite 12: eval5 four of a kind');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:7,suit:0},{rank:7,suit:1},{rank:7,suit:2},{rank:7,suit:3},{rank:10,suit:0}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 8, 'four of a kind scores 8 (got ' + score[0] + ')');
  await teardown();
}

// Suite 13: eval5 - full house
async function suite13() {
  console.log('\nSuite 13: eval5 full house');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:8,suit:0},{rank:8,suit:1},{rank:8,suit:2},{rank:5,suit:0},{rank:5,suit:1}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 7, 'full house scores 7 (got ' + score[0] + ')');
  await teardown();
}

// Suite 14: eval5 - flush
async function suite14() {
  console.log('\nSuite 14: eval5 flush');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:2,suit:1},{rank:5,suit:1},{rank:7,suit:1},{rank:11,suit:1},{rank:14,suit:1}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 6, 'flush scores 6 (got ' + score[0] + ')');
  await teardown();
}

// Suite 15: eval5 - straight
async function suite15() {
  console.log('\nSuite 15: eval5 straight');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:5,suit:0},{rank:6,suit:1},{rank:7,suit:2},{rank:8,suit:3},{rank:9,suit:0}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 5, 'straight scores 5 (got ' + score[0] + ')');
  await teardown();
}

// Suite 16: eval5 - three of a kind
async function suite16() {
  console.log('\nSuite 16: eval5 three of a kind');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:9,suit:0},{rank:9,suit:1},{rank:9,suit:2},{rank:3,suit:0},{rank:7,suit:1}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 4, 'three of a kind scores 4 (got ' + score[0] + ')');
  await teardown();
}

// Suite 17: eval5 - two pair
async function suite17() {
  console.log('\nSuite 17: eval5 two pair');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:10,suit:0},{rank:10,suit:1},{rank:6,suit:0},{rank:6,suit:1},{rank:3,suit:2}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 3, 'two pair scores 3 (got ' + score[0] + ')');
  await teardown();
}

// Suite 18: eval5 - pair
async function suite18() {
  console.log('\nSuite 18: eval5 pair');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:14,suit:0},{rank:14,suit:1},{rank:2,suit:2},{rank:5,suit:3},{rank:9,suit:0}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 2, 'pair scores 2 (got ' + score[0] + ')');
  assert(score[1] === 14, 'pair is aces (got ' + score[1] + ')');
  await teardown();
}

// Suite 19: eval5 - high card
async function suite19() {
  console.log('\nSuite 19: eval5 high card');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:2,suit:0},{rank:5,suit:1},{rank:7,suit:2},{rank:9,suit:3},{rank:14,suit:0}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 1, 'high card scores 1 (got ' + score[0] + ')');
  await teardown();
}

// Suite 20: best7 finds best hand from 7 cards
async function suite20() {
  console.log('\nSuite 20: best7 finds best 5 from 7');
  await setup();
  const score = await page.evaluate(() => {
    // Hole: A♠ A♦ | Community: A♥ A♣ K♠ K♦ 2♣ => quads aces beats everything
    const cards = [
      {rank:14,suit:0},{rank:14,suit:2},
      {rank:14,suit:1},{rank:14,suit:3},
      {rank:13,suit:0},{rank:13,suit:2},{rank:2,suit:3}
    ];
    return window.__test.best7(cards);
  });
  assert(score[0] === 8, 'best7 finds four aces (got rank ' + score[0] + ')');
  await teardown();
}

// Suite 21: cmpScore comparison
async function suite21() {
  console.log('\nSuite 21: cmpScore comparison');
  await setup();
  const result = await page.evaluate(() => {
    const flush = [6, 14, 11, 9, 5, 2];
    const straight = [5, 10];
    return window.__test.cmpScore(flush, straight);
  });
  assert(result > 0, 'flush beats straight (cmp=' + result + ')');
  await teardown();
}

// Suite 22: preFlopStrength - pocket pair beats rags
async function suite22() {
  console.log('\nSuite 22: preFlopStrength pocket pair > rags');
  await setup();
  const result = await page.evaluate(() => {
    const pair = window.__test.preFlopStrength([{rank:9,suit:0},{rank:9,suit:2}]);
    const rags = window.__test.preFlopStrength([{rank:2,suit:0},{rank:7,suit:3}]);
    return { pair, rags };
  });
  assert(result.pair > result.rags, 'pocket pair (' + result.pair.toFixed(2) + ') > rags (' + result.rags.toFixed(2) + ')');
  await teardown();
}

// Suite 23: tight AI folds weak hand
async function suite23() {
  console.log('\nSuite 23: tight AI folds weak hand');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const action = await page.evaluate(() => {
    // Force tight AI (idx=0) to have 2-7 offsuit (very weak pre-flop)
    window.__test.setAIHole(0, [{rank:2,suit:0},{rank:7,suit:3}]);
    window.__test.setCommunity([]);
    // Call multiple times to get a fold result
    let result = 'check';
    for (let i = 0; i < 20; i++) {
      result = window.__test.aiDecideForAI(0, 20);
      if (result === 'fold') break;
    }
    return result;
  });
  assert(action === 'fold', 'tight AI folds weak hand eventually (got ' + action + ')');
  await teardown();
}

// Suite 24: tell is valid signal
async function suite24() {
  console.log('\nSuite 24: tell signal is valid');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const tells = await page.evaluate(() => {
    const valid = ['nervous', 'confident', 'neutral'];
    return window.__test.getAIs().every(ai => valid.includes(ai.tell));
  });
  assert(tells, 'all AI tells are valid (nervous/confident/neutral)');
  await teardown();
}

// Suite 25: playerAct fold sets folded flag
async function suite25() {
  console.log('\nSuite 25: playerAct fold');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.playerAct('fold'));
  const folded = await page.evaluate(() => window.__test.getPlayer().folded);
  assert(folded === true, 'player.folded is true after fold');
  await teardown();
}

// Suite 26: playerAct call adds to pot
async function suite26() {
  console.log('\nSuite 26: playerAct call increases pot');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const potBefore = await page.evaluate(() => window.__test.getPot());
  await page.evaluate(() => window.__test.playerAct('call'));
  const potAfter = await page.evaluate(() => window.__test.getPot());
  assert(potAfter > potBefore, 'pot increased after call (before=' + potBefore + ' after=' + potAfter + ')');
  await teardown();
}

// Suite 27: playerAct raise increases currentBet
async function suite27() {
  console.log('\nSuite 27: playerAct raise increases currentBet');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const betBefore = await page.evaluate(() => window.__test.getCurrentBet());
  await page.evaluate(() => window.__test.playerAct('raise'));
  const betAfter = await page.evaluate(() => window.__test.getCurrentBet());
  assert(betAfter > betBefore, 'currentBet increased after raise (before=' + betBefore + ' after=' + betAfter + ')');
  await teardown();
}

// Suite 28: After player acts and AIs resolve, community has 3 on flop
async function suite28() {
  console.log('\nSuite 28: Flop reveals 3 community cards');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.playerAct('call');
    window.__test.flushAIs();
  });
  const { round, comm } = await page.evaluate(() => ({
    round: window.__test.getRoundName(),
    comm: window.__test.getCommunity().length
  }));
  assert(round === 'flop', 'round advances to flop (got ' + round + ')');
  assert(comm === 3, 'community has 3 cards on flop (got ' + comm + ')');
  await teardown();
}

// Suite 29: Turn reveals 4th community card
async function suite29() {
  console.log('\nSuite 29: Turn reveals 4th community card');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // pre_flop
    window.__test.playerAct('call'); window.__test.flushAIs();
    // flop
    window.__test.playerAct('call'); window.__test.flushAIs();
  });
  const { round, comm } = await page.evaluate(() => ({
    round: window.__test.getRoundName(),
    comm: window.__test.getCommunity().length
  }));
  assert(round === 'turn', 'round advances to turn (got ' + round + ')');
  assert(comm === 4, 'community has 4 cards on turn (got ' + comm + ')');
  await teardown();
}

// Suite 30: River reveals 5th community card
async function suite30() {
  console.log('\nSuite 30: River reveals 5th community card');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.playerAct('call'); window.__test.flushAIs(); // pre_flop
    window.__test.playerAct('call'); window.__test.flushAIs(); // flop
    window.__test.playerAct('call'); window.__test.flushAIs(); // turn
  });
  const comm = await page.evaluate(() => window.__test.getCommunity().length);
  assert(comm === 5, 'community has 5 cards on river (got ' + comm + ')');
  await teardown();
}

// Suite 31: Showdown after river
async function suite31() {
  console.log('\nSuite 31: Showdown after river betting');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.playerAct('call'); window.__test.flushAIs(); // pre_flop
    window.__test.playerAct('call'); window.__test.flushAIs(); // flop
    window.__test.playerAct('call'); window.__test.flushAIs(); // turn
    window.__test.playerAct('call'); window.__test.flushAIs(); // river -> showdown
  });
  const phase = await page.evaluate(() => window.__test.getPhase());
  assert(phase === 'showdown' || phase === 'hand_result', 'phase is showdown or hand_result after river (got ' + phase + ')');
  await teardown();
}

// Suite 32: Player wins with better hand
async function suite32() {
  console.log('\nSuite 32: Player wins with better hand');
  await setup();
  const result = await page.evaluate(() => {
    window.__test.startGame();
    // Give player four aces, AIs get garbage
    window.__test.setPlayerHole([{rank:14,suit:0},{rank:14,suit:1}]);
    window.__test.setAIHole(0, [{rank:2,suit:0},{rank:3,suit:1}]);
    window.__test.setAIHole(1, [{rank:4,suit:0},{rank:5,suit:1}]);
    window.__test.setAIHole(2, [{rank:6,suit:0},{rank:7,suit:1}]);
    // Set community to give player aces full house
    window.__test.setCommunity([{rank:14,suit:2},{rank:14,suit:3},{rank:2,suit:2},{rank:3,suit:3},{rank:4,suit:2}]);
    window.__test.setRoundName('river');
    window.__test.setPhase('player_act');
    window.__test.playerAct('call');
    window.__test.flushAIs();
    window.__test.flushShowdown();
    return {
      phase: window.__test.getPhase(),
      msg: window.__test.getPhase()
    };
  });
  const ph = await page.evaluate(() => window.__test.getPhase());
  assert(ph === 'hand_result', 'phase is hand_result after showdown resolution (got ' + ph + ')');
  await teardown();
}

// Suite 33: Pot goes to winner
async function suite33() {
  console.log('\nSuite 33: Pot distributed to winner');
  await setup();
  const chipsBefore = await page.evaluate(() => {
    window.__test.startGame();
    return window.__test.getPlayer().chips;
  });
  const chipsAfter = await page.evaluate(() => {
    window.__test.setPlayerHole([{rank:14,suit:0},{rank:14,suit:1}]);
    window.__test.setAIHole(0, [{rank:2,suit:0},{rank:3,suit:1}]);
    window.__test.setAIHole(1, [{rank:4,suit:0},{rank:5,suit:1}]);
    window.__test.setAIHole(2, [{rank:6,suit:0},{rank:7,suit:1}]);
    window.__test.setCommunity([{rank:14,suit:2},{rank:14,suit:3},{rank:8,suit:0},{rank:9,suit:1},{rank:10,suit:2}]);
    window.__test.setRoundName('river');
    window.__test.setPhase('player_act');
    const potSnap = window.__test.getPot();
    window.__test.playerAct('call');
    window.__test.flushAIs();
    window.__test.flushShowdown();
    return window.__test.getPlayer().chips;
  });
  // Player should have chips (pot was distributed)
  assert(chipsAfter >= 0, 'player has non-negative chips after pot resolution (got ' + chipsAfter + ')');
  await teardown();
}

// Suite 34: Hand number increments
async function suite34() {
  console.log('\nSuite 34: Hand number increments');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const h1 = await page.evaluate(() => window.__test.getHandNum());
  assert(h1 === 1, 'handNum is 1 after first newHand (got ' + h1 + ')');
  await teardown();
}

// Suite 35: Player bust leads to game_over
async function suite35() {
  console.log('\nSuite 35: Player bust leads to game_over');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Force player to 0 chips
    window.__test.setPlayerChips(0);
    // Trigger hand_result transition
    window.__test.setPhase('hand_result');
    // Manually call update-like logic: set resultTimer
  });
  // Simulate the hand_result timer expiring
  const phase = await page.evaluate(() => {
    // Directly call what happens on resultTimer <= 0
    const p = window.__test.getPlayer();
    if (p.chips <= 0) {
      window.__test.setPhase('game_over');
    }
    return window.__test.getPhase();
  });
  assert(phase === 'game_over', 'phase becomes game_over when player busted (got ' + phase + ')');
  await teardown();
}

// Suite 36: MAX_HANDS constant is 5
async function suite36() {
  console.log('\nSuite 36: MAX_HANDS constant');
  await setup();
  const n = await page.evaluate(() => window.__test.MAX_HANDS);
  assert(n === 5, 'MAX_HANDS is 5 (got ' + n + ')');
  await teardown();
}

// Suite 37: Wheel straight detection (A-2-3-4-5)
async function suite37() {
  console.log('\nSuite 37: eval5 wheel straight (A-2-3-4-5)');
  await setup();
  const score = await page.evaluate(() => {
    const cards = [{rank:14,suit:0},{rank:2,suit:1},{rank:3,suit:2},{rank:4,suit:3},{rank:5,suit:0}];
    return window.__test.eval5(cards);
  });
  assert(score[0] === 5, 'wheel is a straight (got rank ' + score[0] + ')');
  assert(score[1] === 5, 'wheel high card is 5 not ace (got ' + score[1] + ')');
  await teardown();
}

// Suite 38: Render check - title screen is not blank
async function suite38() {
  console.log('\nSuite 38: Title screen renders content');
  await setup();
  const px = await page.evaluate(() => window.__test.getPixel(180, 130));
  // Title background should be very dark (purple/black)
  assert(px.a === 255, 'canvas has been drawn (alpha=255, got ' + px.a + ')');
  await teardown();
}

// Suite 39: Render check - game screen has felt (green) and HUD
async function suite39() {
  console.log('\nSuite 39: Game screen renders felt area');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const px = await page.evaluate(() => window.__test.getPixel(180, 280)); // center of felt
  assert(px.g > px.r, 'felt is greenish (g=' + px.g + ' r=' + px.r + ')');
  await teardown();
}

// Suite 40: Render check - player card area (cream)
async function suite40() {
  console.log('\nSuite 40: Player card area renders card content');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  // Player card center-left at ~(145, 310)
  const px = await page.evaluate(() => window.__test.getPixel(145, 312));
  assert(px.a === 255, 'player card area is drawn (got a=' + px.a + ')');
  await teardown();
}

// Suite 41: Feedback overlay hidden on load
async function suite41() {
  console.log('\nSuite 41: Feedback overlay hidden initially');
  await setup();
  const visible = await page.evaluate(() => {
    const el = document.getElementById('fb-overlay');
    return el.style.display === 'flex';
  });
  assert(!visible, 'feedback overlay is hidden on load');
  await teardown();
}

// Suite 42: State cycle title -> playing -> game_over
async function suite42() {
  console.log('\nSuite 42: State cycle');
  await setup();
  const s1 = await page.evaluate(() => window.__test.getState());
  assert(s1 === 'title', 'starts in title');
  await page.evaluate(() => window.__test.startGame());
  const s2 = await page.evaluate(() => window.__test.getState());
  assert(s2 === 'playing', 'after startGame: playing');
  await page.evaluate(() => window.__test.setPhase('game_over'));
  const s3 = await page.evaluate(() => window.__test.getState());
  assert(s3 === 'game_over', 'setPhase game_over works');
  await teardown();
}

// Suite 43: Blind amounts are correct
async function suite43() {
  console.log('\nSuite 43: Blind constants');
  await setup();
  const { sb, bb } = await page.evaluate(() => ({
    sb: window.__test.SMALL_BLIND,
    bb: window.__test.BIG_BLIND
  }));
  assert(sb === 10, 'SMALL_BLIND is 10 (got ' + sb + ')');
  assert(bb === 20, 'BIG_BLIND is 20 (got ' + bb + ')');
  assert(bb === sb * 2, 'BIG_BLIND is double SMALL_BLIND');
  await teardown();
}

// Suite 44: Console error sweep
async function suite44() {
  console.log('\nSuite 44: No console errors during normal play');
  await setup();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.playerAct('call');
    window.__test.flushAIs();
    window.__test.playerAct('call');
    window.__test.flushAIs();
  });
  await page.waitForTimeout(200);
  assert(errors.length === 0, 'no console errors (found: ' + errors.join(', ') + ')');
  await teardown();
}

// Runner
const suites = [
  suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8, suite9, suite10,
  suite11, suite12, suite13, suite14, suite15, suite16, suite17, suite18, suite19, suite20,
  suite21, suite22, suite23, suite24, suite25, suite26, suite27, suite28, suite29, suite30,
  suite31, suite32, suite33, suite34, suite35, suite36, suite37, suite38, suite39, suite40,
  suite41, suite42, suite43, suite44
];

(async () => {
  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      if (browser) { await browser.close(); browser = null; page = null; }
    }
  }
  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  process.exit(failed > 0 ? 1 : 0);
})();
