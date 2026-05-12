// Playwright tests for Outlaw Auction (Game 47)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'outlaw-auction.html').replace(/\\/g, '/');
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
  const st = await page.evaluate(() => window.__oa.state);
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

// S3: startGame transitions to announce
async function s3() {
  console.log('\nS3: startGame() transitions to "announce"');
  await setup();
  await page.evaluate(() => window.__oa.startGame());
  const st = await page.evaluate(() => window.__oa.state);
  assert(st === 'announce', 'state is "announce" after startGame()');
  await teardown();
}

// S4: startGame resets bankroll and lot index
async function s4() {
  console.log('\nS4: startGame() resets bankroll, currentLot, sessionProfit');
  await setup();
  await page.evaluate(() => {
    window.__oa.bankroll = 1234;
    window.__oa.sessionProfit = 999;
    window.__oa.currentLot = 4;
    window.__oa.startGame();
  });
  const r = await page.evaluate(() => ({
    bankroll:      window.__oa.bankroll,
    sessionProfit: window.__oa.sessionProfit,
    currentLot:    window.__oa.currentLot,
  }));
  assert(r.bankroll      === 3000, 'bankroll resets to STARTING_BANKROLL (3000)');
  assert(r.sessionProfit === 0,    'sessionProfit resets to 0');
  assert(r.currentLot    === 0,    'currentLot resets to 0');
  await teardown();
}

// S5: initLots creates NUM_LOTS lots
async function s5() {
  console.log('\nS5: initLots() creates exactly NUM_LOTS lots with valid fields');
  await setup();
  await page.evaluate(() => window.__oa.initLots());
  const r = await page.evaluate(() => ({
    count:   window.__oa.lots.length,
    numLots: window.__oa.NUM_LOTS,
    allHaveBounty: window.__oa.lots.every(l => l.bounty > 0),
    allHaveStart:  window.__oa.lots.every(l => l.startPrice > 0),
    allHaveName:   window.__oa.lots.every(l => typeof l.name === 'string' && l.name.length > 0),
  }));
  assert(r.count === r.numLots,  'lots.length equals NUM_LOTS (' + r.numLots + ')');
  assert(r.allHaveBounty, 'all lots have bounty > 0');
  assert(r.allHaveStart,  'all lots have startPrice > 0');
  assert(r.allHaveName,   'all lots have a name string');
  await teardown();
}

// S6: lot bounties are within defined ranges
async function s6() {
  console.log('\nS6: Lot bounties stay within OUTLAW_DEFS min/max ranges');
  await setup();
  const ok = await page.evaluate(() => {
    window.__oa.initLots();
    return window.__oa.lots.every(lot => {
      const def = window.__oa.OUTLAW_DEFS.find(d => d.name === lot.name);
      return def && lot.bounty >= def.minBounty && lot.bounty <= def.maxBounty;
    });
  });
  assert(ok, 'all lot bounties are within their OUTLAW_DEFS range');
  await teardown();
}

// S7: startLot sets state to announce and resets per-lot vars
async function s7() {
  console.log('\nS7: startLot() resets per-lot state');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
  });
  const r = await page.evaluate(() => ({
    state:         window.__oa.state,
    playerDropped: window.__oa.playerDropped,
    lotClosed:     window.__oa.lotClosed,
    lastBidder:    window.__oa.lastBidder,
    currentPrice:  window.__oa.currentPrice,
  }));
  assert(r.state         === 'announce', 'state is "announce" after startLot()');
  assert(r.playerDropped === false,      'playerDropped reset to false');
  assert(r.lotClosed     === false,      'lotClosed reset to false');
  assert(r.lastBidder    === null,       'lastBidder reset to null');
  assert(r.currentPrice  > 0,           'currentPrice initialized to startPrice');
  await teardown();
}

// S8: OUTLAW_DEFS has 8 entries
async function s8() {
  console.log('\nS8: OUTLAW_DEFS has 8 entries with required fields');
  await setup();
  const r = await page.evaluate(() => ({
    count: window.__oa.OUTLAW_DEFS.length,
    allValid: window.__oa.OUTLAW_DEFS.every(d =>
      d.name && d.crime && d.minBounty > 0 && d.maxBounty > d.minBounty
    ),
  }));
  assert(r.count === 8,   'OUTLAW_DEFS has 8 entries');
  assert(r.allValid,      'all OUTLAW_DEFS have name, crime, valid bounty range');
  await teardown();
}

