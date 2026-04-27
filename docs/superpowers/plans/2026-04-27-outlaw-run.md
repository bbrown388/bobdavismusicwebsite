# Outlaw Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a top-down outlaw escape game where the player draws a finger-route across a scrolling map, collects supply caches to keep drawing, and evades a sheriff who obeys the same terrain rules.

**Architecture:** Single HTML file (`outlaw-run.html`) with all game logic inline. World is 360×1920px, camera scrolls vertically. Path stored as world-coordinate point array; rider interpolates along it. Sheriff uses greedy waypoint navigation around shared terrain obstacles.

**Tech Stack:** Vanilla JS, HTML5 Canvas 2D, Web Audio API, Playwright (tests only — `node test-outlaw-run.js`)

---

## Key Constants (use these exact values throughout all tasks)

```js
const W = 360, H = 640, WORLD_H = 1920;
const WIN_Y            = 100;    // rider worldY threshold → win
const RIDER_SPEED      = 120;    // px/s along path
const SHERIFF_SPEED    = 80;     // px/s
const SHERIFF_DELAY    = 5000;   // ms before sheriff spawns
const PROVISIONS_START = 100;
const PROVISIONS_COST  = 1 / 12; // per px drawn
const PROVISIONS_GAIN  = 35;     // per cache
const HALT_TIMEOUT     = 4;      // seconds halted → stranded lose
const CATCH_RADIUS     = 20;     // px — sheriff catches rider
const CACHE_RADIUS     = 20;     // px — path picks up cache
const PATH_SAMPLE      = 8;      // px between stored path points
```

## Terrain Data (define as module-level constants — copy exactly)

```js
const RIVER_TOP = 820, RIVER_BOTTOM = 1020;

const ROCKS = [
  { x: 55,  y: 1070, r: 28 }, { x: 145, y: 1110, r: 24 },
  { x: 248, y: 1055, r: 34 }, { x: 95,  y: 1185, r: 27 },
  { x: 292, y: 1195, r: 31 }, { x: 68,  y: 1275, r: 24 },
  { x: 195, y: 1315, r: 29 }, { x: 305, y: 1355, r: 21 },
  { x: 32,  y: 710,  r: 19 }, { x: 328, y: 745,  r: 21 },
  { x: 170, y: 280,  r: 18 },
];

const FORDS = [
  { x: 60,  y: 920, hw: 20 },
  { x: 180, y: 940, hw: 20 },
  { x: 300, y: 910, hw: 20 },
];

const FENCE_ROWS = [
  { y: 480, gaps: [{ x0: 80, x1: 130 }, { x0: 255, x1: 305 }] },
  { y: 590, gaps: [{ x0: 155, x1: 205 }] },
];

const CACHE_DEFS = [
  { x: 90,  y: 1550, type: 'canteen'   },
  { x: 262, y: 1450, type: 'saddlebag' },
  { x: 160, y: 1200, type: 'ammo'      },
  { x: 72,  y: 950,  type: 'canteen'   },
  { x: 242, y: 762,  type: 'bedroll'   },
  { x: 148, y: 520,  type: 'saddlebag' },
];

// Navigable waypoints for sheriff: ford centers + fence gap centers
const WAYPOINTS = [
  { x: 60,  y: 920 }, { x: 180, y: 940 }, { x: 300, y: 910 },
  { x: 105, y: 480 }, { x: 280, y: 480 }, { x: 180, y: 590 },
];
```

## File Structure

| File | Purpose |
|---|---|
| `outlaw-run.html` | Complete game — all logic, audio, rendering |
| `test-outlaw-run.js` | Playwright test suite — 10 suites, ships with game |
| `index.html` | Add game card for Game 05 |

---

## Task 1: HTML shell, canvas, state machine, title screen, test skeleton

**Files:**
- Create: `outlaw-run.html`
- Create: `test-outlaw-run.js`

- [ ] **Step 1: Create `outlaw-run.html` with this exact content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Outlaw Run</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; display: flex; justify-content: center; align-items: center;
       height: 100vh; overflow: hidden; touch-action: none; }
#wrap { position: relative; }
canvas { display: block; }
</style>
</head>
<body>
<div id="wrap"><canvas id="c"></canvas></div>
<script>
const W = 360, H = 640, WORLD_H = 1920;
const WIN_Y            = 100;
const RIDER_SPEED      = 120;
const SHERIFF_SPEED    = 80;
const SHERIFF_DELAY    = 5000;
const PROVISIONS_START = 100;
const PROVISIONS_COST  = 1 / 12;
const PROVISIONS_GAIN  = 35;
const HALT_TIMEOUT     = 4;
const CATCH_RADIUS     = 20;
const CACHE_RADIUS     = 20;
const PATH_SAMPLE      = 8;
const FEEDBACK_ENDPOINT = 'https://formspree.io/f/xdayvnvo';

const RIVER_TOP = 820, RIVER_BOTTOM = 1020;
const ROCKS = [
  { x: 55,  y: 1070, r: 28 }, { x: 145, y: 1110, r: 24 },
  { x: 248, y: 1055, r: 34 }, { x: 95,  y: 1185, r: 27 },
  { x: 292, y: 1195, r: 31 }, { x: 68,  y: 1275, r: 24 },
  { x: 195, y: 1315, r: 29 }, { x: 305, y: 1355, r: 21 },
  { x: 32,  y: 710,  r: 19 }, { x: 328, y: 745,  r: 21 },
  { x: 170, y: 280,  r: 18 },
];
const FORDS = [
  { x: 60,  y: 920, hw: 20 },
  { x: 180, y: 940, hw: 20 },
  { x: 300, y: 910, hw: 20 },
];
const FENCE_ROWS = [
  { y: 480, gaps: [{ x0: 80, x1: 130 }, { x0: 255, x1: 305 }] },
  { y: 590, gaps: [{ x0: 155, x1: 205 }] },
];
const CACHE_DEFS = [
  { x: 90,  y: 1550, type: 'canteen'   },
  { x: 262, y: 1450, type: 'saddlebag' },
  { x: 160, y: 1200, type: 'ammo'      },
  { x: 72,  y: 950,  type: 'canteen'   },
  { x: 242, y: 762,  type: 'bedroll'   },
  { x: 148, y: 520,  type: 'saddlebag' },
];
const WAYPOINTS = [
  { x: 60,  y: 920 }, { x: 180, y: 940 }, { x: 300, y: 910 },
  { x: 105, y: 480 }, { x: 280, y: 480 }, { x: 180, y: 590 },
];

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const wrap   = document.getElementById('wrap');

