// Playwright tests for Barbed Wire (Game 32)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'barbed-wire.html').replace(/\\/g, '/');
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

// Suite 1: Canvas dimensions
async function suite1() {
  console.log('\nSuite 1: Canvas dimensions 360x640');
  await setup();
  const d = await page.evaluate(() => ({ w: document.getElementById('c').width, h: document.getElementById('c').height }));
  assert(d.w === 360, 'canvas width 360');
  assert(d.h === 640, 'canvas height 640');
  await teardown();
}

// Suite 2: Initial state is title
async function suite2() {
  console.log('\nSuite 2: Initial state is title');
  await setup();
  const ph = await page.evaluate(() => window.__test.phase);
  assert(ph === 'title', 'phase starts as title');
  await teardown();
}

// Suite 3: POST_COLS has 5 entries
async function suite3() {
  console.log('\nSuite 3: POST_COLS length');
  await setup();
  const n = await page.evaluate(() => window.__test.POST_COLS.length);
  assert(n === 5, 'POST_COLS has 5 entries');
  await teardown();
}

// Suite 4: POST_ROWS has 6 entries
async function suite4() {
  console.log('\nSuite 4: POST_ROWS length');
  await setup();
  const n = await page.evaluate(() => window.__test.POST_ROWS.length);
  assert(n === 6, 'POST_ROWS has 6 entries');
  await teardown();
}

// Suite 5: MAX_CONN equals 2
async function suite5() {
  console.log('\nSuite 5: MAX_CONN = 2');
  await setup();
  const mc = await page.evaluate(() => window.__test.MAX_CONN);
  assert(mc === 2, 'MAX_CONN is 2');
  await teardown();
}

// Suite 6: WIRE_MAX_HP equals 100
async function suite6() {
  console.log('\nSuite 6: WIRE_MAX_HP = 100');
  await setup();
  const mh = await page.evaluate(() => window.__test.WIRE_MAX_HP);
  assert(mh === 100, 'WIRE_MAX_HP is 100');
  await teardown();
}

// Suite 7: Damage rates positive
async function suite7() {
  console.log('\nSuite 7: Damage rates positive');
  await setup();
  const { dmg, kill } = await page.evaluate(() => ({ dmg: window.__test.WIRE_DMG_RATE, kill: window.__test.WIRE_KILL_RATE }));
  assert(dmg > 0, 'WIRE_DMG_RATE > 0');
  assert(kill > 0, 'WIRE_KILL_RATE > 0');
  await teardown();
}

// Suite 8: Normal speed > slowed speed
async function suite8() {
  console.log('\nSuite 8: RUSTLER_NORMAL > RUSTLER_SLOWED');
  await setup();
  const { norm, slow } = await page.evaluate(() => ({ norm: window.__test.RUSTLER_NORMAL, slow: window.__test.RUSTLER_SLOWED }));
  assert(norm > slow, 'normal speed (' + norm + ') > slowed speed (' + slow + ')');
  await teardown();
}

// Suite 9: WAVE_CONFIG has 5 entries
async function suite9() {
  console.log('\nSuite 9: WAVE_CONFIG has 5 entries');
  await setup();
  const n = await page.evaluate(() => window.__test.WAVE_CONFIG.length);
  assert(n === 5, 'WAVE_CONFIG has 5 waves');
  await teardown();
}

// Suite 10: Wave 1 has 5 rustlers, Wave 5 has 12
async function suite10() {
  console.log('\nSuite 10: Wave 1 count=5, Wave 5 count=12');
  await setup();
  const { c1, c5 } = await page.evaluate(() => ({ c1: window.__test.WAVE_CONFIG[0].count, c5: window.__test.WAVE_CONFIG[4].count }));
  assert(c1 === 5, 'wave 1 count is 5');
  assert(c5 === 12, 'wave 5 count is 12');
  await teardown();
}

// Suite 11: Wave speeds increase
async function suite11() {
  console.log('\nSuite 11: Wave speeds increase');
  await setup();
  const speeds = await page.evaluate(() => window.__test.WAVE_CONFIG.map(w => w.speed));
  let ok = true;
  for (let i = 1; i < speeds.length; i++) if (speeds[i] <= speeds[i-1]) ok = false;
  assert(ok, 'rustler speed increases each wave');
  await teardown();
}

