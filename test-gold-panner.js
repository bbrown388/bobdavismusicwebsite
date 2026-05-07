// Playwright tests for Gold Panner (Game 41)
const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'gold-panner.html').replace(/\\/g, '/');
const W = 360, H = 640;

let browser, page;

async function setup() {
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.warn('[PAGE ERROR]', m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(200);
}

async function teardown() {
  try { await browser.close(); } catch(e) {}
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

async function tapCenter() {
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(120);
}

// ── Suite 1: Constants ─────────────────────────────────────
async function suite1() {
  console.log('\nSuite 1: Constants and initial state');
  await setup();

  const state = await page.evaluate(() => state);
  assert(state === 'title', 'initial state is title');

  const consts = await page.evaluate(() => ({
    W, H, PAN_CX, PAN_CY, PAN_R, MAX_TILT, WIN_THRESHOLD,
    T_GOLD, T_GRAVEL, T_FOOLS, T_MUD,
  }));
  assert(consts.W === 360, 'canvas width 360');
  assert(consts.H === 640, 'canvas height 640');
  assert(consts.PAN_CX === 180, 'PAN_CX is 180');
  assert(consts.PAN_CY === 390, 'PAN_CY is 390');
  assert(consts.PAN_R === 130, 'PAN_R is 130');
  assert(consts.MAX_TILT > 0 && consts.MAX_TILT <= Math.PI / 2, 'MAX_TILT in valid range');
  assert(consts.WIN_THRESHOLD >= 8, 'WIN_THRESHOLD reasonable (>= 8)');
  assert(consts.T_GOLD === 0, 'T_GOLD is 0');
  assert(consts.T_GRAVEL === 1, 'T_GRAVEL is 1');
  assert(consts.T_FOOLS === 2, 'T_FOOLS is 2');
  assert(consts.T_MUD === 3, 'T_MUD is 3');

  await teardown();
}

// ── Suite 2: Rounds config ─────────────────────────────────
async function suite2() {
  console.log('\nSuite 2: Rounds configuration');
  await setup();

  const rounds = await page.evaluate(() => ROUNDS_CONF);
  assert(rounds.length === 3, 'exactly 3 rounds');
  assert(rounds[0].time >= 30, 'round 1 time >= 30s');
  assert(rounds[1].time >= 25, 'round 2 time >= 25s');
  assert(rounds[2].time >= 20, 'round 3 time >= 20s');

  // No fool's gold in round 1
  assert(rounds[0].counts[2] === 0, 'round 1 has no fool\'s gold');
  // Rounds 2 and 3 have fool's gold
  assert(rounds[1].counts[2] > 0, 'round 2 has fool\'s gold');
  assert(rounds[2].counts[2] > 0, 'round 3 has fool\'s gold');

  // Total gold
  const totalGold = rounds.reduce((s, r) => s + r.counts[0], 0);
  assert(totalGold >= 15 && totalGold <= 22, 'total gold particles between 15 and 22');

  // Gold mass > gravel mass > mud mass
  const masses = await page.evaluate(() => PCONF.map(c => c.mass));
  assert(masses[0] > masses[1], 'gold heavier than gravel');
  assert(masses[0] > masses[2], 'gold heavier than fool\'s gold');
  assert(masses[1] > masses[3], 'gravel heavier than mud');

  await teardown();
}

// ── Suite 3: Title screen renders ─────────────────────────
async function suite3() {
  console.log('\nSuite 3: Title screen renders');
  await setup();

  // Should have rendered pixels
  const hasPx = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(0, 0, 360, 150).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 5 || d[i+1] > 5 || d[i+2] > 5) return true;
    }
    return false;
  });
  assert(hasPx, 'title screen has rendered content');

  // Title area (y~112) should have gold-ish pixels
  const hasGold = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(100, 95, 160, 30).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 150 && d[i+1] > 150 && d[i+2] < 60) return true;
    }
    return false;
  });
  assert(hasGold, 'title area has gold-colored text pixels');

  await teardown();
}