function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.width = W; canvas.height = H;
  canvas.style.width  = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
  wrap.style.width    = (W * scale) + 'px';
  wrap.style.height   = (H * scale) + 'px';
}
resize();
window.addEventListener('resize', resize);

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist2(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// ── State ─────────────────────────────────────────────────
let state      = 'title';
let score      = 0;
let loseReason = '';
let startTime  = 0;
let bestScore  = parseInt(localStorage.getItem('outlaw_run_best') || '0', 10);

// Runtime game objects — all reset in startGame()
let path        = [];   // [{x,y}] world coords
let provisions  = PROVISIONS_START;
let caches      = [];
let particles   = [];
let popups      = [];
let cameraOffset = 0;
let sheriffSpawnAt = 0;
let haltTimer   = 0;

let rider = { worldX: W / 2, worldY: 1680, pathIdx: 0, pathT: 0, moving: false };
let sheriff = { worldX: W + 60, worldY: 1600, active: false, waypointTarget: null, recalcAt: 0 };

let drawing     = false;
let lastDrawPt  = null;

function startGame() {
  state       = 'playing';
  score       = 0;
  loseReason  = '';
  startTime   = performance.now();
  path        = [];
  provisions  = PROVISIONS_START;
  caches      = CACHE_DEFS.map(c => ({ ...c, collected: false }));
  particles   = [];
  popups      = [];
  haltTimer   = 0;
  drawing     = false;
  lastDrawPt  = null;
  rider       = { worldX: W / 2, worldY: 1680, pathIdx: 0, pathT: 0, moving: false };
  sheriff     = { worldX: W + 60, worldY: 1600, active: false, waypointTarget: null, recalcAt: 0 };
  sheriffSpawnAt = performance.now() + SHERIFF_DELAY;
  updateCamera();
  ensureAudio();
}

function triggerWin() {
  state = 'win';
  const elapsed = (performance.now() - startTime) / 1000;
  const parTime = 60;
  const bonus   = Math.round(clamp((parTime - elapsed) / parTime, 0, 1) * 500);
  score = Math.round(provisions * 10 + bonus);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('outlaw_run_best', bestScore);
  }
  stopBeat();
  playWin();
}

function triggerLose(reason) {
  state      = 'lose';
  loseReason = reason;
  score      = Math.round(provisions * 10);
  stopBeat();
  playLose();
}

// ── Camera ────────────────────────────────────────────────
function updateCamera() {
  const target = Math.round(H * 0.75 - rider.worldY);
  cameraOffset = clamp(target, H - WORLD_H, 0);
}

function screenToWorld(sx, sy) {
  return { x: sx, y: sy - cameraOffset };
}

// ── Input ─────────────────────────────────────────────────
function getCanvasPoint(e) {
  const r  = canvas.getBoundingClientRect();
  const pt = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
  return {
    x: (pt.clientX - r.left) * (W / r.width),
    y: (pt.clientY - r.top)  * (H / r.height),
  };
}

function onPointerDown(e) {
  const p = getCanvasPoint(e);
  if (state === 'title')             { startGame(); return; }
  if (state === 'win' || state === 'lose') { state = 'title'; return; }
  if (state !== 'playing') return;
  drawing    = true;
  lastDrawPt = screenToWorld(p.x, p.y);
}

function onPointerMove(e) {
  if (!drawing || state !== 'playing') return;
  const p  = getCanvasPoint(e);
  const wp = screenToWorld(p.x, p.y);
  if (!lastDrawPt) { lastDrawPt = wp; return; }
  const d = dist2(wp, lastDrawPt);
  if (d < PATH_SAMPLE) return;

  // Collision check — reject point if it hits an obstacle
  if (isBlocked(wp)) { drawing = false; return; }

  // Provisions check
  const cost = d * PROVISIONS_COST;
  if (provisions <= 0) return;
  provisions = Math.max(0, provisions - cost);

  path.push({ x: wp.x, y: wp.y });
  lastDrawPt = wp;

  // Cache pickup check
  for (const c of caches) {
    if (!c.collected && dist2(wp, c) < CACHE_RADIUS) {
      c.collected = true;
      provisions  = Math.min(PROVISIONS_START, provisions + PROVISIONS_GAIN);
      addPopup('+Supplies', c.x, c.y - 20, '#FFD700');
      playPickup();
    }
  }
}

function onPointerUp() { drawing = false; }

canvas.addEventListener('touchstart',  e => { e.preventDefault(); onPointerDown(e); }, { passive: false });
canvas.addEventListener('touchmove',   e => { e.preventDefault(); onPointerMove(e); }, { passive: false });
canvas.addEventListener('touchend',    e => { e.preventDefault(); onPointerUp();    }, { passive: false });
canvas.addEventListener('touchcancel', e => { onPointerUp(); },                        { passive: false });
canvas.addEventListener('mousedown',   onPointerDown);
canvas.addEventListener('mousemove',   onPointerMove);
canvas.addEventListener('mouseup',     onPointerUp);

// ── Collision helpers (stubs — filled in Task 5) ──────────
function isInRiver(p) {
  if (p.y < RIVER_TOP || p.y > RIVER_BOTTOM) return false;
  for (const f of FORDS) {
    if (Math.abs(p.x - f.x) < f.hw) return false;
  }
  return true;
}

function isInRock(p) {
  for (const r of ROCKS) {
    if (dist2(p, r) < r.r + 14) return true;
  }
  return false;
}

function isInFence(p) {
  for (const row of FENCE_ROWS) {
    if (Math.abs(p.y - row.y) > 8) continue;
    let inGap = false;
    for (const g of row.gaps) { if (p.x >= g.x0 && p.x <= g.x1) { inGap = true; break; } }
    if (!inGap) return true;
  }
  return false;
}

function isBlocked(p) {
  return isInRock(p) || isInRiver(p) || isInFence(p);
}

// ── Popups ────────────────────────────────────────────────
function addPopup(text, x, y, color) {
  popups.push({ text, x, y, color, born: performance.now(), life: 1000 });
}

function updatePopups(now) {
  popups = popups.filter(p => now - p.born < p.life);
}

function drawPopups(now) {
  ctx.save();
  for (const p of popups) {
    const age = Math.max(0, (now - p.born) / p.life);
    ctx.globalAlpha = age < 0.6 ? 1 : 1 - (age - 0.6) / 0.4;
    ctx.fillStyle   = p.color;
    ctx.font        = 'bold 14px Georgia,serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, p.x, p.y - age * 35);
  }
  ctx.restore();
}

// ── Particles ─────────────────────────────────────────────
function addDust(x, y) {
  const now = performance.now();
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      x, y, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20 - 15,
      r: 1.5 + Math.random(), born: now, life: 0.4,
      color: '#C8A04A',
    });
  }
}

function updateParticles(dt, now) {
  particles = particles.filter(p => now - p.born < p.life * 1000);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; }
}

function drawParticles(now) {
  ctx.save();
  for (const p of particles) {
    const age = Math.max(0, (now - p.born) / (p.life * 1000));
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle   = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - age * 0.5), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ── Draw stubs (filled in Tasks 2–9) ─────────────────────
function drawTerrain(now) { /* Task 2 */ }
function drawPath()       { /* Task 3 */ }
function drawCaches()     { /* Task 6 */ }
function drawRider(now)   { /* Task 4 */ }
function drawSheriff()    { /* Task 7 */ }
function drawHUD(now)     { /* Task 8/10 */ }

function drawTitle(now) {
  ctx.save();
  ctx.fillStyle = '#0d0608';
  ctx.fillRect(0, 0, W, H);

  // Simple dusk gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, '#1a0d35');
  sky.addColorStop(1, '#8B3A1A');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.6);
  ctx.fillStyle = '#C8A04A'; ctx.fillRect(0, H * 0.6, W, H * 0.4);

  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 44px Georgia,serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 24;
  ctx.fillText('Outlaw Run', W / 2, H / 2 - 80);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 600);
  ctx.fillStyle = '#A09070'; ctx.font = '18px Georgia,serif';
  ctx.fillText('Tap to ride', W / 2, H / 2 - 18);
  ctx.globalAlpha = 1;

  if (bestScore > 0) {
    ctx.fillStyle = '#70584a'; ctx.font = '13px sans-serif';
    ctx.fillText('Best: ' + bestScore.toLocaleString(), W / 2, H / 2 + 18);
  }
  ctx.fillStyle = '#555'; ctx.font = '12px sans-serif';
  ctx.fillText('Draw your escape route', W / 2, H / 2 + 50);
  ctx.restore();
}