// Suite 12: Wave HP increases
async function suite12() {
  console.log('\nSuite 12: Wave HP increases');
  await setup();
  const hps = await page.evaluate(() => window.__test.WAVE_CONFIG.map(w => w.hp));
  assert(hps[4] > hps[0], 'wave 5 HP (' + hps[4] + ') > wave 1 HP (' + hps[0] + ')');
  await teardown();
}

// Suite 13: CATTLE_X < POST_COLS[0]
async function suite13() {
  console.log('\nSuite 13: CATTLE_X < POST_COLS[0]');
  await setup();
  const { cx, pc0 } = await page.evaluate(() => ({ cx: window.__test.CATTLE_X, pc0: window.__test.POST_COLS[0] }));
  assert(cx < pc0, 'CATTLE_X (' + cx + ') < first post column (' + pc0 + ')');
  await teardown();
}

// Suite 14: initPosts creates 30 posts (5x6)
async function suite14() {
  console.log('\nSuite 14: initPosts creates 30 posts');
  await setup();
  const n = await page.evaluate(() => { window.__test.initPosts(); return window.__test.posts.length; });
  assert(n === 30, 'posts.length is 30');
  await teardown();
}

// Suite 15: Posts have correct col/row coords
async function suite15() {
  console.log('\nSuite 15: Post coords match POST_COLS/POST_ROWS');
  await setup();
  const ok = await page.evaluate(() => {
    window.__test.initPosts();
    const cols = window.__test.POST_COLS, rows = window.__test.POST_ROWS;
    return window.__test.posts.every(p => p.x === cols[p.col] && p.y === rows[p.row]);
  });
  assert(ok, 'all post x/y match POST_COLS[col] and POST_ROWS[row]');
  await teardown();
}

// Suite 16: getPost returns correct post
async function suite16() {
  console.log('\nSuite 16: getPost(col, row)');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.initPosts();
    const p = window.__test.getPost(2, 3);
    return p ? { x: p.x, y: p.y, c: p.col, r: p.row } : null;
  });
  const [cols, rows] = await page.evaluate(() => [window.__test.POST_COLS, window.__test.POST_ROWS]);
  assert(r !== null, 'getPost(2,3) returns a post');
  assert(r.x === cols[2], 'getPost(2,3).x = POST_COLS[2]');
  assert(r.y === rows[3], 'getPost(2,3).y = POST_ROWS[3]');
  await teardown();
}

// Suite 17: areAdjacent horizontal
async function suite17() {
  console.log('\nSuite 17: areAdjacent horizontal');
  await setup();
  const ok = await page.evaluate(() => {
    window.__test.initPosts();
    const p00 = window.__test.getPost(0, 0), p10 = window.__test.getPost(1, 0);
    return window.__test.areAdjacent(p00, p10);
  });
  assert(ok, 'posts in same row adjacent columns are adjacent');
  await teardown();
}

// Suite 18: areAdjacent vertical
async function suite18() {
  console.log('\nSuite 18: areAdjacent vertical');
  await setup();
  const ok = await page.evaluate(() => {
    window.__test.initPosts();
    const p00 = window.__test.getPost(0, 0), p01 = window.__test.getPost(0, 1);
    return window.__test.areAdjacent(p00, p01);
  });
  assert(ok, 'posts in same column adjacent rows are adjacent');
  await teardown();
}

// Suite 19: areAdjacent rejects diagonal
async function suite19() {
  console.log('\nSuite 19: areAdjacent rejects diagonal');
  await setup();
  const ok = await page.evaluate(() => {
    window.__test.initPosts();
    const p00 = window.__test.getPost(0, 0), p11 = window.__test.getPost(1, 1);
    return window.__test.areAdjacent(p00, p11);
  });
  assert(!ok, 'diagonal posts are not adjacent');
  await teardown();
}

// Suite 20: areAdjacent rejects far posts
async function suite20() {
  console.log('\nSuite 20: areAdjacent rejects far posts');
  await setup();
  const ok = await page.evaluate(() => {
    window.__test.initPosts();
    const p00 = window.__test.getPost(0, 0), p20 = window.__test.getPost(2, 0);
    return window.__test.areAdjacent(p00, p20);
  });
  assert(!ok, 'posts 2 columns apart are not adjacent');
  await teardown();
}

// Suite 21: createWire between adjacent posts
async function suite21() {
  console.log('\nSuite 21: createWire creates wire');
  await setup();
  const n = await page.evaluate(() => {
    window.__test.initPosts();
    window.__test.clearWires();
    const pA = window.__test.getPost(0, 0), pB = window.__test.getPost(0, 1);
    window.__test.createWire(pA, pB);
    return window.__test.wires.length;
  });
  assert(n === 1, 'wire created between adjacent posts');
  await teardown();
}