// ── Suite 4: Tap starts game ───────────────────────────────
async function suite4() {
  console.log('\nSuite 4: Tap starts game');
  await setup();
  await tapCenter();

  const s = await page.evaluate(() => state);
  assert(s === 'playing', 'tap title -> state is playing');

  const r = await page.evaluate(() => round);
  assert(r === 0, 'round is 0 on start');

  const tl = await page.evaluate(() => timeLeft);
  assert(tl > 30 && tl <= 45, 'timeLeft initialized to round 1 duration');

  const pLen = await page.evaluate(() => particles.length);
  assert(pLen > 0, 'particles spawned on game start');

  const expectedCount = await page.evaluate(() =>
    ROUNDS_CONF[0].counts.reduce((s, c) => s + c, 0)
  );
  assert(pLen === expectedCount, 'particle count matches round 1 config');

  await teardown();
}

// ── Suite 5: Particle initial positions ───────────────────
async function suite5() {
  console.log('\nSuite 5: Particle initial positions and properties');
  await setup();
  await tapCenter();

  const result = await page.evaluate(() => {
    const goldCount   = particles.filter(p => p.type === T_GOLD).length;
    const gravelCount = particles.filter(p => p.type === T_GRAVEL).length;
    const allInPan    = particles.every(p => {
      const dx = p.x - PAN_CX, dy = p.y - PAN_CY;
      return Math.sqrt(dx*dx + dy*dy) < PAN_R;
    });
    const allHaveVelocity = particles.every(p =>
      typeof p.vx === 'number' && typeof p.vy === 'number'
    );
    const allHaveMass = particles.every(p => p.mass > 0);
    const notSpilled  = particles.every(p => p.spilled === false);
    return { goldCount, gravelCount, allInPan, allHaveVelocity, allHaveMass, notSpilled };
  });

  assert(result.goldCount === 5, 'round 1 has 5 gold particles');
  assert(result.gravelCount === 16, 'round 1 has 16 gravel particles');
  assert(result.allInPan, 'all particles start inside pan boundary');
  assert(result.allHaveVelocity, 'all particles have vx/vy');
  assert(result.allHaveMass, 'all particles have positive mass');
  assert(result.notSpilled, 'no particles spilled at start');

  await teardown();
}

// ── Suite 6: Tilt input ────────────────────────────────────
async function suite6() {
  console.log('\nSuite 6: Tilt input via pointer drag');
  await setup();
  await tapCenter();

  // Record tilt before drag
  const tilt0 = await page.evaluate(() => targetTilt);

  // Drag right 120px -> should set positive tilt
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.down();
  await page.mouse.move(W / 2 + 120, H / 2);
  await page.waitForTimeout(100);

  const tiltR = await page.evaluate(() => targetTilt);
  assert(tiltR > 0, 'drag right -> positive targetTilt');

  // Drag left past center -> negative tilt
  await page.mouse.move(W / 2 - 60, H / 2);
  await page.waitForTimeout(60);
  const tiltL = await page.evaluate(() => targetTilt);
  assert(tiltL < tiltR, 'drag left -> lower targetTilt');
  await page.mouse.up();

  // Tilt clamp
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.down();
  await page.mouse.move(W / 2 + 600, H / 2); // extreme drag
  await page.waitForTimeout(60);
  const tiltMax = await page.evaluate(() => targetTilt);
  const maxTilt = await page.evaluate(() => MAX_TILT);
  assert(Math.abs(tiltMax) <= maxTilt + 0.001, 'tilt clamped to MAX_TILT');
  await page.mouse.up();

  await teardown();
}

