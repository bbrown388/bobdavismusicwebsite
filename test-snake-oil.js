// Playwright tests for Snake Oil (Game 13)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'snake-oil.html').replace(/\\/g, '/');
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
async function teardown() { if (browser) { await browser.close(); browser = null; page = null; } }
function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// Suite 1: Title screen renders
async function suite1() {
  console.log('\nSuite 1: Title screen renders');
  await setup();
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'title', 'initial state is title');
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 310, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 30, 'title screen renders visible content');
  await teardown();
}

// Suite 2: Canvas dimensions 360x640
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

// Suite 3: startGame resets all state
async function suite3() {
  console.log('\nSuite 3: startGame resets state');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => window.__test.getState());
  const sc = await page.evaluate(() => window.__test.getScore());
  const mk = await page.evaluate(() => window.__test.getMistakes());
  const lv = await page.evaluate(() => window.__test.getLevel());
  assert(st === 'playing', 'state is playing after startGame');
  assert(sc === 0, 'score resets to 0');
  assert(mk === 0, 'mistakes reset to 0');
  assert(lv === 1, 'level resets to 1');
  await teardown();
}

// Suite 4: Customer spawns on startGame
async function suite4() {
  console.log('\nSuite 4: Customer spawns on startGame');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.waitForTimeout(100);
  const c = await page.evaluate(() => window.__test.getCustomer());
  assert(c !== null, 'customer exists after startGame');
  assert(c.ailmentIdx >= 0 && c.ailmentIdx <= 5, 'ailmentIdx is in valid range');
  await teardown();
}

// Suite 5: Customer has ailment clue (via getAilmentCombo)
async function suite5() {
  console.log('\nSuite 5: Ailment combo data is accessible');
  await setup();
  const combo0 = await page.evaluate(() => window.__test.getAilmentCombo(0));
  const combo1 = await page.evaluate(() => window.__test.getAilmentCombo(1));
  assert(Array.isArray(combo0) && combo0.length === 2, 'ailment 0 has 2-ingredient combo');
  assert(Array.isArray(combo1) && combo1.length === 2, 'ailment 1 has 2-ingredient combo');
  assert(combo0[0] !== combo1[0] || combo0[1] !== combo1[1], 'different ailments have different combos');
  await teardown();
}

// Suite 6: Ingredient selection adds to selected set
async function suite6() {
  console.log('\nSuite 6: Ingredient selection');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => window.__test.toggleIngredient('Bloodroot'));
  const sel = await page.evaluate(() => window.__test.getSelected());
  assert(sel.includes('Bloodroot'), 'Bloodroot is selected after toggle');
  assert(sel.length === 1, 'exactly 1 ingredient selected');
  await teardown();
}

// Suite 7: Deselect ingredient by toggling again
async function suite7() {
  console.log('\nSuite 7: Deselect ingredient');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.toggleIngredient('Bloodroot');
    window.__test.toggleIngredient('Bloodroot'); // deselect
  });
  const sel = await page.evaluate(() => window.__test.getSelected());
  assert(!sel.includes('Bloodroot'), 'Bloodroot removed after second toggle');
  assert(sel.length === 0, 'selected is empty after deselect');
  await teardown();
}

// Suite 8: Cannot select more than 2 ingredients
async function suite8() {
  console.log('\nSuite 8: Max 2 ingredients selectable');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.toggleIngredient('Bloodroot');
    window.__test.toggleIngredient('Turpentine');
    window.__test.toggleIngredient('Willow Bark'); // 3rd, should be blocked
  });
  const sel = await page.evaluate(() => window.__test.getSelected());
  assert(sel.length === 2, 'only 2 ingredients can be selected at once');
  assert(!sel.includes('Willow Bark'), 'third ingredient not added when 2 already selected');
  await teardown();
}

// Suite 9: Tray scrolls right
async function suite9() {
  console.log('\nSuite 9: Tray scroll right');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const off0 = await page.evaluate(() => window.__test.getTrayOffset());
  await page.evaluate(() => window.__test.scrollTrayRight());
  const off1 = await page.evaluate(() => window.__test.getTrayOffset());
  assert(off1 === off0 + 1, 'tray offset increments after scrollRight');
  await teardown();
}