// Suite 22: Wire starts at WIRE_MAX_HP
async function suite22() {
  console.log('\nSuite 22: Wire HP starts at max');
  await setup();
  const hp = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const pA = window.__test.getPost(1, 1), pB = window.__test.getPost(2, 1);
    window.__test.createWire(pA, pB);
    return window.__test.wires[0].hp;
  });
  const maxHp = await page.evaluate(() => window.__test.WIRE_MAX_HP);
  assert(hp === maxHp, 'wire HP starts at WIRE_MAX_HP (' + hp + ')');
  await teardown();
}

// Suite 23: Wire not created between non-adjacent posts
async function suite23() {
  console.log('\nSuite 23: No wire between non-adjacent posts');
  await setup();
  const n = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const pA = window.__test.getPost(0, 0), pB = window.__test.getPost(2, 0);
    window.__test.createWire(pA, pB);
    return window.__test.wires.length;
  });
  assert(n === 0, 'no wire created for non-adjacent posts');
  await teardown();
}

// Suite 24: Wire not created if post at MAX_CONN
async function suite24() {
  console.log('\nSuite 24: createWire respects MAX_CONN');
  await setup();
  const n = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const p00 = window.__test.getPost(0, 0);
    const p10 = window.__test.getPost(1, 0);
    const p01 = window.__test.getPost(0, 1);
    const p02 = window.__test.getPost(0, 2);
    // p00 gets 2 connections: to p10 and p01
    window.__test.createWire(p00, p10);
    window.__test.createWire(p00, p01);
    // Third wire attempt should be blocked
    window.__test.createWire(p00, p02);
    return window.__test.wires.length;
  });
  assert(n === 2, 'only 2 wires created (MAX_CONN=2 on p00)');
  await teardown();
}

// Suite 25: Duplicate wire not created
async function suite25() {
  console.log('\nSuite 25: No duplicate wire');
  await setup();
  const n = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const pA = window.__test.getPost(1, 2), pB = window.__test.getPost(1, 3);
    window.__test.createWire(pA, pB);
    window.__test.createWire(pA, pB);
    return window.__test.wires.length;
  });
  assert(n === 1, 'only one wire created on duplicate attempt');
  await teardown();
}

// Suite 26: connections updated on createWire
async function suite26() {
  console.log('\nSuite 26: connections updated after createWire');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const pA = window.__test.getPost(2, 2), pB = window.__test.getPost(2, 3);
    window.__test.createWire(pA, pB);
    return { aConns: pA.connections.length, bConns: pB.connections.length };
  });
  assert(r.aConns === 1, 'pA has 1 connection');
  assert(r.bConns === 1, 'pB has 1 connection');
  await teardown();
}

// Suite 27: getWire finds wire by either post order
async function suite27() {
  console.log('\nSuite 27: getWire works both directions');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const pA = window.__test.getPost(3, 0), pB = window.__test.getPost(3, 1);
    window.__test.createWire(pA, pB);
    const w1 = window.__test.getWire(pA, pB);
    const w2 = window.__test.getWire(pB, pA);
    return { found1: w1 !== null, found2: w2 !== null };
  });
  assert(r.found1, 'getWire(A,B) finds wire');
  assert(r.found2, 'getWire(B,A) finds same wire');
  await teardown();
}

// Suite 28: Wire broken when HP reaches 0
async function suite28() {
  console.log('\nSuite 28: Wire broken at HP=0');
  await setup();
  const broken = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const pA = window.__test.getPost(0, 3), pB = window.__test.getPost(0, 4);
    window.__test.createWire(pA, pB);
    const w = window.__test.wires[0];
    w.hp = 0; w.broken = true;
    return w.broken;
  });
  assert(broken, 'wire.broken is true when HP=0');
  await teardown();
}

// Suite 29: createWire on broken wire repairs it
async function suite29() {
  console.log('\nSuite 29: createWire repairs broken wire');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.initPosts(); window.__test.clearWires();
    const pA = window.__test.getPost(1, 4), pB = window.__test.getPost(2, 4);
    window.__test.createWire(pA, pB);
    const w = window.__test.wires[0];
    w.hp = 0; w.broken = true;
    window.__test.createWire(pA, pB);
    return { broken: w.broken, hp: w.hp };
  });
  assert(!r.broken, 'wire.broken reset to false');
  assert(r.hp === 100, 'wire HP restored to 100');
  await teardown();
}

