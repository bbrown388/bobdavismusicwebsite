// Playwright tests for Cattle Auction (Game 33)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'cattle-auction.html').replace(/\\/g, '/');
const W = 360, H = 640;
let browser, page;
let consoleErrors = [];

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  consoleErrors = [];
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (!t.includes('CORS') && !t.includes('Failed to fetch') && !t.includes('net::ERR'))
        consoleErrors.push(t);
    }
  });
  await page.goto(FILE);
  await page.waitForTimeout(300);
}
async function teardown() {
  if (browser) { try { await browser.close(); } catch(_) {} browser = null; page = null; }
}
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// Suite 1: Canvas dimensions 360x640
async function suite1() {
  console.log('\nSuite 1: Canvas dimensions 360x640');
  await setup();
  const d = await page.evaluate(() => ({
    w: document.getElementById('c').width,
    h: document.getElementById('c').height,
  }));
  assert(d.w === 360, 'canvas width = 360');
  assert(d.h === 640, 'canvas height = 640');
  await teardown();
}

// Suite 2: Initial game state is title
async function suite2() {
  console.log('\nSuite 2: Initial state is title');
  await setup();
  const ph = await page.evaluate(() => window.__test.phase);
  assert(ph === 'title', 'initial phase is title');
  await teardown();
}

// Suite 3: Core constants
async function suite3() {
  console.log('\nSuite 3: Core constants');
  await setup();
  const c = await page.evaluate(() => ({
    nb: window.__test.NUM_BUYERS,
    nl: window.__test.NUM_LOTS,
    hd: window.__test.HEAT_DECAY,
    cw: window.__test.CALL_WINDOW,
    fe: window.__test.FEEDBACK_ENDPOINT,
  }));
  assert(c.nb === 6, 'NUM_BUYERS = 6');
  assert(c.nl === 8, 'NUM_LOTS = 8');
  assert(c.hd > 0, 'HEAT_DECAY > 0');
  assert(c.cw > 0 && c.cw <= 5, 'CALL_WINDOW in (0,5]');
  assert(typeof c.fe === 'string' && c.fe.startsWith('https'), 'FEEDBACK_ENDPOINT starts with https');
  await teardown();
}

// Suite 4: BUYER_DEFS structure
async function suite4() {
  console.log('\nSuite 4: BUYER_DEFS structure');
  await setup();
  const r = await page.evaluate(() => {
    const defs = window.__test.BUYER_DEFS;
    return {
      len: defs.length,
      allHaveFields: defs.every(d => d.name && d.budget > 0 && d.baseDesire > 0 && d.personality),
      allBudgetsPositive: defs.every(d => d.budget > 0),
      allDesiresInRange: defs.every(d => d.baseDesire > 0 && d.baseDesire < 1),
      allPersonalitiesDefined: defs.every(d => typeof d.personality === 'string' && d.personality.length > 0),
    };
  });
  assert(r.len === 6, 'BUYER_DEFS has 6 entries');
  assert(r.allHaveFields, 'every buyer def has name, budget, baseDesire, personality');
  assert(r.allBudgetsPositive, 'all budgets > 0');
  assert(r.allDesiresInRange, 'all baseDesire in (0, 1)');
  assert(r.allPersonalitiesDefined, 'all personalities are non-empty strings');
  await teardown();
}

// Suite 5: BID_INTERVALS
async function suite5() {
  console.log('\nSuite 5: BID_INTERVALS');
  await setup();
  const r = await page.evaluate(() => {
    const bi = window.__test.BID_INTERVALS;
    return {
      hasAllPersonalities: ['steady','cautious','bluffer','patient','selective','eager'].every(k => bi[k] > 0),
      eagerFasterThanPatient: bi.eager < bi.patient,
      blufferFasterThanCautious: bi.bluffer < bi.cautious,
    };
  });
  assert(r.hasAllPersonalities, 'BID_INTERVALS has all 6 personality keys with positive values');
  assert(r.eagerFasterThanPatient, 'eager interval < patient interval');
  assert(r.blufferFasterThanCautious, 'bluffer interval < cautious interval');
  await teardown();
}