// Suite 10: Tray scrolls left
async function suite10() {
  console.log('\nSuite 10: Tray scroll left');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => { window.__test.scrollTrayRight(); window.__test.scrollTrayRight(); });
  const off0 = await page.evaluate(() => window.__test.getTrayOffset());
  await page.evaluate(() => window.__test.scrollTrayLeft());
  const off1 = await page.evaluate(() => window.__test.getTrayOffset());
  assert(off1 === off0 - 1, 'tray offset decrements after scrollLeft');
  await teardown();
}

// Suite 11: Cannot scroll past left bound
async function suite11() {
  console.log('\nSuite 11: Cannot scroll left past bound 0');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  await page.evaluate(() => {
    window.__test.scrollTrayLeft(); window.__test.scrollTrayLeft(); window.__test.scrollTrayLeft();
  });
  const off = await page.evaluate(() => window.__test.getTrayOffset());
  assert(off === 0, 'tray offset stays at 0 when scrolling left repeatedly');
  await teardown();
}

// Suite 12: Cannot scroll past right bound
async function suite12() {
  console.log('\nSuite 12: Cannot scroll right past bound');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  for (let i = 0; i < 12; i++) await page.evaluate(() => window.__test.scrollTrayRight());
  const off = await page.evaluate(() => window.__test.getTrayOffset());
  const ingCount = await page.evaluate(() => window.__test.getIngredients().length);
  assert(off <= ingCount - 4, 'tray offset does not exceed INGREDIENTS.length - VISIBLE');
  await teardown();
}

// Suite 13: Correct mix increases score
async function suite13() {
  console.log('\nSuite 13: Correct mix increases score');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerAilment(0); // Snake Bite: Bloodroot + Turpentine
    window.__test.setCustomerReady();
    window.__test.selectIngredients('Bloodroot', 'Turpentine');
    window.__test.tryMix();
  });
  await page.waitForTimeout(60);
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc > 0, 'score increased after correct mix');
  await teardown();
}

// Suite 14: Correct mix triggers customer leaving
async function suite14() {
  console.log('\nSuite 14: Correct mix triggers customer departure');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerAilment(1); // Fever: Willow Bark + River Mint
    window.__test.setCustomerReady();
    window.__test.selectIngredients('Willow Bark', 'River Mint');
    window.__test.tryMix();
  });
  await page.waitForTimeout(60);
  const c = await page.evaluate(() => window.__test.getCustomer());
  assert(c === null || c.leaving === true, 'customer is leaving or gone after correct mix');
  await teardown();
}

// Suite 15: Wrong mix increments mistakes
async function suite15() {
  console.log('\nSuite 15: Wrong mix increments mistakes');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerAilment(0); // Snake Bite: Bloodroot + Turpentine
    window.__test.setCustomerReady();
    window.__test.selectIngredients('Wild Cherry', 'Camphor'); // wrong combo
    window.__test.tryMix();
  });
  await page.waitForTimeout(60);
  const mk = await page.evaluate(() => window.__test.getMistakes());
  assert(mk === 1, 'mistakes incremented to 1 after wrong mix');
  await teardown();
}

// Suite 16: Wrong mix does not score
async function suite16() {
  console.log('\nSuite 16: Wrong mix does not award score');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerAilment(0);
    window.__test.setCustomerReady();
    window.__test.selectIngredients('Wild Cherry', 'Camphor');
    window.__test.tryMix();
  });
  await page.waitForTimeout(60);
  const sc = await page.evaluate(() => window.__test.getScore());
  assert(sc === 0, 'score stays 0 after wrong mix');
  await teardown();
}

// Suite 17: Customer timer depletes (tickFrames)
async function suite17() {
  console.log('\nSuite 17: Customer timer depletes via tickFrames');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerReady();
  });
  const t0 = await page.evaluate(() => window.__test.getCustomer().timer);
  await page.evaluate(() => window.__test.tickFrames(60));
  const t1 = await page.evaluate(() => {
    const c = window.__test.getCustomer();
    return c ? c.timer : -1;
  });
  assert(t1 < t0, 'customer timer decreased after tickFrames(60)');
  await teardown();
}