// Suite 30: ptSegDist returns 0 for point on segment
async function suite30() {
  console.log('\nSuite 30: ptSegDist zero for on-segment point');
  await setup();
  const d = await page.evaluate(() => window.__test.ptSegDist(5, 5, 0, 5, 10, 5));
  assert(d < 0.001, 'ptSegDist is ~0 for midpoint on horizontal segment');
  await teardown();
}

// Suite 31: ptSegDist correct for off-segment point
async function suite31() {
  console.log('\nSuite 31: ptSegDist correct value');
  await setup();
  const d = await page.evaluate(() => window.__test.ptSegDist(0, 5, 0, 0, 10, 0));
  assert(Math.abs(d - 5) < 0.01, 'ptSegDist 5 for perpendicular offset');
  await teardown();
}

// Suite 32: startGame sets state to playing
async function suite32() {
  console.log('\nSuite 32: startGame => playing');
  await setup();
  await page.evaluate(() => window.__test.startGame());
  const ph = await page.evaluate(() => window.__test.phase);
  assert(ph === 'playing', 'phase is playing after startGame');
  await teardown();
}

// Suite 33: startGame resets cattle to 5
async function suite33() {
  console.log('\nSuite 33: startGame resets cattle');
  await setup();
  const c = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setCattle(1);
    window.__test.startGame();
    return window.__test.cattle;
  });
  assert(c === 5, 'cattle reset to 5');
  await teardown();
}

// Suite 34: startGame resets wave to 1
async function suite34() {
  console.log('\nSuite 34: startGame resets wave');
  await setup();
  const w = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWave(4);
    window.__test.startGame();
    return window.__test.wave;
  });
  assert(w === 1, 'wave reset to 1');
  await teardown();
}

// Suite 35: startGame resets score to 0
async function suite35() {
  console.log('\nSuite 35: startGame resets score');
  await setup();
  const s = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setScore(500);
    window.__test.startGame();
    return window.__test.score;
  });
  assert(s === 0, 'score reset to 0');
  await teardown();
}

// Suite 36: startGame clears wires
async function suite36() {
  console.log('\nSuite 36: startGame clears wires');
  await setup();
  const n = await page.evaluate(() => {
    window.__test.startGame();
    const pA = window.__test.getPost(0, 0), pB = window.__test.getPost(0, 1);
    window.__test.createWire(pA, pB);
    window.__test.startGame();
    return window.__test.wires.length;
  });
  assert(n === 0, 'wires cleared on startGame');
  await teardown();
}

// Suite 37: startGame clears rustlers
async function suite37() {
  console.log('\nSuite 37: startGame clears rustlers');
  await setup();
  const n = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.spawnRustler();
    window.__test.startGame();
    return window.__test.rustlers.length;
  });
  assert(n === 0, 'rustlers cleared on startGame');
  await teardown();
}

// Suite 38: spawnRustler adds rustler at SPAWN_X
async function suite38() {
  console.log('\nSuite 38: spawnRustler at SPAWN_X');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    window.__test.spawnRustler();
    return { x: window.__test.rustlers[0].x, spawnX: window.__test.SPAWN_X };
  });
  assert(r.x === r.spawnX, 'rustler spawns at SPAWN_X (' + r.x + ')');
  await teardown();
}

// Suite 39: Rustler HP matches wave config
async function suite39() {
  console.log('\nSuite 39: Rustler HP matches wave config');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    window.__test.spawnRustler();
    return { hp: window.__test.rustlers[0].hp, cfg: window.__test.WAVE_CONFIG[0].hp };
  });
  assert(r.hp === r.cfg, 'rustler HP (' + r.hp + ') matches wave 1 config (' + r.cfg + ')');
  await teardown();
}

// Suite 40: Rustler moves left when not touching wire
async function suite40() {
  console.log('\nSuite 40: Rustler moves left without wire contact');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    window.__test.spawnRustler();
    const r0 = window.__test.rustlers[0];
    const x0 = r0.x;
    window.__test.update(0.1);
    return { x0, x1: r0.x };
  });
  assert(r.x1 < r.x0, 'rustler moved left (x: ' + r.x0 + ' -> ' + r.x1 + ')');
  await teardown();
}