// ── Suite 7: Particle physics - mass-based acceleration ───
async function suite7() {
  console.log('\nSuite 7: Particle physics - lighter particles accelerate more');
  await setup();
  await tapCenter();

  // Set a strong rightward tilt and advance physics manually
  const result = await page.evaluate(() => {
    // Place one gold particle and one gravel particle at the same position
    const goldP   = { x:PAN_CX, y:PAN_CY, vx:0, vy:0, type:T_GOLD,   mass:4.0, r:4,   fill:'#FFD700', rim:'#FF8800', spilled:false };
    const gravelP = { x:PAN_CX, y:PAN_CY, vx:0, vy:0, type:T_GRAVEL, mass:1.6, r:5.5, fill:'#8B7355', rim:'#5B4325', spilled:false };
    particles = [goldP, gravelP];

    // Apply tilt and run 30 physics frames
    targetTilt = 0.5;
    tilt       = 0.5;
    for (let i = 0; i < 30; i++) updateParticles();

    return {
      goldX:   goldP.x,
      gravelX: gravelP.x,
      goldVX:  goldP.vx,
      gravelVX:gravelP.vx,
    };
  });

  // With positive tilt, both should move right, but gravel more than gold
  assert(result.gravelX > result.goldX, 'gravel moves right more than gold under same tilt');
  assert(result.gravelVX > result.goldVX, 'gravel has higher rightward velocity than gold');

  await teardown();
}

// ── Suite 8: Spill mechanic ────────────────────────────────
async function suite8() {
  console.log('\nSuite 8: Spill mechanic - particle exits on downhill side');
  await setup();
  await tapCenter();

  // Place a gravel particle just inside the pan boundary on the right, apply rightward tilt
  const result = await page.evaluate(() => {
    const boundary = PAN_R - 13; // PAN_RIM = 13
    const gravelP = {
      x: PAN_CX + boundary - 4, y: PAN_CY,
      vx: 2, vy: 0,
      type: T_GRAVEL, mass: 1.6, r: 5.5,
      fill: '#8B7355', rim: '#5B4325', spilled: false,
    };
    particles = [gravelP];
    tilt       = 0.5;
    targetTilt = 0.5;
    for (let i = 0; i < 20; i++) updateParticles();
    return { spilled: gravelP.spilled };
  });

  assert(result.spilled, 'gravel particle spills off downhill edge');

  // Gold particle in same position should NOT spill at mild tilt (heavy = resists)
  const goldResult = await page.evaluate(() => {
    const boundary = PAN_R - 13;
    const goldP = {
      x: PAN_CX - boundary + 4, y: PAN_CY,
      vx: -3, vy: 0,
      type: T_GOLD, mass: 4.0, r: 4.0,
      fill: '#FFD700', rim: '#FF8800', spilled: false,
    };
    particles = [goldP];
    // Uphill side: tilt right, gold is on left -> no spill
    tilt       = 0.5;
    targetTilt = 0.5;
    for (let i = 0; i < 30; i++) updateParticles();
    return { spilled: goldP.spilled };
  });
  assert(!goldResult.spilled, 'gold on uphill side is reflected, not spilled');

  await teardown();
}

// ── Suite 9: Timer countdown ───────────────────────────────
async function suite9() {
  console.log('\nSuite 9: Timer counts down during play');
  await setup();
  await tapCenter();

  const t0 = await page.evaluate(() => timeLeft);
  await page.waitForTimeout(600);
  const t1 = await page.evaluate(() => timeLeft);
  assert(t1 < t0, 'timeLeft decreases over time');
  assert(t0 - t1 < 2, 'timeLeft decreases at real-time rate (< 2s drop per 0.6s)');

  await teardown();
}

// ── Suite 10: Round end transitions ───────────────────────
async function suite10() {
  console.log('\nSuite 10: Round end - transition to between state');
  await setup();
  await tapCenter();

  // Force end of round
  await page.evaluate(() => { timeLeft = 0.01; });
  await page.waitForTimeout(200);

  const s = await page.evaluate(() => state);
  assert(s === 'between', 'state transitions to between after round 1 ends');

  const rr = await page.evaluate(() => roundResult);
  assert(rr !== null, 'roundResult set after round end');
  assert(typeof rr.kept === 'number', 'roundResult.kept is a number');
  assert(typeof rr.available === 'number', 'roundResult.available is a number');

  // Tap to continue
  await tapCenter();
  const s2 = await page.evaluate(() => state);
  assert(s2 === 'playing', 'tap between -> back to playing');
  const r2 = await page.evaluate(() => round);
  assert(r2 === 1, 'round incremented to 1 after tap');

  await teardown();
}