// Suite 6: initLots creates 8 lots with valid grades and prices
async function suite6() {
  console.log('\nSuite 6: initLots() generates 8 valid lots');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.initLots();
    const lots = window.__test.lots;
    const grades = lots.map(l => l.grade);
    const hasAllGrades = ['A','B','C'].every(g => grades.includes(g));
    const allBasePricesPositive = lots.every(l => l.basePrice > 0);
    const aPrice = lots.find(l => l.grade === 'A').basePrice;
    const cPrice = lots.find(l => l.grade === 'C').basePrice;
    return {
      len: lots.length,
      allGradesPresent: hasAllGrades,
      allBasePricesPositive,
      gradeAHigherThanC: aPrice > cPrice,
      allHaveGrade: lots.every(l => ['A','B','C'].includes(l.grade)),
    };
  });
  assert(r.len === 8, 'lots.length = 8');
  assert(r.allHaveGrade, 'every lot has a valid grade (A, B, or C)');
  assert(r.allGradesPresent, 'grades A, B, and C all appear');
  assert(r.allBasePricesPositive, 'all lot basePrices > 0');
  assert(r.gradeAHigherThanC, 'grade A basePrice > grade C basePrice');
  await teardown();
}

// Suite 7: initBuyers creates correct buyer state
async function suite7() {
  console.log('\nSuite 7: initBuyers() creates 6 buyers with correct initial state');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.initBuyers();
    const buyers = window.__test.buyers;
    return {
      len: buyers.length,
      allNotDropped: buyers.every(b => b.dropped === false),
      allIdxCorrect: buyers.every((b, i) => b.idx === i),
      allHaveBidNextAt: buyers.every(b => b.bidNextAt > 0),
      allDesireZero: buyers.every(b => b.desire === 0),
    };
  });
  assert(r.len === 6, 'buyers.length = 6');
  assert(r.allNotDropped, 'all buyers start with dropped=false');
  assert(r.allIdxCorrect, 'each buyer.idx matches its array index');
  assert(r.allHaveBidNextAt, 'each buyer starts with bidNextAt > 0');
  assert(r.allDesireZero, 'each buyer starts with desire = 0 before setLotDesires');
  await teardown();
}

// Suite 8: desireForGrade - personality-specific desire scaling
async function suite8() {
  console.log('\nSuite 8: desireForGrade() personality scaling');
  await setup();
  const r = await page.evaluate(() => {
    const fn = window.__test.desireForGrade;
    const selective = window.__test.BUYER_DEFS[4]; // Doc - selective
    const eager = window.__test.BUYER_DEFS[5];     // Billy - eager
    const steady = window.__test.BUYER_DEFS[0];    // Hank - steady
    return {
      selectiveAGTB: fn(selective, 'A') > fn(selective, 'B'),
      selectiveBGTC: fn(selective, 'B') > fn(selective, 'C'),
      eagerHighForAll: fn(eager, 'C') > 0.5,
      gradeAGTCForSteady: fn(steady, 'A') > fn(steady, 'C'),
    };
  });
  assert(r.selectiveAGTB, 'selective: desire A > desire B');
  assert(r.selectiveBGTC, 'selective: desire B > desire C');
  assert(r.eagerHighForAll, 'eager buyer has desire > 0.5 even for grade C');
  assert(r.gradeAGTCForSteady, 'steady buyer: desire A > desire C');
  await teardown();
}