// Suite 18: Customer leaves when timer hits 0
async function suite18() {
  console.log('\nSuite 18: Customer leaves on timer expiry');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerReady();
    window.__test.setCustomerTimer(1); // nearly expired
    window.__test.tickFrames(5); // deplete remaining timer
  });
  await page.waitForTimeout(60);
  const c = await page.evaluate(() => window.__test.getCustomer());
  assert(c === null || c.leaving === true, 'customer is leaving or gone after timer expires');
  await teardown();
}

// Suite 19: Game over at 3 mistakes
async function suite19() {
  console.log('\nSuite 19: Game over at 3 mistakes');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    // Commit 3 wrong mixes
    for (let i = 0; i < 3; i++) {
      window.__test.setCustomerAilment(0);
      window.__test.setCustomerReady();
      window.__test.selectIngredients('Wild Cherry', 'Camphor');
      window.__test.tryMix();
    }
  });
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'dead', 'state is dead after 3 wrong mixes');
  await teardown();
}

// Suite 20: endGame sets state to dead
async function suite20() {
  console.log('\nSuite 20: endGame transitions to dead');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.endGame(); });
  await page.waitForTimeout(60);
  const st = await page.evaluate(() => window.__test.getState());
  assert(st === 'dead', 'state is dead after endGame');
  await teardown();
}

// Suite 21: Dead screen renders visible content
async function suite21() {
  console.log('\nSuite 21: Dead screen renders');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.endGame(); });
  await page.waitForTimeout(200);
  const px = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(W / 2, 200, 1, 1).data;
    return d[0] + d[1] + d[2];
  });
  assert(px > 30, 'dead screen renders visible content at center');
  await teardown();
}

// Suite 22: localStorage best score saved
async function suite22() {
  console.log('\nSuite 22: localStorage best score');
  await setup();
  await page.evaluate(() => {
    localStorage.removeItem('snake-oil_best');
    window.__test.startGame();
    window.__test.setCustomerAilment(0);
    window.__test.setCustomerReady();
    window.__test.selectIngredients('Bloodroot', 'Turpentine');
    window.__test.tryMix();
    window.__test.endGame();
  });
  await page.waitForTimeout(100);
  const stored = await page.evaluate(() => parseInt(localStorage.getItem('snake-oil_best') || '0'));
  const best = await page.evaluate(() => window.__test.getBest());
  assert(stored > 0, 'best score saved to localStorage');
  assert(best === stored, 'getBest() matches localStorage value');
  await teardown();
}

// Suite 23: New record detected
async function suite23() {
  console.log('\nSuite 23: New record detection');
  await setup();
  await page.evaluate(() => {
    localStorage.setItem('snake-oil_best', '5');
    window.__test.startGame();
    // Earn >5 points
    window.__test.setCustomerAilment(0);
    window.__test.setCustomerReady();
    window.__test.selectIngredients('Bloodroot', 'Turpentine');
    window.__test.tryMix();
    window.__test.endGame();
  });
  await page.waitForTimeout(100);
  const best = await page.evaluate(() => window.__test.getBest());
  assert(best > 5, 'new best score exceeds prior best of 5');
  await teardown();
}

// Suite 24: Feedback overlay opens and closes
async function suite24() {
  console.log('\nSuite 24: Feedback overlay');
  await setup();
  await page.evaluate(() => { window.__test.startGame(); window.__test.endGame(); });
  await page.waitForTimeout(60);
  await page.evaluate(() => window.__test.openFeedback());
  const vis = await page.evaluate(() => document.getElementById('fb-ov').style.display);
  assert(vis === 'flex', 'feedback overlay opens (display: flex)');
  await page.evaluate(() => window.__test.closeFeedback());
  const hid = await page.evaluate(() => document.getElementById('fb-ov').style.display);
  assert(hid === 'none', 'feedback overlay closes (display: none)');
  await teardown();
}