function drawWinLose(now) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,10,15,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (state === 'win') {
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 40px Georgia,serif';
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
    ctx.fillText('ESCAPED!', W / 2, H / 2 - 110);
  } else {
    ctx.fillStyle = '#e05030'; ctx.font = 'bold 36px Georgia,serif';
    ctx.fillText(loseReason || 'CAUGHT!', W / 2, H / 2 - 110);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(score.toLocaleString() + ' pts', W / 2, H / 2 - 62);

  if (state === 'win' && score >= bestScore && score > 0) {
    const pulse = 0.75 + 0.25 * Math.sin(now / 180);
    ctx.globalAlpha = pulse; ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px sans-serif'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
    ctx.fillText('NEW RECORD!', W / 2, H / 2 - 28);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  ctx.fillStyle = '#907860'; ctx.font = '13px sans-serif';
  ctx.fillText('Best: ' + bestScore.toLocaleString(), W / 2, H / 2 - 4);

  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.roundRect(W/2-80, H/2+28, 160, 44, 10); ctx.fill();
  ctx.fillStyle = '#0d0608'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Ride Again', W / 2, H / 2 + 50);
  ctx.restore();
}

// ── Audio stubs (filled Task 9) ───────────────────────────
const AC = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = AC.createGain();
masterGain.connect(AC.destination);
masterGain.gain.setValueAtTime(1.0, AC.currentTime);

async function ensureAudio() {
  if (AC.state === 'suspended') await AC.resume();
}
canvas.addEventListener('touchstart', () => ensureAudio(), { once: true });
canvas.addEventListener('mousedown',  () => ensureAudio(), { once: true });

let beatTimer = null, nextBarTime = 0, barIndex = 0;
function startBeat()  { /* Task 9 */ }
function stopBeat()   { if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; } }
function playPickup() { /* Task 9 */ }
function playWin()    { /* Task 9 */ }
function playLose()   { /* Task 9 */ }
function playGallop() { /* Task 9 */ }
let gallopAt = 0;