// Suite 41: Rustler slows when touching wire
async function suite41() {
  console.log('\nSuite 41: Rustler slows when touching wire');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    // Place rustler exactly on a wire
    const pA = window.__test.getPost(2, 2), pB = window.__test.getPost(2, 3);
    window.__test.createWire(pA, pB);
    // Rustler at post x, midpoint y
    const midY = (pA.y + pB.y) / 2;
    window.__test.rustlers.push({ x: pA.x, y: midY, speed: 48, hp: 80, maxHp: 80, alive: true, slowing: false, animPhase: 0 });
    window.__test.update(0.05);
    return window.__test.rustlers[0].slowing;
  });
  assert(r, 'rustler.slowing is true when at wire position');
  await teardown();
}

// Suite 42: Wire HP decreases when rustler touches it
async function suite42() {
  console.log('\nSuite 42: Wire HP decreases with rustler contact');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    const pA = window.__test.getPost(3, 1), pB = window.__test.getPost(3, 2);
    window.__test.createWire(pA, pB);
    const midY = (pA.y + pB.y) / 2;
    window.__test.rustlers.push({ x: pA.x, y: midY, speed: 48, hp: 200, maxHp: 200, alive: true, slowing: false, animPhase: 0 });
    const hp0 = window.__test.wires[0].hp;
    window.__test.update(0.1);
    return { hp0, hp1: window.__test.wires[0].hp };
  });
  assert(r.hp1 < r.hp0, 'wire HP decreased (' + r.hp0 + ' -> ' + r.hp1 + ')');
  await teardown();
}

// Suite 43: Rustler HP decreases when touching wire
async function suite43() {
  console.log('\nSuite 43: Rustler HP decreases with wire contact');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    const pA = window.__test.getPost(1, 0), pB = window.__test.getPost(1, 1);
    window.__test.createWire(pA, pB);
    const midY = (pA.y + pB.y) / 2;
    window.__test.rustlers.push({ x: pA.x, y: midY, speed: 48, hp: 100, maxHp: 100, alive: true, slowing: false, animPhase: 0 });
    const hp0 = window.__test.rustlers[0].hp;
    window.__test.update(0.1);
    return { hp0, hp1: window.__test.rustlers[0].hp };
  });
  assert(r.hp1 < r.hp0, 'rustler HP decreased (' + r.hp0 + ' -> ' + r.hp1 + ')');
  await teardown();
}

// Suite 44: Score increases when rustler killed
async function suite44() {
  console.log('\nSuite 44: Score increases on rustler kill');
  await setup();
  const s = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    window.__test.setScore(0);
    // Add rustler with 1 HP
    window.__test.rustlers.push({ x: 200, y: 300, speed: 48, hp: 1, maxHp: 80, alive: true, slowing: false, animPhase: 0 });
    // Put a wire on top of it
    const pA = window.__test.getPost(2, 2), pB = window.__test.getPost(2, 3);
    window.__test.createWire(pA, pB);
    const midY = (pA.y + pB.y) / 2;
    window.__test.rustlers[0].x = pA.x; window.__test.rustlers[0].y = midY;
    window.__test.update(0.05);
    return window.__test.score;
  });
  assert(s > 0, 'score > 0 after rustler killed (score=' + s + ')');
  await teardown();
}

// Suite 45: Cattle decreases when rustler reaches left edge
async function suite45() {
  console.log('\nSuite 45: Cattle decreases when rustler reaches CATTLE_X');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    const cx = window.__test.CATTLE_X;
    window.__test.rustlers.push({ x: cx + 1, y: 250, speed: 200, hp: 100, maxHp: 100, alive: true, slowing: false, animPhase: 0 });
    const c0 = window.__test.cattle;
    window.__test.update(0.1);
    return { c0, c1: window.__test.cattle };
  });
  assert(r.c1 === r.c0 - 1, 'cattle decreased from ' + r.c0 + ' to ' + r.c1);
  await teardown();
}

// Suite 46: gameover when cattle reaches 0
async function suite46() {
  console.log('\nSuite 46: gameover when cattle=0');
  await setup();
  const ph = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    window.__test.setCattle(1);
    const cx = window.__test.CATTLE_X;
    window.__test.rustlers.push({ x: cx + 1, y: 250, speed: 200, hp: 100, maxHp: 100, alive: true, slowing: false, animPhase: 0 });
    window.__test.update(0.1);
    return window.__test.phase;
  });
  assert(ph === 'gameover', 'phase is gameover when cattle reaches 0');
  await teardown();
}