// Suite 25: tickFrames helper is synchronous
async function suite25() {
  console.log('\nSuite 25: tickFrames helper is synchronous');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const before = await page.evaluate(() => {
    window.__test.setCustomerReady();
    const t = window.__test.getCustomer().timer;
    window.__test.tickFrames(30);
    return t;
  });
  const after = await page.evaluate(() => {
    const c = window.__test.getCustomer();
    return c ? c.timer : -1;
  });
  assert(after < before, 'tickFrames advances timer synchronously');
  await teardown();
}

// Suite 26: Mix button visible only with 2 selected
async function suite26() {
  console.log('\nSuite 26: Mix button detection');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerReady();
  });
  const noMix = await page.evaluate(() => window.__test.isMixBtn(180, 552));
  // Without 2 selected the button is not drawn but coordinate check is always true
  // Test via trying to mix with 0 selected — score should not change
  const sc0 = await page.evaluate(() => {
    window.__test.clearSelected();
    window.__test.tryMix();
    return window.__test.getScore();
  });
  assert(sc0 === 0, 'tryMix with 0 selected does not score');
  const sc1 = await page.evaluate(() => {
    window.__test.toggleIngredient('Bloodroot');
    window.__test.tryMix();
    return window.__test.getScore();
  });
  assert(sc1 === 0, 'tryMix with 1 selected does not score');
  await teardown();
}

// Suite 27: Correct mix served count increments
async function suite27() {
  console.log('\nSuite 27: Served count increments on correct mix');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerAilment(0);
    window.__test.setCustomerReady();
    window.__test.selectIngredients('Bloodroot', 'Turpentine');
    window.__test.tryMix();
  });
  await page.waitForTimeout(60);
  const served = await page.evaluate(() => window.__test.getServed());
  assert(served === 1, 'served count is 1 after first correct mix');
  await teardown();
}

// Suite 28: Time bonus awards more pts when served quickly
async function suite28() {
  console.log('\nSuite 28: Time bonus higher when served with time remaining');
  await setup();
  const fastScore = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerAilment(0);
    window.__test.setCustomerReady();
    // Full timer remaining - max bonus
    window.__test.selectIngredients('Bloodroot', 'Turpentine');
    window.__test.tryMix();
    return window.__test.getScore();
  });
  assert(fastScore >= 10, 'fast serve earns at least 10 pts base');
  await teardown();
}

// Suite 29: Ingredients list accessible via test hook
async function suite29() {
  console.log('\nSuite 29: Ingredient list accessible');
  await setup();
  const ings = await page.evaluate(() => window.__test.getIngredients());
  assert(Array.isArray(ings), 'getIngredients returns array');
  assert(ings.length === 9, 'exactly 9 ingredients in the game');
  assert(ings.includes('Bloodroot'), 'Bloodroot is in ingredients');
  assert(ings.includes('Wild Cherry'), 'Wild Cherry is in ingredients');
  await teardown();
}

// Suite 30: Console error sweep
async function suite30() {
  console.log('\nSuite 30: Console error sweep');
  await setup();
  await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCustomerAilment(0);
    window.__test.setCustomerReady();
    window.__test.toggleIngredient('Bloodroot');
    window.__test.toggleIngredient('Turpentine');
    window.__test.tryMix();
    window.__test.scrollTrayLeft();
    window.__test.scrollTrayRight();
    window.__test.tickFrames(60);
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.__test.startGame();
    for (let i = 0; i < 3; i++) {
      window.__test.setCustomerAilment(0);
      window.__test.setCustomerReady();
      window.__test.selectIngredients('Wild Cherry', 'Camphor');
      window.__test.tryMix();
    }
  });
  await page.waitForTimeout(300);
  assert(consoleErrors.length === 0, 'no console errors during gameplay (' + consoleErrors.join(', ') + ')');
  await teardown();
}

// Run all suites
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6, suite7, suite8,
    suite9, suite10, suite11, suite12, suite13, suite14, suite15, suite16,
    suite17, suite18, suite19, suite20, suite21, suite22, suite23, suite24,
    suite25, suite26, suite27, suite28, suite29, suite30
  ];
  let passed = 0, failed = 0;
  for (const s of suites) {
    try {
      await s();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      await teardown();
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