// S9: RIVAL_DEFS has 5 entries
async function s9() {
  console.log('\nS9: RIVAL_DEFS has 5 entries with required fields');
  await setup();
  const r = await page.evaluate(() => ({
    count: window.__oa.RIVAL_DEFS.length,
    allValid: window.__oa.RIVAL_DEFS.every(d =>
      d.name && d.label && d.speed > 0 && d.accuracy >= 0 && d.accuracy <= 1 &&
      typeof d.x === 'number' && typeof d.y === 'number'
    ),
  }));
  assert(r.count === 5, 'RIVAL_DEFS has 5 entries');
  assert(r.allValid,    'all RIVAL_DEFS have name, label, speed, accuracy, x, y');
  await teardown();
}

// S10: initRivalsForLot creates 5 rivals with maxWilling
async function s10() {
  console.log('\nS10: initRivalsForLot() creates 5 rivals with maxWilling > startPrice');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
  });
  const r = await page.evaluate(() => ({
    count: window.__oa.rivals.length,
    allHaveMaxWilling: window.__oa.rivals.every(r => r.maxWilling > 0),
    allNotDropped:     window.__oa.rivals.every(r => r.dropped === false),
    allHaveBidTimer:   window.__oa.rivals.every(r => r.bidTimer > 0),
  }));
  assert(r.count === 5,        'rivals.length is 5');
  assert(r.allHaveMaxWilling,  'all rivals have maxWilling > 0');
  assert(r.allNotDropped,      'no rivals start as dropped');
  assert(r.allHaveBidTimer,    'all rivals have bidTimer > 0');
  await teardown();
}

// S11: bidIncrement increases with price
async function s11() {
  console.log('\nS11: bidIncrement() returns correct increments at price thresholds');
  await setup();
  await page.evaluate(() => { window.__oa.initLots(); window.__oa.startLot(); });
  const r = await page.evaluate(() => {
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 100;  const i1 = window.__oa.bidIncrement();
    window.__oa.currentPrice = 400;  const i2 = window.__oa.bidIncrement();
    window.__oa.currentPrice = 900;  const i3 = window.__oa.bidIncrement();
    window.__oa.currentPrice = 1800; const i4 = window.__oa.bidIncrement();
    return { i1, i2, i3, i4 };
  });
  assert(r.i1 === 50,  'increment at $100 is $50');
  assert(r.i2 === 100, 'increment at $400 is $100');
  assert(r.i3 === 150, 'increment at $900 is $150');
  assert(r.i4 === 200, 'increment at $1800 is $200');
  await teardown();
}

// S12: playerBid raises currentPrice and sets lastBidder to 'player'
async function s12() {
  console.log('\nS12: playerBid() raises price and sets lastBidder to "player"');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 200;
  });
  const priceBefore = await page.evaluate(() => window.__oa.currentPrice);
  const result = await page.evaluate(() => window.__oa.playerBid());
  const r = await page.evaluate(() => ({
    price:      window.__oa.currentPrice,
    lastBidder: window.__oa.lastBidder,
  }));
  assert(result === true,       'playerBid() returns true');
  assert(r.price > priceBefore, 'currentPrice increased after playerBid');
  assert(r.lastBidder === 'player', 'lastBidder set to "player"');
  await teardown();
}

// S13: playerBid drops rivals whose maxWilling is below new price
async function s13() {
  console.log('\nS13: playerBid() drops rivals below new current price');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 100;
    // Force one rival to have maxWilling just below next price
    window.__oa.rivals[0].maxWilling = 140;
    window.__oa.rivals[0].dropped = false;
  });
  await page.evaluate(() => window.__oa.playerBid()); // raises by 50 -> 150
  const dropped = await page.evaluate(() => window.__oa.rivals[0].dropped);
  assert(dropped === true, 'rival with maxWilling < new price is dropped');
  await teardown();
}