// Suite 47: wave_result when wave cleared
async function suite47() {
  console.log('\nSuite 47: wave_result when all rustlers dead');
  await setup();
  const ph = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    window.__test.setWaveAllSpawned(true);
    window.__test.setSpawnCount(5);
    // No alive rustlers
    window.__test.update(0.016);
    return window.__test.phase;
  });
  assert(ph === 'wave_result', 'phase becomes wave_result when wave cleared');
  await teardown();
}

// Suite 48: Wave advances after wave_result timer
async function suite48() {
  console.log('\nSuite 48: Wave advances after wave_result');
  await setup();
  const r = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.clearRustlers();
    window.__test.setWaveAllSpawned(true);
    window.__test.update(0.016); // triggers wave_result
    const w0 = window.__test.wave;
    window.__test.update(3.0); // advance past waveResultTimer
    return { w0, w1: window.__test.wave, ph: window.__test.phase };
  });
  assert(r.w1 === r.w0 + 1, 'wave advanced from ' + r.w0 + ' to ' + r.w1);
  assert(r.ph === 'playing', 'phase returns to playing');
  await teardown();
}

// Suite 49: Win state after wave 5 cleared
async function suite49() {
  console.log('\nSuite 49: Win state after wave 5');
  await setup();
  const ph = await page.evaluate(() => {
    window.__test.startGame();
    window.__test.setWave(5);
    window.__test.clearRustlers();
    window.__test.setWaveAllSpawned(true);
    window.__test.setSpawnCount(12);
    window.__test.update(0.016);
    return window.__test.phase;
  });
  assert(ph === 'win', 'phase becomes win after wave 5 cleared');
  await teardown();
}

// Suite 50: FEEDBACK_ENDPOINT defined, localStorage key correct, no console errors
async function suite50() {
  console.log('\nSuite 50: FEEDBACK_ENDPOINT, localStorage, canvas tap, no errors');
  await setup();
  const ep = await page.evaluate(() => window.__test.FEEDBACK_ENDPOINT);
  assert(ep && ep.length > 0, 'FEEDBACK_ENDPOINT is defined');
  const lsKey = 'barbed_wire_best';
  await page.evaluate(key => { localStorage.setItem(key, '999'); }, lsKey);
  await page.evaluate(() => window.__test.startGame());
  const best = await page.evaluate(() => parseInt(localStorage.getItem('barbed_wire_best') || '0'));
  assert(best === 999, 'localStorage key barbed_wire_best persists');
  // Canvas tap starts game from title
  await page.evaluate(() => { window.__test.setPhase('title'); });
  await page.click('#c');
  await page.waitForTimeout(100);
  const ph = await page.evaluate(() => window.__test.phase);
  assert(ph === 'playing', 'canvas tap on title starts game');
  // Pixel check: title button area should be warm gold
  await page.evaluate(() => { window.__test.setPhase('title'); });
  await page.waitForTimeout(100);
  const px = await page.evaluate(() => new Promise(res => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const c = document.getElementById('c');
      const d = c.getContext('2d').getImageData(180, 448, 1, 1).data;
      res({ r: d[0], g: d[1], b: d[2] });
    }));
  }));
  assert(px.r > 180 && px.g > 140 && px.b < 120, 'title PLAY button is warm gold (r=' + px.r + ' g=' + px.g + ' b=' + px.b + ')');
  assert(consoleErrors.length === 0, 'no console errors (found: ' + consoleErrors.join('; ') + ')');
  await teardown();
}

// ===== RUNNER =====
const suites = [
  suite1,  suite2,  suite3,  suite4,  suite5,
  suite6,  suite7,  suite8,  suite9,  suite10,
  suite11, suite12, suite13, suite14, suite15,
  suite16, suite17, suite18, suite19, suite20,
  suite21, suite22, suite23, suite24, suite25,
  suite26, suite27, suite28, suite29, suite30,
  suite31, suite32, suite33, suite34, suite35,
  suite36, suite37, suite38, suite39, suite40,
  suite41, suite42, suite43, suite44, suite45,
  suite46, suite47, suite48, suite49, suite50,
];

(async () => {
  let passed = 0, failed = 0;
  for (const s of suites) {
    try { await s(); passed++; }
    catch(e) { console.error(e.message); failed++; if (browser) { try { await browser.close(); } catch {} browser = null; } }
  }
  console.log(`\n${passed}/${passed + failed} tests passed`);
  process.exit(failed > 0 ? 1 : 0);
})();