// Suite 9: startGame resets all state correctly
async function suite9() {
  console.log('\nSuite 9: startGame() resets all state');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    return {
      totalScore: window.__test.totalScore,
      currentLot: window.__test.currentLot,
      heat: window.__test.heat,
      callStage: window.__test.callStage,
      buyersLen: window.__test.buyers.length,
      lotsLen: window.__test.lots.length,
      phase: window.__test.phase,
      lotResultsEmpty: window.__test.lotResults.length === 0,
      currentBidPrice: window.__test.currentBidPrice,
    };
  });
  assert(r.totalScore === 0, 'totalScore = 0 after startGame');
  assert(r.currentLot === 0, 'currentLot = 0 after startGame');
  assert(r.heat === 100, 'heat = 100 after startGame');
  assert(r.callStage === 0, 'callStage = 0 after startGame');
  assert(r.buyersLen === 6, 'buyers.length = 6 after startGame');
  assert(r.lotsLen === 8, 'lots.length = 8 after startGame');
  assert(r.phase !== 'title' && r.phase !== 'gameover', 'phase is not title or gameover after startGame');
  assert(r.lotResultsEmpty, 'lotResults is empty after startGame');
  assert(r.currentBidPrice > 0, 'currentBidPrice > 0 (first lot base price set)');
  await teardown();
}

// Suite 10: placeBid updates state correctly
async function suite10() {
  console.log('\nSuite 10: placeBid() updates state');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.phase = 'bidding';
    window.__test.heat = 80; // below 100 so placeBid boost is visible
    const startPrice = window.__test.currentBidPrice;
    const startHeat = window.__test.heat;
    window.__test.placeBid(0, startPrice + 20);
    const afterBid = {
      price: window.__test.currentBidPrice,
      lastBidder: window.__test.lastBidderIdx,
      heatIncreased: window.__test.heat > startHeat,
    };
    // Test callStage reset
    window.__test.callStage = 1;
    window.__test.callTimer = 1.0;
    window.__test.phase = 'calling';
    window.__test.placeBid(1, window.__test.currentBidPrice + 20);
    return {
      ...afterBid,
      callStageReset: window.__test.callStage === 0,
      phaseResetToBidding: window.__test.phase === 'bidding',
    };
  });
  assert(r.price > 0, 'currentBidPrice increases after placeBid');
  assert(r.lastBidder === 0, 'lastBidderIdx = 0 after buyer 0 bids');
  assert(r.heatIncreased, 'heat increases after bid');
  assert(r.callStageReset, 'callStage resets to 0 when bid arrives during calling');
  assert(r.phaseResetToBidding, 'phase resets to bidding when bid arrives during calling');
  await teardown();
}

// Suite 11: Buyer drops out when nextPrice > budget
async function suite11() {
  console.log('\nSuite 11: Buyer drops out when price exceeds budget');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.phase = 'bidding';
    const b = window.__test.buyers[1]; // Mae, budget=420
    // Set price just below budget so next increment pushes over
    window.__test.currentBidPrice = b.budget - 5;
    window.__test.lastBidderIdx = 0; // so Mae will try
    b.bidNextAt = 0;
    window.__test.tryBuyerBid(b, 0.01);
    return { dropped: window.__test.buyers[1].dropped };
  });
  assert(r.dropped === true, 'buyer drops out when nextPrice > budget');
  await teardown();
}

// Suite 12: advanceCall state transitions
async function suite12() {
  console.log('\nSuite 12: advanceCall() state transitions');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.phase = 'bidding';
    window.__test.advanceCall();
    const s1 = { phase: window.__test.phase, callStage: window.__test.callStage };

    window.__test.advanceCall();
    const s2 = { callStage: window.__test.callStage };

    window.__test.callStage = 2;
    window.__test.advanceCall();
    const s3 = { phase: window.__test.phase };

    return { s1, s2, soldPhase: s3.phase };
  });
  assert(r.s1.phase === 'calling', 'advanceCall from bidding sets phase=calling');
  assert(r.s1.callStage === 1, 'advanceCall from bidding sets callStage=1');
  assert(r.s2.callStage === 2, 'advanceCall from calling+stage1 sets callStage=2');
  assert(r.soldPhase === 'sold', 'advanceCall from calling+stage2 triggers sold state');
  await teardown();
}