// S14: playerFold sets playerDropped to true
async function s14() {
  console.log('\nS14: playerFold() sets playerDropped to true');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
  });
  const result = await page.evaluate(() => window.__oa.playerFold());
  const dropped = await page.evaluate(() => window.__oa.playerDropped);
  assert(result === true,  'playerFold() returns true');
  assert(dropped === true, 'playerDropped is true after fold');
  await teardown();
}

// S15: playerBid fails when playerDropped
async function s15() {
  console.log('\nS15: playerBid() returns false when playerDropped=true');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.playerDropped = true;
  });
  const result = await page.evaluate(() => window.__oa.playerBid());
  assert(result === false, 'playerBid() returns false when playerDropped');
  await teardown();
}

// S16: playerFold fails when already folded
async function s16() {
  console.log('\nS16: playerFold() returns false when already folded');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.playerDropped = true;
  });
  const result = await page.evaluate(() => window.__oa.playerFold());
  assert(result === false, 'second playerFold() returns false');
  await teardown();
}

// S17: doCloseLot with player winner updates bankroll correctly
async function s17() {
  console.log('\nS17: doCloseLot("player") updates bankroll by bounty - price');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 400;
    window.__oa.bankroll = 3000;
    window.__oa.lots[0].bounty = 1000;
  });
  await page.evaluate(() => window.__oa.doCloseLot('player'));
  const r = await page.evaluate(() => ({
    bankroll:  window.__oa.bankroll,
    state:     window.__oa.state,
    lotClosed: window.__oa.lotClosed,
    winner:    window.__oa.closeWinner,
    revealed:  window.__oa.revealedBounty,
  }));
  assert(r.bankroll === 3600,     'bankroll = 3000 - 400 + 1000 = 3600');
  assert(r.state === 'reveal',    'state transitions to "reveal"');
  assert(r.lotClosed === true,    'lotClosed set to true');
  assert(r.winner === 'player',   'closeWinner is "player"');
  assert(r.revealed === 1000,     'revealedBounty set to lot.bounty');
  await teardown();
}

// S18: doCloseLot with rival winner does not change bankroll
async function s18() {
  console.log('\nS18: doCloseLot(rivalIdx) does not change player bankroll');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.bankroll = 3000;
    window.__oa.initRivalsForLot();
  });
  await page.evaluate(() => window.__oa.doCloseLot(0));
  const bankroll = await page.evaluate(() => window.__oa.bankroll);
  assert(bankroll === 3000, 'bankroll unchanged when rival wins');
  await teardown();
}

// S19: doCloseLot is idempotent (only runs once)
async function s19() {
  console.log('\nS19: doCloseLot() is idempotent - second call has no effect');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.bankroll = 3000;
    window.__oa.currentPrice = 500;
    window.__oa.lots[0].bounty = 800;
  });
  await page.evaluate(() => {
    window.__oa.doCloseLot('player');
    window.__oa.bankroll = 9999; // tamper
    window.__oa.doCloseLot('player'); // second call should be no-op
  });
  const bankroll = await page.evaluate(() => window.__oa.bankroll);
  assert(bankroll === 9999, 'second doCloseLot() call is a no-op');
  await teardown();
}

// S20: doCloseLot('none') does not change bankroll or add won result
async function s20() {
  console.log('\nS20: doCloseLot("none") - no sale, bankroll unchanged');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.bankroll = 3000;
  });
  await page.evaluate(() => window.__oa.doCloseLot('none'));
  const r = await page.evaluate(() => ({
    bankroll: window.__oa.bankroll,
    result:   window.__oa.lotResults[window.__oa.lotResults.length - 1],
  }));
  assert(r.bankroll === 3000,      'bankroll unchanged on no-sale');
  assert(r.result.won === false,   'lotResult.won is false on no-sale');
  await teardown();
}

// S21: advanceLot increments currentLot
async function s21() {
  console.log('\nS21: advanceLot() increments currentLot');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
  });
  await page.evaluate(() => window.__oa.advanceLot());
  const lot = await page.evaluate(() => window.__oa.currentLot);
  assert(lot === 1, 'currentLot is 1 after advanceLot()');
  await teardown();
}