// ── Suite 11: Claim jumper ─────────────────────────────────
async function suite11() {
  console.log('\nSuite 11: Claim jumper system');
  await setup();
  await tapCenter();

  // Jump to round 1 (index 1) to enable jumpers
  await page.evaluate(() => {
    round = 1;
    timeLeft = ROUNDS_CONF[1].time;
    spawnParticles(1);
    jumperNextAt = timeLeft - 0.5; // trigger very soon
  });
  await page.waitForTimeout(200);

  // Manually trigger timeLeft to cross threshold
  await page.evaluate(() => { timeLeft = jumperNextAt - 0.1; });
  await page.waitForTimeout(200);

  const active = await page.evaluate(() => jumper.active);
  assert(active, 'claim jumper becomes active');

  const jData = await page.evaluate(() => ({ x: jumper.x, y: jumper.y, side: jumper.side }));
  assert(Math.abs(jData.x - 180) > 100, 'jumper x is near pan edge');
  assert(jData.side === 1 || jData.side === -1, 'jumper side is valid');

  await teardown();
}

// ── Suite 12: Claim jumper scare ───────────────────────────
async function suite12() {
  console.log('\nSuite 12: Tap claim jumper to scare it');
  await setup();
  await tapCenter();

  // Set up jumper manually
  await page.evaluate(() => {
    jumper = { active: true, x: 50, y: 390, side: -1, timer: 0.5, scared: false };
  });

  const activeBefore = await page.evaluate(() => jumper.active);
  assert(activeBefore, 'jumper is active before tap');

  // Tap on jumper
  await page.mouse.click(50, 390);
  await page.waitForTimeout(100);

  const activeAfter = await page.evaluate(() => jumper.active);
  assert(!activeAfter, 'jumper deactivated after tap');

  await teardown();
}

// ── Suite 13: Jumper steals gold if ignored ────────────────
async function suite13() {
  console.log('\nSuite 13: Jumper steals gold if not tapped');
  await setup();
  await tapCenter();

  const goldBefore = await page.evaluate(() =>
    particles.filter(p => !p.spilled && p.type === T_GOLD).length
  );

  // Spawn jumper with nearly-expired timer
  await page.evaluate(() => {
    jumper = { active: true, x: 310, y: 390, side: 1, timer: JUMPER_STEAL_TIME - 0.05, scared: false };
  });
  await page.waitForTimeout(300);

  const goldAfter = await page.evaluate(() =>
    particles.filter(p => !p.spilled && p.type === T_GOLD).length
  );
  const isActive = await page.evaluate(() => jumper.active);
  assert(!isActive, 'jumper deactivated after steal timer expires');
  assert(goldAfter < goldBefore || goldBefore === 0, 'gold count reduced by steal (or was 0)');

  await teardown();
}

// ── Suite 14: Score calculation ────────────────────────────
async function suite14() {
  console.log('\nSuite 14: Score calculation');
  await setup();
  await tapCenter();

  // Place exactly 3 gold surviving, 10 gravel washed
  const result = await page.evaluate(() => {
    particles = [];
    // 3 surviving gold particles
    for (let i = 0; i < 3; i++) {
      particles.push({ x:PAN_CX, y:PAN_CY + i*10, vx:0, vy:0,
        type:T_GOLD, mass:4, r:4, fill:'#FFD700', rim:'#FF8800', spilled:false });
    }
    // 10 washed gravel
    for (let i = 0; i < 10; i++) {
      particles.push({ x:0, y:0, vx:0, vy:0,
        type:T_GRAVEL, mass:1.6, r:5, fill:'#8B7355', rim:'#5B4325', spilled:true });
    }
    score = 0;
    totalGoldKept = 0;
    totalGoldAvail = ROUNDS_CONF[0].counts[T_GOLD];
    round = 0;
    timeLeft = 0.01;
    return null;
  });

  await page.waitForTimeout(200);

  const finalScore = await page.evaluate(() => score);
  // 3 gold * 15 pts + 10 gravel * 1.5 pts = 45 + 15 = 60
  assert(finalScore === 60, 'score = 3*15 + 10*1.5 = 60');

  const goldKept = await page.evaluate(() => totalGoldKept);
  assert(goldKept === 3, 'totalGoldKept = 3 after round');

  await teardown();
}