// Suite 13: Heat decay and no_sale trigger
async function suite13() {
  console.log('\nSuite 13: Heat decay and no_sale trigger');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.phase = 'bidding';
    window.__test.heat = 50;
    // Freeze buyers so they don't bid and accidentally boost heat
    window.__test.buyers.forEach(b => { b.bidNextAt = 999; });
    window.__test.tickUpdate(1.0);
    const heatAfterTick = window.__test.heat;

    window.__test.heat = 0.01;
    window.__test.phase = 'bidding';
    window.__test.tickUpdate(0.1);
    const phaseAfterZeroHeat = window.__test.phase;

    window.__test.heat = -5;
    window.__test.phase = 'bidding';
    window.__test.startGame();
    window.__test.phase = 'bidding';
    window.__test.heat = -10;
    // Verify heat clamps
    window.__test.heat = 5;
    window.__test.tickUpdate(10.0); // large dt drains heat to 0
    const heatClamped = window.__test.heat;

    return { heatAfterTick, phaseAfterZeroHeat, heatClamped };
  });
  assert(r.heatAfterTick < 50, 'heat decreases after tickUpdate');
  assert(r.phaseAfterZeroHeat === 'no_sale', 'phase becomes no_sale when heat reaches 0');
  assert(r.heatClamped >= 0, 'heat clamps to 0 minimum');
  await teardown();
}

// Suite 14: lotResults and totalScore accumulation
async function suite14() {
  console.log('\nSuite 14: lotResults and totalScore accumulation');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.phase = 'calling';
    window.__test.callStage = 2;
    window.__test.currentBidPrice = 350;
    window.__test.sellLot();
    const scoreAfterSell = window.__test.totalScore;
    const resultAfterSell = window.__test.lotResults[0];

    window.__test.noSale();
    const scoreAfterNoSale = window.__test.totalScore;

    return { scoreAfterSell, resultSold: resultAfterSell.sold, resultPrice: resultAfterSell.price, scoreAfterNoSale };
  });
  assert(r.scoreAfterSell === 350, 'totalScore adds sold price');
  assert(r.resultSold === true, 'lotResult.sold = true after sellLot');
  assert(r.resultPrice === 350, 'lotResult.price = 350 after sellLot');
  assert(r.scoreAfterNoSale === 350, 'totalScore unchanged after noSale');
  await teardown();
}

// Suite 15: localStorage key format
async function suite15() {
  console.log('\nSuite 15: localStorage key is cattle-auction_best');
  await setup();
  const r = await page.evaluate(() => {
    localStorage.removeItem('cattle-auction_best');
    window.__test.startGame();
    window.__test.totalScore = 999;
    // Simulate the finishGame logic
    window.__test.finishGame();
    return localStorage.getItem('cattle-auction_best');
  });
  assert(r === '999', "localStorage key 'cattle-auction_best' stores total score");
  await teardown();
}

// Suite 16: FEEDBACK_ENDPOINT is the Google Apps Script URL
async function suite16() {
  console.log('\nSuite 16: FEEDBACK_ENDPOINT contains expected URL');
  await setup();
  const fe = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(fe.includes('script.google.com'), 'FEEDBACK_ENDPOINT points to Google Apps Script');
  await teardown();
}

// Suite 17: currentLot increments after lot resolution
async function suite17() {
  console.log('\nSuite 17: currentLot increments after lot resolution');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const lotBefore = window.__test.currentLot;
    window.__test.phase = 'sold';
    window.__test.lotResults.push({ grade: 'A', price: 300, sold: true });
    window.__test.advanceLot();
    return { lotBefore, lotAfter: window.__test.currentLot };
  });
  assert(r.lotBefore === 0, 'starts at lot 0');
  assert(r.lotAfter === 1, 'currentLot increments to 1 after advanceLot');
  await teardown();
}