// S22: final lot advance triggers gameover
async function s22() {
  console.log('\nS22: advancing past last lot triggers gameover state');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.currentLot = window.__oa.NUM_LOTS - 1;
  });
  await page.evaluate(() => window.__oa.advanceLot());
  const st = await page.evaluate(() => window.__oa.state);
  assert(st === 'gameover', 'state is "gameover" after last lot');
  await teardown();
}

// S23: tryRivalBid does not bid when lotClosed
async function s23() {
  console.log('\nS23: tryRivalBid() does nothing when lotClosed=true');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 100;
    window.__oa.lotClosed = true;
    window.__oa.rivals[0].bidTimer = -99;
    window.__oa.rivals[0].maxWilling = 5000;
  });
  const priceBefore = await page.evaluate(() => window.__oa.currentPrice);
  await page.evaluate(() => window.__oa.tryRivalBid(window.__oa.rivals[0], 0.1));
  const priceAfter = await page.evaluate(() => window.__oa.currentPrice);
  assert(priceAfter === priceBefore, 'price unchanged when lotClosed');
  await teardown();
}

// S24: tryRivalBid drops rival when price exceeds maxWilling
async function s24() {
  console.log('\nS24: tryRivalBid() drops rival when nextPrice > maxWilling');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 400;
    window.__oa.rivals[1].maxWilling = 420;  // next price (400+50=450) > maxWilling
    window.__oa.rivals[1].bidTimer = -99;
    window.__oa.rivals[1].dropped  = false;
  });
  await page.evaluate(() => window.__oa.tryRivalBid(window.__oa.rivals[1], 0.1));
  const dropped = await page.evaluate(() => window.__oa.rivals[1].dropped);
  assert(dropped === true, 'rival dropped when nextPrice > maxWilling');
  await teardown();
}

// S25: tryRivalBid bids when timer expired and maxWilling sufficient
async function s25() {
  console.log('\nS25: tryRivalBid() bids when bidTimer <= 0 and price ok');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 100;
    window.__oa.rivals[0].maxWilling = 2000;
    window.__oa.rivals[0].bidTimer   = -1;
    window.__oa.rivals[0].dropped    = false;
    window.__oa.lastBidder           = null; // not this rival's turn restriction
  });
  const before = await page.evaluate(() => window.__oa.currentPrice);
  await page.evaluate(() => window.__oa.tryRivalBid(window.__oa.rivals[0], 0.1));
  const r = await page.evaluate(() => ({
    price:      window.__oa.currentPrice,
    lastBidder: window.__oa.lastBidder,
    bidCount:   window.__oa.rivals[0].bidCount,
  }));
  assert(r.price > before,       'currentPrice increased after rival bid');
  assert(r.lastBidder === 0,     'lastBidder set to rival idx 0');
  assert(r.bidCount   === 1,     'bidCount incremented to 1');
  await teardown();
}

// S26: cooldown closes lot after expiry
async function s26() {
  console.log('\nS26: tickUpdate closes lot when cooldown <= 0');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.cooldown = 0.01;
    window.__oa.lastBidder = 'player';
  });
  await page.evaluate(() => window.__oa.tickUpdate(0.5));
  const r = await page.evaluate(() => ({
    state:    window.__oa.state,
    winner:   window.__oa.closeWinner,
    closed:   window.__oa.lotClosed,
  }));
  assert(r.state  === 'reveal',  'state transitions to "reveal" when cooldown expires');
  assert(r.winner === 'player',  'closeWinner is "player" when player was last bidder');
  assert(r.closed === true,      'lotClosed is true');
  await teardown();
}

// S27: announce state transitions to bidding after timer
async function s27() {
  console.log('\nS27: tickUpdate advances from "announce" to "bidding" after timer');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'announce';
  });
  await page.evaluate(() => window.__oa.tickUpdate(window.__oa.LOT_ANNOUNCE_DUR + 0.1));
  const st = await page.evaluate(() => window.__oa.state);
  assert(st === 'bidding', 'state becomes "bidding" after announce timer expires');
  await teardown();
}

// S28: lotResults accumulate correctly over multiple lots
async function s28() {
  console.log('\nS28: lotResults accumulates one entry per closed lot');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
  });
  await page.evaluate(() => {
    window.__oa.doCloseLot('player');
  });
  const len = await page.evaluate(() => window.__oa.lotResults.length);
  assert(len === 1, 'lotResults has 1 entry after 1 lot closed');
  await teardown();
}