// ── Suite 15: Full 3-round win path ───────────────────────
async function suite15() {
  console.log('\nSuite 15: Three-round win path');
  await setup();
  await tapCenter();

  // Round 1: keep all gold, end round
  await page.evaluate(() => {
    particles.forEach(p => { if (p.type !== T_GOLD) p.spilled = true; });
    timeLeft = 0.01;
  });
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => state) === 'between', 'after round 1 -> between');
  await tapCenter();

  // Round 2: keep all gold, end round
  await page.evaluate(() => {
    particles.forEach(p => { if (p.type !== T_GOLD) p.spilled = true; });
    timeLeft = 0.01;
  });
  await page.waitForTimeout(200);
  assert(await page.evaluate(() => state) === 'between', 'after round 2 -> between');
  await tapCenter();

  // Round 3: keep all gold, end round
  await page.evaluate(() => {
    particles.forEach(p => { if (p.type !== T_GOLD) p.spilled = true; });
    timeLeft = 0.01;
  });
  await page.waitForTimeout(200);

  const finalState = await page.evaluate(() => state);
  assert(finalState === 'win', 'keeping all gold -> win state');

  const totalKept = await page.evaluate(() => totalGoldKept);
  assert(totalKept >= 10, 'totalGoldKept >= WIN_THRESHOLD after keeping all gold');

  await teardown();
}

// ── Suite 16: Gameover path ────────────────────────────────
async function suite16() {
  console.log('\nSuite 16: Gameover when not enough gold');
  await setup();
  await tapCenter();

  // Spill all gold every round
  async function spillAllGold() {
    await page.evaluate(() => {
      particles.forEach(p => { p.spilled = true; });
      timeLeft = 0.01;
    });
    await page.waitForTimeout(200);
  }

  await spillAllGold();
  assert(await page.evaluate(() => state) === 'between', 'round 1 -> between');
  await tapCenter();

  await spillAllGold();
  assert(await page.evaluate(() => state) === 'between', 'round 2 -> between');
  await tapCenter();

  await spillAllGold();
  await page.waitForTimeout(200);

  const finalState = await page.evaluate(() => state);
  assert(finalState === 'gameover', 'spilling all gold -> gameover');

  const kept = await page.evaluate(() => totalGoldKept);
  assert(kept < await page.evaluate(() => WIN_THRESHOLD), 'totalGoldKept < WIN_THRESHOLD');

  await teardown();
}

// ── Suite 17: localStorage best score ─────────────────────
async function suite17() {
  console.log('\nSuite 17: localStorage best score');
  await setup();
  await tapCenter();

  // Full run keeping all gold
  for (let r = 0; r < 3; r++) {
    await page.evaluate(() => {
      particles.forEach(p => { if (p.type !== T_GOLD) p.spilled = true; });
      timeLeft = 0.01;
    });
    await page.waitForTimeout(200);
    if (r < 2) await tapCenter();
  }

  await page.waitForTimeout(200);
  const s = await page.evaluate(() => state);
  assert(s === 'win', 'reached win state');

  const stored = await page.evaluate(() => localStorage.getItem('gold_panner_best'));
  assert(stored !== null, 'localStorage has gold_panner_best');
  assert(parseInt(stored, 10) > 0, 'stored best score > 0');

  await teardown();
}

// ── Suite 18: Reset game ───────────────────────────────────
async function suite18() {
  console.log('\nSuite 18: Reset game from win screen');
  await setup();
  await tapCenter();

  // Fast win
  for (let r = 0; r < 3; r++) {
    await page.evaluate(() => {
      particles.forEach(p => { if (p.type !== T_GOLD) p.spilled = true; });
      timeLeft = 0.01;
    });
    await page.waitForTimeout(200);
    if (r < 2) await tapCenter();
  }
  await page.waitForTimeout(200);

  assert(await page.evaluate(() => state) === 'win', 'in win state before reset');

  // Tap in middle of screen (not share, not feedback zone)
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(120);

  const s = await page.evaluate(() => state);
  assert(s === 'title', 'tap win screen -> back to title');
  assert(await page.evaluate(() => tilt) === 0, 'tilt reset to 0');
  assert(await page.evaluate(() => particles.length) === 0, 'particles cleared');

  await teardown();
}