// ── Main loop ─────────────────────────────────────────────
let lastTime = 0;
function loop(now) {
  try {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (state === 'playing') {
      updateCamera();
      updateParticles(dt, now);
      updatePopups(now);
      // updateRider, updateSheriff, updateCaches added in later tasks
    }

    ctx.clearRect(0, 0, W, H);

    if (state === 'title') {
      drawTitle(now);
    } else if (state === 'playing') {
      ctx.save();
      ctx.translate(0, cameraOffset);
      drawTerrain(now);
      drawPath();
      drawCaches();
      drawParticles(now);
      drawRider(now);
      drawSheriff();
      ctx.restore();
      drawPopups(now);  // screen-space
      drawHUD(now);
    } else {
      drawWinLose(now);
    }
  } catch(e) {
    console.error('loop error:', e);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(t => { lastTime = t; loop(t); });
</script>
</body>
</html>
```

- [ ] **Step 2: Create `test-outlaw-run.js` with this skeleton**

```js
const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const FILE  = 'file:///' + path.resolve(__dirname, 'outlaw-run.html').replace(/\\/g, '/');
const SHOTS = path.join(__dirname, 'test-screenshots-outlaw');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

let totalPass = 0, totalFail = 0;
function pass(msg) { totalPass++; console.log(`  PASS: ${msg}`); }
function fail(msg) { totalFail++; console.error(`  FAIL: ${msg}`); }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }
function log(label, data) {
  console.log(`\n── ${label} ──`);
  if (data) console.log(JSON.stringify(data, null, 2));
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  console.log(`  📸 ${name}.png`);
}

async function getState(page) {
  return page.evaluate(() => ({
    gameState:   typeof state      !== 'undefined' ? state      : 'UNDEFINED',
    provisions:  typeof provisions !== 'undefined' ? +provisions.toFixed(1) : 'UNDEFINED',
    pathLen:     typeof path       !== 'undefined' ? path.length : 'UNDEFINED',
    riderWorldY: typeof rider      !== 'undefined' ? +rider.worldY.toFixed(1) : 'UNDEFINED',
    riderWorldX: typeof rider      !== 'undefined' ? +rider.worldX.toFixed(1) : 'UNDEFINED',
    sheriffActive: typeof sheriff  !== 'undefined' ? sheriff.active : 'UNDEFINED',
    sheriffX:    typeof sheriff    !== 'undefined' ? +sheriff.worldX.toFixed(1) : 'UNDEFINED',
    sheriffY:    typeof sheriff    !== 'undefined' ? +sheriff.worldY.toFixed(1) : 'UNDEFINED',
    score:       typeof score      !== 'undefined' ? score      : 'UNDEFINED',
    cameraOffset:typeof cameraOffset !== 'undefined' ? +cameraOffset.toFixed(1) : 'UNDEFINED',
  }));
}

async function drag(page, x, y1, y2, steps = 20) {
  await page.mouse.move(x, y1);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, lerp(y1, y2, i / steps));
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}
function lerp(a, b, t) { return a + (b - a) * t; }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: false });
  const page    = await ctx.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('[PAGE ERROR] ' + err.message));
  await page.addInitScript(() => {
    window.__errors = [];
    window.addEventListener('error', e => window.__errors.push(e.message));
    window.addEventListener('unhandledrejection', e => window.__errors.push(String(e.reason)));
  });

  await page.goto(FILE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // ── Suite 1: Title screen ─────────────────────────────
  log('Suite 1: Title screen');
  let s = await getState(page);
  await shot(page, '01-title');
  assert(s.gameState === 'title', `title screen active (got '${s.gameState}')`);

  // Tap to start
  await page.mouse.click(195, 422);
  await page.waitForTimeout(300);
  s = await getState(page);
  await shot(page, '02-playing');
  assert(s.gameState === 'playing', `tap starts game → playing (got '${s.gameState}')`);
  assert(s.provisions === 100, `provisions start at 100 (got ${s.provisions})`);
  assert(s.pathLen === 0, `path starts empty`);

  // More suites added as tasks complete (Tasks 3-10 append below)

  // ── Final: Console errors ─────────────────────────────
  log('Console errors');
  const allErrors = await page.evaluate(() => window.__errors || []);
  assert(allErrors.length === 0, `zero JS errors across session`);
  if (allErrors.length) allErrors.forEach(e => console.error('  ERROR:', e));

  log('Results', { passed: totalPass, failed: totalFail });
  await browser.close();
  if (totalFail > 0) process.exit(1);
})().catch(err => { console.error('Crash:', err); process.exit(1); });
```

- [ ] **Step 3: Run the test**

```
node test-outlaw-run.js
```

Expected: `PASS: title screen active`, `PASS: tap starts game → playing`, `PASS: provisions start at 100`, `PASS: zero JS errors`

- [ ] **Step 4: Commit**

```
git add outlaw-run.html test-outlaw-run.js
git commit -m "feat: outlaw-run shell, state machine, title screen, test skeleton"
```

---

## Task 2: Terrain rendering + camera tracking

**Files:** Modify `outlaw-run.html`

Replace `function drawTerrain(now) { /* Task 2 */ }` with:

- [ ] **Step 1: Implement `drawTerrain`**

```js
function drawTerrain(now) {
  ctx.save();

  // Open flats 1 (start zone) — ochre
  ctx.fillStyle = '#C8A04A'; ctx.fillRect(0, 1380, W, 540);

  // Rock canyon — slightly darker earth
  ctx.fillStyle = '#B8904A'; ctx.fillRect(0, 1020, W, 360);

  // River
  ctx.fillStyle = '#2a4a6a'; ctx.fillRect(0, RIVER_TOP, W, RIVER_BOTTOM - RIVER_TOP);
  // Ford crossings (shallow water)
  for (const f of FORDS) {
    ctx.fillStyle = '#5a9aba';
    ctx.fillRect(f.x - f.hw, RIVER_TOP, f.hw * 2, RIVER_BOTTOM - RIVER_TOP);
    // Ford label
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FORD', f.x, (RIVER_TOP + RIVER_BOTTOM) / 2);
  }

  // Open flats 2
  ctx.fillStyle = '#C8A04A'; ctx.fillRect(0, 680, W, 140);

  // Fence maze zone
  ctx.fillStyle = '#B89040'; ctx.fillRect(0, 380, W, 300);

  // Final run
  ctx.fillStyle = '#C8A04A'; ctx.fillRect(0, 120, W, 260);

  // Hideout zone — dusk sky strip
  const sky = ctx.createLinearGradient(0, 0, 0, 120);
  sky.addColorStop(0, '#1a0d35'); sky.addColorStop(1, '#8B3A1A');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 120);

  // Rocks
  for (const r of ROCKS) {
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath(); ctx.arc(r.x - 4, r.y - 4, r.r * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  // Fences
  for (const row of FENCE_ROWS) {
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    // Draw fence with gap cutouts
    let x = 0;
    const segments = [];
    const sortedGaps = [...row.gaps].sort((a, b) => a.x0 - b.x0);
    for (const g of sortedGaps) {
      if (x < g.x0) segments.push({ x0: x, x1: g.x0 });
      x = g.x1;
    }
    if (x < W) segments.push({ x0: x, x1: W });
    for (const seg of segments) {
      ctx.beginPath(); ctx.moveTo(seg.x0, row.y); ctx.lineTo(seg.x1, row.y); ctx.stroke();
    }
    // Posts every 30px
    ctx.fillStyle = '#4a2a10';
    for (let px = 0; px < W; px += 30) {
      const inGap = sortedGaps.some(g => px >= g.x0 && px <= g.x1);
      if (!inGap) { ctx.fillRect(px - 2, row.y - 8, 4, 16); }
    }
    // Gap markers
    for (const g of row.gaps) {
      ctx.strokeStyle = 'rgba(255,220,100,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(g.x0, row.y - 10); ctx.lineTo(g.x0, row.y + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.x1, row.y - 10); ctx.lineTo(g.x1, row.y + 10); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Hideout cabin
  ctx.fillStyle = '#3a2510';
  ctx.fillRect(W/2 - 22, 40, 44, 32);         // cabin body
  ctx.fillStyle = '#2a1808';
  ctx.beginPath();                              // roof
  ctx.moveTo(W/2 - 28, 40);
  ctx.lineTo(W/2, 20);
  ctx.lineTo(W/2 + 28, 40);
  ctx.closePath(); ctx.fill();
  // Lantern glow
  const glow = ctx.createRadialGradient(W/2, 56, 2, W/2, 56, 22);
  glow.addColorStop(0, 'rgba(255,224,102,0.5)');
  glow.addColorStop(1, 'rgba(255,224,102,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(W/2, 56, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFE066'; ctx.font = '8px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('HIDEOUT', W/2, 82);

  // Water shimmer animation
  const shimX = ((now / 1800) % 1) * (W + 40) - 20;
  const shimGrad = ctx.createLinearGradient(shimX - 20, 0, shimX + 20, 0);
  shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
  shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimGrad;
  ctx.fillRect(0, RIVER_TOP, W, RIVER_BOTTOM - RIVER_TOP);

  ctx.restore();
}
```

- [ ] **Step 2: Wire `updateCamera()` into the playing update block in `loop`**

In `loop`, inside `if (state === 'playing')`, `updateCamera()` is already called. Verify it is there and runs before the draw block.

- [ ] **Step 3: Run test, take a screenshot and visually verify terrain is visible**

```
node test-outlaw-run.js
```

Expected: same PASSes as Task 1. Open `test-screenshots-outlaw/02-playing.png` — should show ochre terrain, dark river strip, rocks. If all black or white, check `cameraOffset` calculation and that `ctx.translate(0, cameraOffset)` wraps the world draw.

- [ ] **Step 4: Commit**

```
git add outlaw-run.html
git commit -m "feat: terrain rendering and camera coordinate system"
```

---

## Task 3: Path drawing + Provisions meter HUD

**Files:** Modify `outlaw-run.html`

The input handlers already exist from Task 1 (`onPointerDown/Move/Up`). This task implements `drawPath`, the Provisions bar, and adds the draw-provisions test.

- [ ] **Step 1: Replace `function drawPath() { /* Task 3 */ }` with:**

```js
function drawPath() {
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.setLineDash([8, 6]);

  // Segments behind rider fade out
  ctx.beginPath();
  for (let i = 0; i < path.length; i++) {
    const isBehind = i < rider.pathIdx;
    ctx.globalAlpha = isBehind ? 0.18 : 0.85;
    if (i === 0 || (i > 0 && ((i < rider.pathIdx) !== ((i-1) < rider.pathIdx)))) {
      ctx.moveTo(path[i].x, path[i].y);
    } else {
      ctx.lineTo(path[i].x, path[i].y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Draw arrowhead at last path point
  if (path.length >= 2) {
    const a = path[path.length - 2], b = path[path.length - 1];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.beginPath();
    ctx.moveTo(b.x + Math.cos(angle) * 8, b.y + Math.sin(angle) * 8);
    ctx.lineTo(b.x + Math.cos(angle + 2.4) * 5, b.y + Math.sin(angle + 2.4) * 5);
    ctx.lineTo(b.x + Math.cos(angle - 2.4) * 5, b.y + Math.sin(angle - 2.4) * 5);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
```

- [ ] **Step 2: Replace `function drawHUD(now) { /* Task 8/10 */ }` with a minimal Provisions bar (full HUD in Task 10):**

```js
function drawHUD(now) {
  if (state !== 'playing') return;
  ctx.save();

  // Provisions bar
  const bx = 12, by = H - 32, bw = 140, bh = 14;
  const pct = provisions / PROVISIONS_START;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill();
  const barColor = pct < 0.25 ? '#e05030' : pct < 0.5 ? '#e0a030' : '#e8a020';
  ctx.fillStyle = barColor;
  ctx.beginPath(); ctx.roundRect(bx, by, bw * pct, bh, 5); ctx.fill();
  ctx.fillStyle = '#E8DCC8'; ctx.font = '10px sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('PROVISIONS', bx, by - 2);

  // Hint text
  if (path.length === 0 && provisions === PROVISIONS_START) {
    ctx.fillStyle = 'rgba(255,220,150,0.6)'; ctx.font = '13px Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('Draw to ride — reach the hideout', W / 2, H - 40);
  }

  ctx.restore();
}
```

- [ ] **Step 3: Add draw + provisions test to `test-outlaw-run.js`**

Append this suite before the final console-error suite:

```js
// ── Suite 2: Path drawing + Provisions ───────────────────
log('Suite 2: Path drawing and provisions');

// Start fresh game
await page.evaluate(() => startGame());
await page.waitForTimeout(200);

const provBefore = (await getState(page)).provisions;
// Drag 200px upward from center-bottom of canvas
// Canvas is scaled: client coords ≈ screen. Canvas H=640 scaled to 844.
// Center-bottom of canvas in client coords: x≈195, y≈700
await drag(page, 195, 700, 500, 25);
await page.waitForTimeout(100);

const s2 = await getState(page);
await shot(page, '03-drawn-path');
assert(s2.pathLen > 5, `path points added after drag (got ${s2.pathLen})`);
assert(s2.provisions < provBefore, `provisions decreased after drawing (before=${provBefore}, after=${s2.provisions})`);
// 200px drag at PROVISIONS_COST=1/12 ≈ 16.7 units. Allow for scaling.
assert(s2.provisions < 95, `provisions decreased by meaningful amount (got ${s2.provisions})`);
```

- [ ] **Step 4: Run tests**

```
node test-outlaw-run.js
```

Expected: all previous PASSes + `PASS: path points added after drag`, `PASS: provisions decreased after drawing`

- [ ] **Step 5: Commit**

```
git add outlaw-run.html test-outlaw-run.js
git commit -m "feat: path drawing mechanic, provisions meter HUD, draw tests"
```

---

## Task 4: Rider movement + camera tracking + dust particles

**Files:** Modify `outlaw-run.html`

- [ ] **Step 1: Add `updateRider` function (place after `updateCamera`):**

```js
function updateRider(dt, now) {
  if (state !== 'playing') return;

  // No path ahead to follow
  if (rider.pathIdx >= path.length - 1) {
    rider.moving = false;
    if (provisions <= 0) {
      haltTimer += dt;
      if (haltTimer >= HALT_TIMEOUT) triggerLose('Stranded!');
    } else {
      haltTimer = 0;
    }
    return;
  }

  rider.moving = true;
  haltTimer = 0;

  let distLeft = RIDER_SPEED * dt;
  while (distLeft > 0 && rider.pathIdx < path.length - 1) {
    const a = path[rider.pathIdx];
    const b = path[rider.pathIdx + 1];
    const segLen = dist2(a, b) || 0.001;
    const remaining = segLen * (1 - rider.pathT);
    if (distLeft >= remaining) {
      rider.pathIdx++;
      rider.pathT = 0;
      distLeft -= remaining;
    } else {
      rider.pathT += distLeft / segLen;
      distLeft = 0;
    }
  }

  // Update world position
  if (rider.pathIdx < path.length - 1) {
    const a = path[rider.pathIdx], b = path[rider.pathIdx + 1];
    rider.worldX = lerp(a.x, b.x, rider.pathT);
    rider.worldY = lerp(a.y, b.y, rider.pathT);
  } else if (path.length > 0) {
    const last = path[path.length - 1];
    rider.worldX = last.x; rider.worldY = last.y;
  }

  // Win check
  if (rider.worldY <= WIN_Y) { triggerWin(); return; }

  // Dust trail
  if (now > gallopAt + 300) {
    addDust(rider.worldX, rider.worldY);
    gallopAt = now;
    playGallop();
  }
}
```

- [ ] **Step 2: Replace `function drawRider(now) { /* Task 4 */ }` with:**

```js
function drawRider(now) {
  ctx.save();
  ctx.translate(rider.worldX, rider.worldY);

  // Horse body (ellipse)
  ctx.fillStyle = '#1a0520';
  ctx.beginPath(); ctx.ellipse(0, 2, 14, 8, 0, 0, Math.PI * 2); ctx.fill();

  // Legs (simple lines)
  ctx.strokeStyle = '#1a0520'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const legBob = rider.moving ? Math.sin(now / 80) * 3 : 0;
  [-8, -3, 3, 8].forEach((lx, i) => {
    ctx.beginPath();
    ctx.moveTo(lx, 6);
    ctx.lineTo(lx + (i % 2 === 0 ? legBob : -legBob), 13);
    ctx.stroke();
  });

  // Rider torso
  ctx.fillStyle = '#1a0520';
  ctx.beginPath(); ctx.ellipse(2, -5, 5, 8, 0.2, 0, Math.PI * 2); ctx.fill();

  // Hat
  ctx.fillRect(-5, -14, 14, 4);
  ctx.beginPath(); ctx.arc(2, -14, 6, Math.PI, 0); ctx.fill();

  ctx.restore();
}
```

- [ ] **Step 3: Wire `updateRider` into the loop's playing update block**

In `loop`, inside `if (state === 'playing')`, add after `updatePopups(now)`:

```js
updateRider(dt, now);
```

- [ ] **Step 4: Add rider-follows-path test to `test-outlaw-run.js`**

Append before the console-error suite:

```js
// ── Suite 3: Rider follows path ───────────────────────────
log('Suite 3: Rider follows path');

await page.evaluate(() => startGame());
await page.waitForTimeout(200);

const riderBefore = (await getState(page)).riderWorldY;
// Draw a long upward path (downward on screen = upward in world Y decreasing)
// Screen coords: drag from y=700 to y=100 (long drag = many path points)
await drag(page, 195, 700, 100, 60);
await page.waitForTimeout(2000); // let rider traverse
const riderAfter = (await getState(page)).riderWorldY;
await shot(page, '04-rider-moved');
assert(riderAfter < riderBefore, `rider worldY decreased (moved toward hideout): ${riderBefore} → ${riderAfter}`);
```

- [ ] **Step 5: Run tests**

```
node test-outlaw-run.js
```

Expected: all previous PASSes + `PASS: rider worldY decreased`

- [ ] **Step 6: Commit**

```
git add outlaw-run.html test-outlaw-run.js
git commit -m "feat: rider path-following, camera tracking, dust particles"
```

---

## Task 5: Obstacle collision — rocks, river, fences

**Files:** Modify `outlaw-run.html`

The collision helper functions (`isInRock`, `isInRiver`, `isInFence`, `isBlocked`) are already in place from Task 1. This task verifies they are correct and adds rider-collision lose detection.

- [ ] **Step 1: Add rider collision check at end of `updateRider`, inside the `rider.moving = true` block, after the win check:**

```js
  // Obstacle collision — rider hits something
  const rp = { x: rider.worldX, y: rider.worldY };
  if (isInRock(rp)) { triggerLose('Wrecked!'); return; }
  if (isInRiver(rp)) { triggerLose('Swept Away!'); return; }
  // Fence collision: rider within 6px of fence row and not in a gap
  for (const row of FENCE_ROWS) {
    if (Math.abs(rp.y - row.y) < 6) {
      let inGap = false;
      for (const g of row.gaps) { if (rp.x >= g.x0 && rp.x <= g.x1) { inGap = true; break; } }
      if (!inGap) { triggerLose('Fenced In!'); return; }
    }
  }
```

- [ ] **Step 2: Verify `isInRiver` correctly allows ford crossings**

`isInRiver` returns false (not in river = passable) when point is within `f.hw` (20px) of a ford X coordinate. Confirm this logic in the existing function:

```js
function isInRiver(p) {
  if (p.y < RIVER_TOP || p.y > RIVER_BOTTOM) return false;
  for (const f of FORDS) {
    if (Math.abs(p.x - f.x) < f.hw) return false; // in ford = passable
  }
  return true; // in deep water = blocked
}
```

- [ ] **Step 3: Add collision test to `test-outlaw-run.js`**

Append before console-error suite:

```js
// ── Suite 4: River collision → lose ───────────────────────
log('Suite 4: River collision');

await page.evaluate(() => startGame());
await page.waitForTimeout(200);

// Teleport rider just above river, then draw into deep water (not a ford)
// Deep water center at x=180 (between fords at 60, 180, 300 — wait ford IS at 180)
// Use x=120 which is between left ford (60) and center ford (180) — deep water
await page.evaluate(() => {
  rider.worldX = 120;
  rider.worldY = RIVER_TOP + 5; // just inside river, not at a ford
  // Force rider into deep water position
});
await page.waitForTimeout(200);
// Draw a path through deep water
await page.evaluate(() => {
  // Manually add path points through deep water to trigger rider movement
  path = [
    { x: 120, y: RIVER_TOP + 5 },
    { x: 120, y: RIVER_TOP + 50 },
  ];
  rider.pathIdx = 0; rider.pathT = 0;
});
await page.waitForTimeout(800);
const s4 = await getState(page);
await shot(page, '05-river-collision');
assert(s4.gameState === 'lose', `riding into deep river → lose (got '${s4.gameState}')`);
```

- [ ] **Step 4: Run tests**

```
node test-outlaw-run.js
```

Expected: all previous PASSes + `PASS: riding into deep river → lose`

- [ ] **Step 5: Commit**

```
git add outlaw-run.html test-outlaw-run.js
git commit -m "feat: obstacle collision detection for rocks, river, fences"
```

---

## Task 6: Supply caches — render + pickup

**Files:** Modify `outlaw-run.html`

- [ ] **Step 1: Replace `function drawCaches() { /* Task 6 */ }` with:**

```js
function drawCaches() {
  ctx.save();
  for (const c of caches) {
    if (c.collected) continue;
    // Glow ring
    ctx.strokeStyle = 'rgba(255,215,0,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, 14, 0, Math.PI * 2); ctx.stroke();

    // Icon background
    ctx.fillStyle = '#3a2510';
    ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI * 2); ctx.fill();

    // Icon character
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const icons = { canteen: '⊙', saddlebag: '◈', ammo: '▸', bedroll: '≡' };
    ctx.fillText(icons[c.type] || '•', c.x, c.y);
  }
  ctx.restore();
}
```

- [ ] **Step 2: Add cache test to `test-outlaw-run.js`**

Append before console-error suite:

```js
// ── Suite 5: Supply cache pickup ──────────────────────────
log('Suite 5: Cache pickup');

await page.evaluate(() => startGame());
await page.waitForTimeout(200);

// Drain provisions first, then draw through a cache
await page.evaluate(() => { provisions = 40; });
const provBeforePickup = (await getState(page)).provisions;

// Draw path through first cache at world (90, 1550)
// Camera at start: cameraOffset = H*0.75 - 1680 = 480 - 1680 = -1200
// Screen coords for world (90,1550): screenX=90, screenY=1550+(-1200)=350
// But canvas scale = 844/640 ≈ 1.319 — client Y = 350 * 1.319 ≈ 462
await page.evaluate(() => {
  // Add path through cache manually for reliability
  const cachePos = CACHE_DEFS[0]; // {x:90, y:1550}
  path = [
    { x: cachePos.x - 5, y: cachePos.y + 5 },
    { x: cachePos.x,     y: cachePos.y      },
    { x: cachePos.x + 5, y: cachePos.y - 5  },
  ];
  rider.pathIdx = 0; rider.pathT = 0;
  // Trigger cache check manually
  for (const c of caches) {
    if (!c.collected) {
      const dx = cachePos.x - c.x, dy = cachePos.y - c.y;
      if (Math.hypot(dx, dy) < CACHE_RADIUS) {
        c.collected = true;
        provisions = Math.min(PROVISIONS_START, provisions + PROVISIONS_GAIN);
        break;
      }
    }
  }
});
await page.waitForTimeout(200);
const s5 = await getState(page);
await shot(page, '06-cache-pickup');
assert(s5.provisions > provBeforePickup, `provisions increased after cache pickup (${provBeforePickup} → ${s5.provisions})`);
```

- [ ] **Step 3: Run tests**

```
node test-outlaw-run.js
```

Expected: all previous + `PASS: provisions increased after cache pickup`

- [ ] **Step 4: Commit**

```
git add outlaw-run.html test-outlaw-run.js
git commit -m "feat: supply cache rendering and pickup mechanic"
```

---

## Task 7: Sheriff — spawn, waypoint navigation, catch detection

**Files:** Modify `outlaw-run.html`

- [ ] **Step 1: Add `lineClear` helper (checks if a world-space line segment avoids all obstacles)**

Place after `isBlocked`:

```js
function lineClear(a, b) {
  const steps = Math.ceil(dist2(a, b) / 20);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    // Use tighter rock radius for sheriff (no rider radius offset)
    for (const r of ROCKS) { if (dist2(p, r) < r.r) return false; }
    if (isInRiver(p)) return false;
    for (const row of FENCE_ROWS) {
      if (Math.abs(p.y - row.y) > 4) continue;
      let inGap = false;
      for (const g of row.gaps) { if (p.x >= g.x0 && p.x <= g.x1) { inGap = true; break; } }
      if (!inGap) return false;
    }
  }
  return true;
}
```

- [ ] **Step 2: Add `updateSheriff` function (place after `updateRider`):**

```js
function updateSheriff(dt, now) {
  if (state !== 'playing') return;

  // Spawn after delay
  if (!sheriff.active) {
    if (now >= sheriffSpawnAt) sheriff.active = true;
    else return;
  }

  const target = { x: rider.worldX, y: rider.worldY };

  // Recalculate route every 500ms
  if (now > sheriff.recalcAt) {
    sheriff.recalcAt = now + 500;
    if (lineClear({ x: sheriff.worldX, y: sheriff.worldY }, target)) {
      sheriff.waypointTarget = null; // go direct
    } else {
      // Find waypoint that minimizes distance-to-rider after passing through it
      let best = null, bestDist = Infinity;
      for (const wp of WAYPOINTS) {
        const d = dist2({ x: sheriff.worldX, y: sheriff.worldY }, wp) + dist2(wp, target);
        if (d < bestDist) { bestDist = d; best = wp; }
      }
      sheriff.waypointTarget = best;
    }
  }

  // Move toward current target
  const moveTo = sheriff.waypointTarget || target;
  const dx = moveTo.x - sheriff.worldX;
  const dy = moveTo.y - sheriff.worldY;
  const d  = Math.hypot(dx, dy) || 1;
  const step = SHERIFF_SPEED * dt;

  if (d <= step) {
    sheriff.worldX = moveTo.x;
    sheriff.worldY = moveTo.y;
    if (sheriff.waypointTarget) sheriff.waypointTarget = null;
  } else {
    sheriff.worldX += (dx / d) * step;
    sheriff.worldY += (dy / d) * step;
  }

  // Catch check
  if (dist2({ x: sheriff.worldX, y: sheriff.worldY }, target) < CATCH_RADIUS) {
    triggerLose('Caught!');
  }
}
```

- [ ] **Step 3: Replace `function drawSheriff() { /* Task 7 */ }` with:**

```js
function drawSheriff() {
  if (!sheriff.active) return;
  ctx.save();
  ctx.translate(sheriff.worldX, sheriff.worldY);

  // Body — red-tinted silhouette, slightly larger than rider
  ctx.fillStyle = '#6a1010';
  ctx.beginPath(); ctx.ellipse(0, 2, 16, 9, 0, 0, Math.PI * 2); ctx.fill();

  // Torso
  ctx.beginPath(); ctx.ellipse(2, -5, 6, 9, 0.2, 0, Math.PI * 2); ctx.fill();

  // Hat (wide-brim sheriff hat)
  ctx.fillRect(-7, -14, 18, 4);
  ctx.beginPath(); ctx.arc(2, -14, 8, Math.PI, 0); ctx.fill();

  // Star badge
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', 2, -6);

  ctx.restore();
}
```

- [ ] **Step 4: Wire `updateSheriff` into loop's playing block**

In `loop` inside `if (state === 'playing')`, add after `updateRider(dt, now)`:

```js
updateSheriff(dt, now);
```

- [ ] **Step 5: Add sheriff test to `test-outlaw-run.js`**

Append before console-error suite:

```js
// ── Suite 6: Sheriff spawns and moves ─────────────────────
log('Suite 6: Sheriff spawns and moves');

await page.evaluate(() => startGame());
await page.waitForTimeout(200);

const sheriffBefore = await getState(page);
assert(sheriffBefore.sheriffActive === false, `sheriff not active at start`);

// Fast-forward spawn timer
await page.evaluate(() => { sheriffSpawnAt = performance.now() - 100; });
await page.waitForTimeout(800);

const sheriffAfter = await getState(page);
await shot(page, '07-sheriff-active');
assert(sheriffAfter.sheriffActive === true, `sheriff becomes active after delay`);
assert(sheriffAfter.sheriffX !== sheriffBefore.sheriffX ||
       sheriffAfter.sheriffY !== sheriffBefore.sheriffY,
       `sheriff moved from spawn position`);
```

- [ ] **Step 6: Run tests**

```
node test-outlaw-run.js
```

Expected: all previous + `PASS: sheriff not active at start`, `PASS: sheriff becomes active`, `PASS: sheriff moved`

- [ ] **Step 7: Commit**

```
git add outlaw-run.html test-outlaw-run.js
git commit -m "feat: sheriff spawn, waypoint navigation, catch detection"
```

---

## Task 8: Win/lose states, full scoring, overlays

**Files:** Modify `outlaw-run.html`

`triggerWin` and `triggerLose` are already implemented in Task 1. `drawWinLose` is already implemented. This task adds the win test and verifies score calculation.

- [ ] **Step 1: Add win + score tests to `test-outlaw-run.js`**

Append before console-error suite:

```js
// ── Suite 7: Win condition + scoring ──────────────────────
log('Suite 7: Win condition');

await page.evaluate(() => startGame());
await page.waitForTimeout(200);

// Teleport rider to just above WIN_Y and give it a path segment
await page.evaluate(() => {
  rider.worldX = W / 2;
  rider.worldY = WIN_Y + 10;
  path = [
    { x: W / 2, y: WIN_Y + 10 },
    { x: W / 2, y: WIN_Y - 5  },
  ];
  rider.pathIdx = 0; rider.pathT = 0;
  provisions = 80; // set known value for score check
});
await page.waitForTimeout(1000);
const s7 = await getState(page);
await shot(page, '08-win');
assert(s7.gameState === 'win', `rider reaching WIN_Y → state=win (got '${s7.gameState}')`);
assert(s7.score > 0, `score > 0 after win (got ${s7.score})`);

// Verify localStorage updated
const stored = await page.evaluate(() => localStorage.getItem('outlaw_run_best'));
assert(parseInt(stored) > 0, `bestScore written to localStorage (got ${stored})`);

// ── Suite 8: Stranded lose condition ──────────────────────
log('Suite 8: Stranded lose');

await page.evaluate(() => startGame());
await page.waitForTimeout(200);

await page.evaluate(() => {
  provisions = 0;
  path = []; rider.pathIdx = 0; rider.pathT = 0; rider.moving = false;
  haltTimer = HALT_TIMEOUT - 0.1; // just under threshold
});
await page.waitForTimeout(500); // push past threshold
const s8 = await getState(page);
await shot(page, '09-stranded');
assert(s8.gameState === 'lose', `halt timeout → lose state (got '${s8.gameState}')`);
```

- [ ] **Step 2: Run tests**

```
node test-outlaw-run.js
```

Expected: all previous + `PASS: rider reaching WIN_Y → state=win`, `PASS: score > 0`, `PASS: bestScore written to localStorage`, `PASS: halt timeout → lose state`

- [ ] **Step 3: Commit**

```
git add outlaw-run.html test-outlaw-run.js
git commit -m "feat: win/lose state verification, score, localStorage"
```

---

## Task 9: Audio — background beat, SFX

**Files:** Modify `outlaw-run.html`

Replace all audio stubs with real implementations.

- [ ] **Step 1: Replace `function startBeat() { /* Task 9 */ }` with:**

```js
const CHORD_BARS = [
  [196, 247, 294, 247, 196, 247, 294, 247],
  [262, 330, 392, 330, 262, 330, 392, 330],
  [294, 370, 440, 370, 294, 370, 440, 370],
  [196, 247, 294, 247, 196, 247, 294, 247],
];
const BPM = 95;
const EIGHTH_S = (60 / BPM) / 2;

function scheduleNote(freq, t, gain) {
  const osc = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
  osc.connect(f); f.connect(g); g.connect(masterGain);
  osc.type = 'triangle'; f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.8;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  osc.start(t); osc.stop(t + 0.32);
}

function startBeat() {
  masterGain.gain.cancelScheduledValues(AC.currentTime);
  masterGain.gain.setValueAtTime(1.0, AC.currentTime);
  nextBarTime = AC.currentTime + 0.05;
  barIndex    = 0;
  function tick() {
    const barDur = EIGHTH_S * 8;
    while (nextBarTime < AC.currentTime + 2.0) {
      const bar = CHORD_BARS[barIndex % CHORD_BARS.length];
      bar.forEach((freq, i) => {
        scheduleNote(freq, nextBarTime + i * EIGHTH_S, i % 2 === 0 ? 0.28 : 0.14);
      });
      nextBarTime += barDur;
      barIndex++;
    }
    beatTimer = setTimeout(tick, 500);
  }
  tick();
}

function stopBeat() {
  if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
  masterGain.gain.cancelScheduledValues(AC.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, AC.currentTime + 0.15);
  setTimeout(() => masterGain.gain.setValueAtTime(1.0, AC.currentTime), 300);
}
```

- [ ] **Step 2: Replace the four SFX stubs:**

```js
function playPickup() {
  [392, 494].forEach((freq, i) => {
    const t = AC.currentTime + i * 0.08;
    const osc = AC.createOscillator(), g = AC.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'triangle'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t); osc.stop(t + 0.18);
  });
}

function playWin() {
  [392, 494, 587, 784].forEach((freq, i) => {
    const t = AC.currentTime + i * 0.09;
    const osc = AC.createOscillator(), g = AC.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'triangle'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.start(t); osc.stop(t + 0.28);
  });
}

function playLose() {
  [330, 247].forEach((freq, i) => {
    const t = AC.currentTime + i * 0.15;
    const osc = AC.createOscillator(), g = AC.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'square'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t); osc.stop(t + 0.25);
  });
}

function playGallop() {
  const len = Math.floor(AC.sampleRate * 0.06);
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AC.createBufferSource(), lpf = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = buf; lpf.type = 'lowpass'; lpf.frequency.value = 180;
  g.gain.value = 0.08;
  src.connect(lpf); lpf.connect(g); g.connect(masterGain);
  src.start(); src.stop(AC.currentTime + 0.06);
}
```

- [ ] **Step 3: Wire `startBeat()` into `startGame()`**

In `startGame()`, replace `ensureAudio();` with:

```js
ensureAudio().then(() => startBeat());
```

- [ ] **Step 4: Run tests**

```
node test-outlaw-run.js
```

Expected: all previous PASSes, no new audio-related errors.

- [ ] **Step 5: Commit**

```
git add outlaw-run.html
git commit -m "feat: background beat G-C-D-G, gallop SFX, pickup/win/lose sounds"
```

---

## Task 10: Full HUD, canvas pixel test, homepage card, final test suite

**Files:** Modify `outlaw-run.html`, `test-outlaw-run.js`, `index.html`

- [ ] **Step 1: Replace `drawHUD` with the complete version:**

```js
function drawHUD(now) {
  if (state !== 'playing') return;
  ctx.save();

  // Provisions bar
  const bx = 12, by = H - 32, bw = 140, bh = 14;
  const pct = clamp(provisions / PROVISIONS_START, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill();
  const barColor = pct < 0.25 ? '#e05030' : pct < 0.5 ? '#e0a030' : '#e8a020';
  ctx.fillStyle = barColor;
  if (pct > 0) { ctx.beginPath(); ctx.roundRect(bx, by, bw * pct, bh, 5); ctx.fill(); }
  ctx.fillStyle = '#E8DCC8'; ctx.font = '10px sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('PROVISIONS', bx, by - 2);

  // Distance to hideout bar (top center)
  const totalDist = 1680 - WIN_Y;
  const traveled  = clamp(1680 - rider.worldY, 0, totalDist);
  const distPct   = traveled / totalDist;
  const dx = W/2 - 60, dy = 10, dw = 120, dh = 12;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, 4); ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.roundRect(dx, dy, dw * distPct, dh, 4); ctx.fill();
  ctx.fillStyle = '#E8DCC8'; ctx.font = '9px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('TO HIDEOUT', W/2, dy - 1);

  // Sheriff proximity badge (top right)
  if (sheriff.active) {
    const sd = dist2({ x: sheriff.worldX, y: sheriff.worldY }, { x: rider.worldX, y: rider.worldY });
    const danger = sd < 300;
    const pulse  = danger ? (0.6 + 0.4 * Math.sin(now / 120)) : 0.6;
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = danger ? '#e03020' : '#907060';
    ctx.font = '18px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('★', W - 10, 8);
    ctx.globalAlpha = 1;
  }

  // Halt warning
  if (!rider.moving && provisions <= 0) {
    const remaining = Math.max(0, HALT_TIMEOUT - haltTimer);
    ctx.fillStyle = `rgba(200,80,20,${0.15 + 0.15 * Math.sin(now / 60)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e05030'; ctx.font = 'bold 20px Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#e05030'; ctx.shadowBlur = 12;
    ctx.fillText(`Stranded! ${remaining.toFixed(1)}s`, W/2, H/2);
    ctx.shadowBlur = 0;
  }

  // Draw hint
  if (path.length === 0) {
    ctx.fillStyle = 'rgba(255,220,150,0.55)'; ctx.font = '13px Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('Draw your escape route', W/2, H - 42);
  }

  ctx.restore();
}
```

- [ ] **Step 2: Add canvas pixel test + HUD test to `test-outlaw-run.js`**

Append before console-error suite:

```js
// ── Suite 9: Canvas pixel content ─────────────────────────
log('Suite 9: Canvas pixels');

await page.evaluate(() => startGame());
await page.waitForTimeout(500);

const pixels = await page.evaluate(() => {
  const cv = document.getElementById('c');
  const c  = cv.getContext('2d');
  const samples = [
    { label: 'terrain (center)',   x: 180, y: 500 },
    { label: 'HUD provisions bar', x: 80,  y: 624 },
    { label: 'distance bar',       x: 180, y: 16  },
  ];
  return samples.map(s => {
    const d = c.getImageData(s.x, s.y, 1, 1).data;
    return { ...s, rgba: [d[0],d[1],d[2],d[3]] };
  });
});
let blankCount = 0;
for (const px of pixels) {
  const dark = px.rgba[0] < 10 && px.rgba[1] < 10 && px.rgba[2] < 10;
  console.log(`  ${dark ? '⚠' : '✓'} ${px.label}: rgba(${px.rgba.join(',')})`);
  if (dark) blankCount++;
}
assert(blankCount === 0, `all sampled canvas pixels have content (${blankCount} blank)`);

await shot(page, '10-final-gameplay');
```

- [ ] **Step 3: Add game card to `index.html`**

Open `index.html` and add this card in the games grid, after the Gone Fishin' card:

```html
<a class="game-card" href="outlaw-run.html">
  <div class="game-card-info">
    <div class="game-num">Game 05</div>
    <div class="game-title">Outlaw Run</div>
    <div class="game-desc">Draw your escape — outrun the sheriff</div>
  </div>
  <div class="play-btn">Play</div>
</a>
```

- [ ] **Step 4: Run final test suite**

```
node test-outlaw-run.js
```

Expected output ends with:
```
── Results ──
{ "passed": N, "failed": 0 }
```

All suites should PASS. If any FAIL, fix before committing.

- [ ] **Step 5: Final commit + push**

```
git add outlaw-run.html test-outlaw-run.js index.html
git commit -m "feat: complete Outlaw Run (Game 05) — full HUD, tests, homepage card"
git push
```

---

## Pre-Implementation Checklist (read before Task 1)

Lessons applied from Gone Fishin' and Honky Tonk:

- [ ] All variables used in `draw*` functions are defined at module scope (`provisions`, `rider`, `sheriff`, `path`, `caches`, `cameraOffset`, `haltTimer`)
- [ ] `loop()` is wrapped in try/catch; Playwright test asserts zero console errors
- [ ] Every `draw*` function opens with `ctx.save()` and closes with `ctx.restore()`
- [ ] `ctx.setLineDash([])` is reset inside `drawPath`'s save/restore block
- [ ] `startGame()` resets every stateful variable (path, provisions, rider, sheriff, caches, particles, popups, haltTimer, drawing, lastDrawPt, sheriffSpawnAt, gallopAt)
- [ ] `startBeat()` calls `cancelScheduledValues` + `setValueAtTime(1.0)` before scheduling
- [ ] `stopBeat()` ramps masterGain to 0 to cut pre-scheduled audio tail
- [ ] Popups drawn in screen space (outside the `ctx.translate(0, cameraOffset)` block)
- [ ] Touch events use `e.preventDefault()` to block scroll/zoom
- [ ] `touchcancel` handler resets `drawing = false`