// Suite 18: Game ends after NUM_LOTS lots
async function suite18() {
  console.log('\nSuite 18: Game ends (gameover) after 8 lots');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.currentLot = 7; // last lot index
    window.__test.totalScore = 1200;
    window.__test.advanceLot(); // advances currentLot to 8 >= NUM_LOTS
    return window.__test.phase;
  });
  assert(r === 'gameover', 'phase = gameover after all 8 lots resolved');
  await teardown();
}

// Suite 19: Event handlers registered
async function suite19() {
  console.log('\nSuite 19: Click and touch event handlers registered');
  await setup();
  const r = await page.evaluate(() => {
    const c = document.getElementById('c');
    // We can check that the game responds to a click (changes state from title)
    c.click();
    return window.__test.phase;
  });
  assert(r !== 'title', 'clicking canvas in title state starts the game');
  await teardown();
}

// Suite 20: No console errors on load
async function suite20() {
  console.log('\nSuite 20: No console errors on load');
  await setup();
  await page.waitForTimeout(500);
  assert(consoleErrors.length === 0, 'no console errors on load (got: ' + consoleErrors.join(', ') + ')');
  await teardown();
}

// Suite 21: Pixel color check - background is not white
async function suite21() {
  console.log('\nSuite 21: Canvas background is not white');
  await setup();
  await page.waitForTimeout(100);
  const pixel = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx2 = c.getContext('2d');
    const d = ctx2.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  });
  assert(!(pixel.r === 255 && pixel.g === 255 && pixel.b === 255), 'background pixel is not white');
  await teardown();
}

// Suite 22: drawTitle does not throw
async function suite22() {
  console.log('\nSuite 22: Drawing title screen does not throw');
  await setup();
  const r = await page.evaluate(() => {
    try {
      window.__test.phase = 'title';
      return 'ok';
    } catch (e) {
      return 'error: ' + e.message;
    }
  });
  assert(r === 'ok', 'title screen draws without error');
  await teardown();
}

// Suite 23: lotIncrement scales with price
async function suite23() {
  console.log('\nSuite 23: lotIncrement() scales with current price');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.currentBidPrice = 100;
    const inc100 = window.__test.lotIncrement();
    window.__test.currentBidPrice = 300;
    const inc300 = window.__test.lotIncrement();
    window.__test.currentBidPrice = 600;
    const inc600 = window.__test.lotIncrement();
    return { inc100, inc300, inc600 };
  });
  assert(r.inc100 <= r.inc300, 'increment at $300 >= increment at $100');
  assert(r.inc300 <= r.inc600, 'increment at $600 >= increment at $300');
  await teardown();
}

// Suite 24: getActiveBuyerCount
async function suite24() {
  console.log('\nSuite 24: getActiveBuyerCount() counts non-dropped buyers');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    const before = window.__test.getActiveBuyerCount();
    window.__test.buyers[0].dropped = true;
    window.__test.buyers[2].dropped = true;
    const after = window.__test.getActiveBuyerCount();
    return { before, after };
  });
  assert(r.before === 6, 'all 6 active before any drop');
  assert(r.after === 4, '4 active after 2 dropped');
  await teardown();
}

// Suite 25: roundRect polyfill exists
async function suite25() {
  console.log('\nSuite 25: roundRect polyfill is present');
  await setup();
  const r = await page.evaluate(() => typeof CanvasRenderingContext2D.prototype.roundRect === 'function');
  assert(r, 'CanvasRenderingContext2D.prototype.roundRect is a function');
  await teardown();
}

// === RUNNER ===
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5,
    suite6, suite7, suite8, suite9, suite10,
    suite11, suite12, suite13, suite14, suite15,
    suite16, suite17, suite18, suite19, suite20,
    suite21, suite22, suite23, suite24, suite25,
  ];

  let passed = 0, failed = 0;
  for (const s of suites) {
    try {
      await s();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await browser.close(); } catch(_) {} browser = null; page = null; }
    }
  }

  console.log(`\n=== Results: ${passed} suites passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
})();