// ── Suite 19: HUD pixel check ──────────────────────────────
async function suite19() {
  console.log('\nSuite 19: HUD has non-black pixels during play');
  await setup();
  await tapCenter();
  await page.waitForTimeout(300);

  // HUD area top-left (round pill around x=8..84, y=8..34)
  const hasHUD = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(8, 8, 76, 26).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 20 || d[i+1] > 20 || d[i+2] > 20) return true;
    }
    return false;
  });
  assert(hasHUD, 'round pill area has non-black pixels');

  // Tilt gauge (bottom center)
  const hasGauge = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(100, 620, 160, 14).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 15 || d[i+1] > 15 || d[i+2] > 15) return true;
    }
    return false;
  });
  assert(hasGauge, 'tilt gauge area has non-black pixels');

  await teardown();
}

// ── Suite 20: Pan renders ──────────────────────────────────
async function suite20() {
  console.log('\nSuite 20: Pan renders with non-dark pixels');
  await setup();
  await tapCenter();
  await page.waitForTimeout(300);

  // Pan area center should have greenish/brown water pixels (non-black)
  const hasPan = await page.evaluate(() => {
    const d = document.getElementById('c').getContext('2d').getImageData(120, 340, 120, 100).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 5 || d[i+1] > 5 || d[i+2] > 5) return true;
    }
    return false;
  });
  assert(hasPan, 'pan area has rendered water pixels');

  await teardown();
}

// ── Suite 21: Console error sweep ─────────────────────────
async function suite21() {
  console.log('\nSuite 21: Console error sweep');
  const errors = [];
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx2.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(FILE);
  await page.waitForTimeout(300);

  // Start and play
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(300);

  // Tilt right and left
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.down();
  await page.mouse.move(W / 2 + 100, H / 2);
  await page.waitForTimeout(200);
  await page.mouse.move(W / 2 - 80, H / 2);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Fast-complete round 1
  await page.evaluate(() => {
    particles.forEach(p => { if (p.type !== T_GOLD) p.spilled = true; });
    timeLeft = 0.01;
  });
  await page.waitForTimeout(200);
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(200);

  assert(errors.length === 0, 'zero console errors (got: ' + errors.join(', ') + ')');
  await browser.close();
}

// ── Suite 22: Particle collision separation ────────────────
async function suite22() {
  console.log('\nSuite 22: Particle-particle collision separation');
  await setup();
  await tapCenter();

  const result = await page.evaluate(() => {
    // Place 5 particles all at the same spot
    particles = [];
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: PAN_CX, y: PAN_CY, vx: 0, vy: 0,
        type: T_GRAVEL, mass: 1.6, r: 5.5, fill: '#8B7355', rim: '#5B4325', spilled: false
      });
    }
    tilt = 0; targetTilt = 0;
    for (let i = 0; i < 60; i++) updateParticles();

    // Check they separated
    let anyOverlap = false;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minD = particles[i].r + particles[j].r;
        if (dist < minD * 0.8) anyOverlap = true;
      }
    }
    return { anyOverlap };
  });

  assert(!result.anyOverlap, 'particles separated after collision resolution (no major overlap)');

  await teardown();
}

// ── Runner ────────────────────────────────────────────────
(async () => {
  const suites = [
    suite1, suite2, suite3, suite4, suite5, suite6,
    suite7, suite8, suite9, suite10, suite11, suite12,
    suite13, suite14, suite15, suite16, suite17, suite18,
    suite19, suite20, suite21, suite22,
  ];
  let passed = 0, failed = 0;

  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch(e) {
      console.error(e.message);
      failed++;
      try { await teardown(); } catch(e2) {}
    }
  }

  console.log('\n' + '-'.repeat(42));
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
})();