// S29: excite values on rivals are within [0,1]
async function s29() {
  console.log('\nS29: rival excite levels are clamped to [0, 1]');
  await setup();
  const ok = await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    return window.__oa.rivals.every(r => r.excite >= 0 && r.excite <= 1);
  });
  assert(ok, 'all rival excite values are in [0, 1]');
  await teardown();
}

// S30: playerBid fails in non-bidding state
async function s30() {
  console.log('\nS30: playerBid() fails when state is not "bidding"');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'announce';
  });
  const result = await page.evaluate(() => window.__oa.playerBid());
  assert(result === false, 'playerBid() returns false in announce state');
  await teardown();
}

// S31: lots are selected from OUTLAW_DEFS (no duplicates per session)
async function s31() {
  console.log('\nS31: initLots() picks unique outlaws (no duplicates)');
  await setup();
  const ok = await page.evaluate(() => {
    window.__oa.initLots();
    const names = window.__oa.lots.map(l => l.name);
    return new Set(names).size === names.length;
  });
  assert(ok, 'all lot names are unique within a session');
  await teardown();
}

// S32: FEEDBACK_ENDPOINT is correct
async function s32() {
  console.log('\nS32: FEEDBACK_ENDPOINT is configured');
  await setup();
  const ep = await page.evaluate(() => window.__oa.FEEDBACK_ENDPOINT);
  assert(ep && ep.startsWith('https://'), 'FEEDBACK_ENDPOINT starts with https://');
  await teardown();
}

// S33: playerBid does not bid when lotClosed
async function s33() {
  console.log('\nS33: playerBid() returns false when lotClosed=true');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.lotClosed = true;
  });
  const result = await page.evaluate(() => window.__oa.playerBid());
  assert(result === false, 'playerBid() returns false when lotClosed');
  await teardown();
}

// S34: doCloseLot records correct pricePaid in lotResults
async function s34() {
  console.log('\nS34: doCloseLot records pricePaid correctly in lotResults');
  await setup();
  await page.evaluate(() => {
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.state = 'bidding';
    window.__oa.currentPrice = 750;
    window.__oa.lots[0].bounty = 1200;
    window.__oa.bankroll = 3000;
  });
  await page.evaluate(() => window.__oa.doCloseLot('player'));
  const result = await page.evaluate(() => window.__oa.lotResults[0]);
  assert(result.pricePaid === 750,  'pricePaid is 750');
  assert(result.profit    === 450,  'profit is 1200 - 750 = 450');
  assert(result.won       === true, 'won is true');
  await teardown();
}

// S35: gameover state saves personal best to localStorage
async function s35() {
  console.log('\nS35: finishGame() saves bankroll to localStorage best');
  await setup();
  await page.evaluate(() => {
    localStorage.removeItem('outlaw-auction_best');
    window.__oa.initLots();
    window.__oa.startLot();
    window.__oa.bankroll = 4200;
    window.__oa.currentLot = window.__oa.NUM_LOTS - 1;
  });
  await page.evaluate(() => window.__oa.finishGame());
  const best = await page.evaluate(() => parseInt(localStorage.getItem('outlaw-auction_best') || '0'));
  assert(best === 4200, 'localStorage best set to 4200');
  await teardown();
}

// S36: No console errors on load
async function s36() {
  console.log('\nS36: No console errors on page load');
  await setup();
  await page.waitForTimeout(500);
  assert(consoleErrors.length === 0, 'no console errors on load (errors: ' + consoleErrors.join(', ') + ')');
  await teardown();
}

// === RUNNER ===
const SUITES = [s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,
                s21,s22,s23,s24,s25,s26,s27,s28,s29,s30,s31,s32,s33,s34,s35,s36];

(async () => {
  let passed = 0, failed = 0;
  for (const suite of SUITES) {
    try {
      await suite();
      passed++;
    } catch(e) {
      console.error(e.message);
      if (browser) { try { await browser.close(); } catch(_) {} browser = null; page = null; }
      failed++;
    }
  }
  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  process.exit(failed > 0 ? 1 : 0);
})();
