# Gone Fishin' Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Gone Fishin'" — a physics-based fishing game with a pre-composed country chord progression that actually sounds like a song.

**Architecture:** Single HTML file. State machine (title → casting → waiting → biting → reeling → caught/broke/escaped → casting). Bezier fishing line droops with gravity; fish have multi-state behavior (idle/attracted/biting/spooked). Pre-composed G–C–D–G fingerpick loop uses real chord tones scheduled precisely on eighth-note boundaries.

**Tech Stack:** HTML5 Canvas, Web Audio API, localStorage, Formspree for feedback.

**Spec:** `docs/superpowers/specs/2026-04-26-gone-fishin-design.md`

**Output file:** `gone-fishin.html`

---

## Pre-empted failure modes (check every task)

- Wrap every drawX function body in `ctx.save()` / `ctx.restore()` — state must not leak
- Draw functions must be pure — never mutate state inside a draw call
- `startGame()` must reset ALL stateful variables
- `ctx.filter` must be reset AFTER `ctx.restore()`, not inside the save block
- Audio gain must be cancelled and reset before scheduling in `startBeat()`
- `stopBeat()` must ramp gain to 0 to cut pre-scheduled audio tail

---

## Constants (reference for all tasks)

```js
const W = 360, H = 640;
const WATER_Y = 220;           // water surface y
const ROD_BASE = { x: 0, y: 200 };
const ROD_TIP  = { x: 110, y: 140 };
const BPM = 90;
const BEAT_MS   = 60000 / BPM;   // 666.7ms
const EIGHTH_MS = BEAT_MS / 2;   // 333.3ms
const FEEDBACK_ENDPOINT = 'https://formspree.io/f/xdayvnvo';

const FISH_TYPES = [
  { name: 'Sunfish',     pts: 50,  w: 16, depthMin: WATER_Y+10, depthMax: WATER_Y+120, speed: 55, rarity: 0.40, bold: 0.7 },
  { name: 'Bass',        pts: 150, w: 24, depthMin: WATER_Y+40, depthMax: WATER_Y+220, speed: 38, rarity: 0.35, bold: 0.5 },
  { name: 'Catfish',     pts: 300, w: 34, depthMin: WATER_Y+150,depthMax: WATER_Y+320, speed: 22, rarity: 0.20, bold: 0.4 },
  { name: 'Trophy Bass', pts: 750, w: 48, depthMin: WATER_Y+260,depthMax: WATER_Y+380, speed: 14, rarity: 0.05, bold: 0.25 },
];

// Chord progression: G–C–D–G
// Each bar = 8 eighth notes. Bass notes gain 0.28, upper notes 0.14.
const CHORD_BARS = [
  [196, 247, 294, 247, 196, 247, 294, 247], // G maj: G3 B3 D4 B3...
  [262, 330, 392, 330, 262, 330, 392, 330], // C maj: C4 E4 G4 E4...
  [294, 370, 440, 370, 294, 370, 440, 370], // D maj: D4 F#4 A4 F#4...
  [196, 247, 294, 247, 196, 247, 294, 247], // G maj: repeat
];
```

---

### Task 1: Project setup — scaffold, constants, state machine, game loop

**Files:**
- Create: `gone-fishin.html`

- [ ] **Step 1: Create the HTML file with full scaffold**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Gone Fishin'</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; display: flex; justify-content: center; align-items: center;
       height: 100vh; overflow: hidden; touch-action: none; }
#wrap { position: relative; }
canvas { display: block; }
</style>
</head>
<body>
<div id="wrap">
  <canvas id="c"></canvas>
  <!-- feedback overlay placeholder — added in Task 10 -->
</div>
<script>
const W = 360, H = 640;
const WATER_Y = 220;
const ROD_BASE = { x: 0, y: 200 };
const ROD_TIP  = { x: 110, y: 140 };
const BPM = 90;
const BEAT_MS   = 60000 / BPM;
const EIGHTH_MS = BEAT_MS / 2;
const FEEDBACK_ENDPOINT = 'https://formspree.io/f/xdayvnvo';

const FISH_TYPES = [
  { name: 'Sunfish',     pts: 50,  w: 16, depthMin: WATER_Y+10,  depthMax: WATER_Y+120, speed: 55, rarity: 0.40, bold: 0.7  },
  { name: 'Bass',        pts: 150, w: 24, depthMin: WATER_Y+40,  depthMax: WATER_Y+220, speed: 38, rarity: 0.35, bold: 0.5  },
  { name: 'Catfish',     pts: 300, w: 34, depthMin: WATER_Y+150, depthMax: WATER_Y+320, speed: 22, rarity: 0.20, bold: 0.4  },
  { name: 'Trophy Bass', pts: 750, w: 48, depthMin: WATER_Y+260, depthMax: WATER_Y+380, speed: 14, rarity: 0.05, bold: 0.25 },
];

const CHORD_BARS = [
  [196, 247, 294, 247, 196, 247, 294, 247],
  [262, 330, 392, 330, 262, 330, 392, 330],
  [294, 370, 440, 370, 294, 370, 440, 370],
  [196, 247, 294, 247, 196, 247, 294, 247],
];

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const wrap   = document.getElementById('wrap');

function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.width  = W; canvas.height = H;
  canvas.style.width  = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
  wrap.style.width    = (W * scale) + 'px';
  wrap.style.height   = (H * scale) + 'px';
}
resize();
window.addEventListener('resize', resize);

// ── Utility ──────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// ── Game state ────────────────────────────────────────────
// States: 'title' | 'casting' | 'waiting' | 'biting' | 'reeling' | 'gameover'
let state      = 'title';
let score      = 0;
let fishCount  = 0;
let timeLeft   = 90; // seconds
let bestScore  = parseInt(localStorage.getItem('gonefishin_best') || '0', 10);

// Stub placeholders — filled in by later tasks
let fish       = [];
let particles  = [];
let ripples    = [];
let popups     = [];

// Lure state
let lure = { x: ROD_TIP.x, y: ROD_TIP.y, targetX: ROD_TIP.x, targetY: ROD_TIP.y, inWater: false };
// Reel
let tension    = 0;
let hookedFish = null;
// Cast power
let castPower  = 0;
let castHeld   = false;
// Bite window
let biteTimer  = 0;
// Timer interval
let gameTimer  = null;

function startGame() {
  state      = 'casting';
  score      = 0;
  fishCount  = 0;
  timeLeft   = 90;
  fish       = [];
  particles  = [];
  ripples    = [];
  popups     = [];
  lure       = { x: ROD_TIP.x, y: ROD_TIP.y, targetX: ROD_TIP.x, targetY: ROD_TIP.y, inWater: false };
  tension    = 0;
  hookedFish = null;
  castPower  = 0;
  castHeld   = false;
  biteTimer  = 0;
  clearInterval(gameTimer);
  gameTimer  = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 1);
    if (timeLeft === 0) endGame();
  }, 1000);
  // audio + fish spawning started in later tasks
}

function endGame() {
  clearInterval(gameTimer);
  state = 'gameover';
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('gonefishin_best', bestScore);
  }
  // stopBeat called in audio task
}

// ── Input (stub — expanded in Task 5) ────────────────────
function onTap(e) {
  e.preventDefault();
  const r  = canvas.getBoundingClientRect();
  const t0 = e.changedTouches ? e.changedTouches[0] : e;
  const x  = (t0.clientX - r.left) * (W / r.width);
  const y  = (t0.clientY - r.top)  * (H / r.height);

  if (state === 'title')    { startGame(); return; }
  if (state === 'gameover') {
    if (x > W/2-80 && x < W/2+80 && y > H/2+20 && y < H/2+64) startGame();
    return;
  }
}
canvas.addEventListener('touchstart', onTap, { passive: false });
canvas.addEventListener('click',      onTap);

// ── Draw stubs ────────────────────────────────────────────
function drawScene(now) { /* Task 2 */ }
function drawLine(now)  { /* Task 3 */ }
function drawFish(now)  { /* Task 4 */ }
function drawHUD(now)   { /* Task 9 */ }
function drawTitle(now) { ctx.save(); ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#FFD700'; ctx.font='bold 48px serif'; ctx.textAlign='center';
  ctx.fillText("Gone Fishin'", W/2, H/2-40);
  ctx.fillStyle='#A09070'; ctx.font='18px Georgia,serif'; ctx.fillText('Tap to start', W/2, H/2+20); ctx.restore(); }
function drawGameOver(now) { ctx.save(); ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#FFD700'; ctx.font='bold 36px serif'; ctx.textAlign='center';
  ctx.fillText('GAME OVER', W/2, H/2-80);
  ctx.fillStyle='#E8DCC8'; ctx.font='bold 24px sans-serif'; ctx.fillText(score+' pts', W/2, H/2-40);
  ctx.fillStyle='#FFD700'; ctx.fillRect(W/2-80, H/2+20, 160, 44);
  ctx.fillStyle='#0d0608'; ctx.font='bold 18px sans-serif'; ctx.fillText('Play Again', W/2, H/2+47); ctx.restore(); }

// ── Main loop ─────────────────────────────────────────────
let lastTime = 0;
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  ctx.clearRect(0, 0, W, H);
  drawScene(now);
  drawFish(now);
  drawLine(now);
  drawHUD(now);
  if (state === 'title')    drawTitle(now);
  if (state === 'gameover') drawGameOver(now);

  requestAnimationFrame(loop);
}
requestAnimationFrame(t => { lastTime = t; loop(t); });
</script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify blank canvas renders, no console errors**

- [ ] **Step 3: Commit**
```bash
git add gone-fishin.html
git commit -m "feat(gone-fishin): task 1 — scaffold, constants, state machine, game loop"
```

---

### Task 2: Scene rendering — sky, trees, water layers

**Files:**
- Modify: `gone-fishin.html` — replace `drawScene` stub

- [ ] **Step 1: Replace `drawScene` with full implementation**

```js
// Tree silhouette shapes: array of {x, h, type} where type 'pine'|'oak'
const TREES = [
  // Left bank
  { x: -10, h: 90, type: 'pine' }, { x: 15, h: 110, type: 'pine' },
  { x: 35,  h: 80, type: 'oak'  }, { x: 55, h: 95,  type: 'pine' },
  { x: 70,  h: 70, type: 'oak'  },
  // Right bank
  { x: 290, h: 85, type: 'oak'  }, { x: 310, h: 105, type: 'pine' },
  { x: 330, h: 75, type: 'pine' }, { x: 348, h: 90,  type: 'oak'  },
  { x: 362, h: 100,type: 'pine' },
];

function drawTree(x, h, type) {
  ctx.fillStyle = '#0d1a0f';
  if (type === 'pine') {
    // Triangle stack
    for (let i = 0; i < 3; i++) {
      const ty = WATER_Y - h + i * (h * 0.28);
      const tw = (h * 0.55) * (1 - i * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x - tw/2, ty + h * 0.38);
      ctx.lineTo(x + tw/2, ty + h * 0.38);
      ctx.closePath();
      ctx.fill();
    }
    // Trunk
    ctx.fillRect(x - 4, WATER_Y - h * 0.15, 8, h * 0.15);
  } else {
    // Oak: trunk + round canopy
    ctx.fillRect(x - 5, WATER_Y - h * 0.4, 10, h * 0.4);
    ctx.beginPath();
    ctx.arc(x, WATER_Y - h * 0.55, h * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Water shimmer: animate a highlight band
function drawScene(now) {
  ctx.save();

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, WATER_Y);
  sky.addColorStop(0,   '#1a0a2e');  // deep purple top
  sky.addColorStop(0.5, '#8B3A1A');  // warm rust mid
  sky.addColorStop(1,   '#FF8C42');  // orange at horizon
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, WATER_Y);

  // Distant hills silhouette
  ctx.fillStyle = '#0a1208';
  ctx.beginPath();
  ctx.moveTo(0, WATER_Y);
  [0,40,70,110,150,190,230,270,310,360].forEach((x, i) => {
    const hh = [20,35,28,42,25,38,30,45,22,15][i];
    ctx.lineTo(x, WATER_Y - hh);
  });
  ctx.lineTo(W, WATER_Y);
  ctx.closePath();
  ctx.fill();

  // Trees
  for (const t of TREES) drawTree(t.x, t.h, t.type);

  // Water layers (depth bands)
  const waterLayers = [
    { y: WATER_Y,       h: 120, color: '#1a3a4a' },
    { y: WATER_Y + 120, h: 120, color: '#0f2030' },
    { y: WATER_Y + 240, h: 120, color: '#080f18' },
    { y: WATER_Y + 360, h: H - (WATER_Y + 360), color: '#050a10' },
  ];
  for (const l of waterLayers) {
    ctx.fillStyle = l.color;
    ctx.fillRect(0, l.y, W, l.h);
  }

  // Water surface line + shimmer
  ctx.strokeStyle = 'rgba(255,200,100,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, WATER_Y); ctx.lineTo(W, WATER_Y); ctx.stroke();

  // Animated shimmer highlight
  const shimX = ((now / 2000) % 1) * (W + 60) - 30;
  const shimGrad = ctx.createLinearGradient(shimX - 30, 0, shimX + 30, 0);
  shimGrad.addColorStop(0,   'rgba(255,220,120,0)');
  shimGrad.addColorStop(0.5, 'rgba(255,220,120,0.18)');
  shimGrad.addColorStop(1,   'rgba(255,220,120,0)');
  ctx.fillStyle = shimGrad;
  ctx.fillRect(0, WATER_Y - 2, W, 6);

  ctx.restore();
}
```

- [ ] **Step 2: Verify in browser — golden hour lake scene renders correctly, shimmer animates**

- [ ] **Step 3: Commit**
```bash
git commit -m "feat(gone-fishin): task 2 — scene: sky gradient, hills, trees, water layers, shimmer"
```

---

### Task 3: Fishing rod, bezier line, cast mechanic

**Files:**
- Modify: `gone-fishin.html` — add rod drawing, line physics, cast input

**Key physics:** The fishing line uses a quadratic bezier curve. The control point droops below the straight line between rod tip and lure — the droop amount decreases as tension increases during reel. During cast animation the lure arcs through the air before splashing.

- [ ] **Step 1: Add rod drawing and line/lure rendering (replace `drawLine` stub)**

```js
function drawRod() {
  ctx.save();
  ctx.strokeStyle = '#3d1f00';
  ctx.lineWidth   = 4;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(ROD_BASE.x, ROD_BASE.y);
  ctx.lineTo(ROD_TIP.x,  ROD_TIP.y);
  ctx.stroke();
  // Highlight
  ctx.strokeStyle = 'rgba(255,180,80,0.2)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawLine(now) {
  ctx.save();
  drawRod();

  if (state === 'casting' && !lure.inWater) {
    ctx.restore();
    return; // line goes taut during mid-air; skip droop
  }

  // Control point droops proportional to inverse tension
  const droop  = state === 'reeling' ? lerp(60, 5, tension / 100) : 50;
  const midX   = (ROD_TIP.x + lure.x) / 2;
  const midY   = (ROD_TIP.y + lure.y) / 2 + droop;

  ctx.strokeStyle = 'rgba(220,200,160,0.8)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
  ctx.quadraticCurveTo(midX, midY, lure.x, lure.y);
  ctx.stroke();

  // Bobber (only when lure is in water and not reeling)
  if (lure.inWater && state !== 'reeling') {
    const bob = state === 'biting'
      ? Math.sin(now / 60) * 8   // sharp dip
      : Math.sin(now / 800) * 2; // gentle float
    const ly = WATER_Y + bob;
    // White bottom half
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath(); ctx.arc(lure.x, ly, 6, 0, Math.PI); ctx.fill();
    // Red top half
    ctx.fillStyle = '#e03020';
    ctx.beginPath(); ctx.arc(lure.x, ly, 6, Math.PI, 0); ctx.fill();
    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(lure.x, ly, 6, 0, Math.PI * 2); ctx.stroke();
  } else if (state === 'reeling' && hookedFish) {
    // Lure is below surface with fish
    ctx.fillStyle = 'rgba(200,180,80,0.7)';
    ctx.beginPath(); ctx.arc(lure.x, lure.y, 4, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}
```

- [ ] **Step 2: Add cast mechanic — power charge on hold, release launches lure**

```js
// Add to game state section:
let castAnim = null; // { t: 0-1, startX, startY, endX, endY, peakX, peakY }

// Cast: power bar fills on hold (0→1 over 1.5s), release launches
canvas.addEventListener('touchstart', onHoldStart, { passive: false });
canvas.addEventListener('mousedown',  onHoldStart);
canvas.addEventListener('touchend',   onHoldEnd,   { passive: false });
canvas.addEventListener('mouseup',    onHoldEnd);

function onHoldStart(e) {
  if (state !== 'casting') return;
  castHeld  = true;
  castPower = 0;
}

function onHoldEnd(e) {
  if (state !== 'casting' || !castHeld) return;
  castHeld = false;
  launchCast();
}

function launchCast() {
  // Map power (0-1) to lure landing x and depth
  const power  = castPower;
  const endX   = lerp(80, 310, power);
  const endY   = WATER_Y; // splashes at surface
  const peakY  = lerp(WATER_Y - 60, WATER_Y - 180, power);
  castAnim = { t: 0, startX: ROD_TIP.x, startY: ROD_TIP.y, endX, endY, peakX: lerp(ROD_TIP.x, endX, 0.6), peakY };
  lure.inWater = false;
  // Target depth based on power
  lure.targetY = WATER_Y + lerp(20, 370, power);
  lure.targetX = endX;
  state = 'waiting'; // transition immediately; lure sinks after splash
  // playCast() added in Task 7
}

// Update cast power in game loop — add to loop() before drawing:
function updateCast(dt) {
  if (castHeld && state === 'casting') {
    castPower = Math.min(1, castPower + dt / 1.5);
  }
  if (castAnim) {
    castAnim.t = Math.min(1, castAnim.t + dt / 0.55);
    const t = castAnim.t;
    // Quadratic bezier arc in air
    lure.x = lerp(lerp(castAnim.startX, castAnim.peakX, t), lerp(castAnim.peakX, castAnim.endX, t), t);
    lure.y = lerp(lerp(castAnim.startY, castAnim.peakY, t), lerp(castAnim.peakY, castAnim.endY, t), t);
    if (castAnim.t >= 1) {
      castAnim   = null;
      lure.inWater = true;
      // addRipple(lure.x, WATER_Y) added in Task 8
    }
  } else if (lure.inWater && lure.y < lure.targetY) {
    // Lure sinks to target depth
    lure.y = Math.min(lure.targetY, lure.y + 120 * dt);
  }
}
```

- [ ] **Step 3: Wire `updateCast(dt)` into the loop — add `updateCast(dt)` at the top of the `loop` function's update block (when `state !== 'title' && state !== 'gameover'`)**

- [ ] **Step 4: Add power bar draw to HUD section (call from loop after drawHUD)**

```js
function drawPowerBar(now) {
  if (!castHeld || state !== 'casting') return;
  ctx.save();
  const bx = W/2 - 70, by = H - 60, bw = 140, bh = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
  const barColor = castPower > 0.8 ? '#e05030' : castPower > 0.5 ? '#e0a030' : '#50c050';
  ctx.fillStyle = barColor;
  ctx.beginPath(); ctx.roundRect(bx, by, bw * castPower, bh, 4); ctx.fill();
  ctx.fillStyle = '#E8DCC8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('HOLD TO CAST', W/2, by - 6);
  ctx.restore();
}
```

- [ ] **Step 5: Verify in browser — hold to charge power bar, release casts lure in arc, sinks to depth**

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(gone-fishin): task 3 — rod drawing, bezier line, cast mechanic"
```

---

### Task 4: Fish behavior system — spawning, states, swimming, reactions

**Files:**
- Modify: `gone-fishin.html` — replace `drawFish` stub, add fish update logic

**Fish states:** `idle` (sinusoidal swimming) → `attracted` (steering toward lure) → `biting` (approaching lure to bite) → `spooked` (fleeing rapidly). Fish scatter if lure splashes within 80px. Bold trait controls how quickly fish commit to bite.

- [ ] **Step 1: Add fish data structure and spawner**

```js
let nextSpawnTime = 0;

function spawnFish(now) {
  if (fish.length >= 6 || now < nextSpawnTime) return;
  nextSpawnTime = now + 4000 + Math.random() * 4000;

  // Pick type by rarity
  const roll = Math.random();
  let cumulative = 0;
  let type = FISH_TYPES[0];
  for (const ft of FISH_TYPES) {
    cumulative += ft.rarity;
    if (roll < cumulative) { type = ft; break; }
  }

  const dir = Math.random() < 0.5 ? 1 : -1;
  const startX = dir === 1 ? -type.w : W + type.w;
  const y = type.depthMin + Math.random() * (type.depthMax - type.depthMin);

  fish.push({
    type,
    x: startX, y,
    baseY: y,
    dir,
    speed: type.speed * (0.8 + Math.random() * 0.4),
    phase: Math.random() * Math.PI * 2,
    state: 'idle',       // idle | attracted | biting | spooked
    biteCharge: 0,       // 0→1 build-up before actual bite triggers
    spookedUntil: 0,
  });
}
```

- [ ] **Step 2: Add fish update function**

```js
function updateFish(dt, now) {
  spawnFish(now);

  for (const f of fish) {
    // Spooked: flee fast
    if (f.state === 'spooked') {
      f.x += f.dir * f.speed * 3.5 * dt;
      continue;
    }

    // Attraction check — only when lure is in water and not reeling
    if (lure.inWater && state === 'waiting') {
      const d = dist({ x: f.x, y: f.y }, { x: lure.x, y: lure.y });
      if (d < 80 && f.state === 'idle') f.state = 'attracted';
      if (d > 120 && f.state === 'attracted') f.state = 'idle';
    } else if (state !== 'biting' && state !== 'reeling') {
      if (f.state === 'attracted' || f.state === 'biting') f.state = 'idle';
    }

    if (f.state === 'attracted' || f.state === 'biting') {
      // Steer toward lure
      const dx = lure.x - f.x, dy = lure.y - f.y;
      const d  = Math.hypot(dx, dy) || 1;
      const steerSpeed = f.type.bold * f.speed * 1.4;
      f.x += (dx / d) * steerSpeed * dt;
      f.y += (dy / d) * steerSpeed * dt;
      f.dir = dx > 0 ? 1 : -1;

      // Build bite charge
      if (d < 30) {
        f.biteCharge += dt * f.type.bold;
        if (f.biteCharge >= 1.0 && state === 'waiting') {
          f.state = 'biting';
          state = 'biting';
          biteTimer = now + 600; // player has 600ms to hook
          // playNibble() added in Task 7
        }
      }
    } else {
      // Idle: sinusoidal swim
      f.x += f.dir * f.speed * dt;
      f.y = f.baseY + Math.sin(now / 700 + f.phase) * 12;
    }
  }

  // Remove fish that swam off screen or are done
  fish = fish.filter(f => f.x > -100 && f.x < W + 100);
}
```

- [ ] **Step 3: Replace `drawFish` stub**

```js
function drawFish(now) {
  ctx.save();
  for (const f of fish) {
    if (f === hookedFish) continue; // hooked fish drawn separately during reel
    const alpha = f.state === 'spooked' ? 0.4 : 0.75;
    ctx.globalAlpha = alpha;
    const col = f.y < WATER_Y + 120 ? '#2a5a6a' : f.y < WATER_Y + 240 ? '#1a3a50' : '#0f2030';
    ctx.fillStyle = col;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.dir, 1);
    // Body oval
    ctx.beginPath();
    ctx.ellipse(0, 0, f.type.w / 2, f.type.w * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail fin
    ctx.beginPath();
    ctx.moveTo(-f.type.w * 0.42, 0);
    ctx.lineTo(-f.type.w * 0.72, -f.type.w * 0.22);
    ctx.lineTo(-f.type.w * 0.72,  f.type.w * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
```

- [ ] **Step 4: Wire `updateFish(dt, now)` into loop (in the playing state update block)**

- [ ] **Step 5: Verify — fish spawn, swim, approach lure when cast near them, scatter on splash (scatter hook up in Task 5)**

- [ ] **Step 6: Commit**
```bash
git commit -m "feat(gone-fishin): task 4 — fish behavior system: states, spawning, attraction, biting"
```

---

### Task 5: Hook & reel mechanic — bite window, tension meter, catch/break/escape

**Files:**
- Modify: `gone-fishin.html` — expand input handling, add reel update, tension meter

- [ ] **Step 1: Add hook tap detection to `onTap`**

In `onTap`, replace the playing state section:
```js
if (state === 'biting') {
  // Hook it
  const biting = fish.find(f => f.state === 'biting');
  if (biting) {
    hookedFish = biting;
    biting.state = 'hooked';
    state = 'reeling';
    tension = 20;
    // playHook() added in Task 7
  }
  return;
}
```

- [ ] **Step 2: Add missed bite handling — in `updateFish`, after biteTimer expires**

In the main loop update block (not in updateFish), add:
```js
if (state === 'biting' && now > biteTimer) {
  // Missed — fish escapes
  const biting = fish.find(f => f.state === 'biting');
  if (biting) { biting.state = 'idle'; biting.biteCharge = 0; }
  state = 'casting';
  lure.inWater = false;
  lure.x = ROD_TIP.x; lure.y = ROD_TIP.y;
}
```

- [ ] **Step 3: Add reel hold/release input — detect hold during reeling**

```js
let reelHeld = false;
canvas.addEventListener('touchstart', e => { if (state === 'reeling') { e.preventDefault(); reelHeld = true; } }, { passive: false });
canvas.addEventListener('mousedown',  () => { if (state === 'reeling') reelHeld = true; });
canvas.addEventListener('touchend',   () => { reelHeld = false; });
canvas.addEventListener('mouseup',    () => { reelHeld = false; });
```

- [ ] **Step 4: Add reel update function**

```js
let fightTimer = 0;

function updateReel(dt, now) {
  if (state !== 'reeling' || !hookedFish) return;

  // Reel in or rest
  if (reelHeld) {
    tension += 15 * dt;
    // Move lure toward surface
    lure.y = Math.max(WATER_Y + 10, lure.y - 60 * dt);
    lure.x = lerp(lure.x, W / 2, dt * 0.5);
    // playReelTick if enough movement — handled in Task 7
  } else {
    tension -= 20 * dt;
  }

  // Fish fight events
  if (now > fightTimer) {
    fightTimer = now + 1200 + Math.random() * 1200;
    tension += 25;
  }

  tension = clamp(tension, 0, 100);

  // Line breaks
  if (tension >= 100) {
    hookedFish.state = 'idle';
    hookedFish.biteCharge = 0;
    hookedFish = null;
    state = 'casting';
    lure.inWater = false;
    lure.x = ROD_TIP.x; lure.y = ROD_TIP.y;
    // playLineBreak() added in Task 7
    return;
  }

  // Fish reaches surface — caught!
  if (lure.y <= WATER_Y + 15) {
    catchFish(now);
  }
}

function catchFish(now) {
  const pts = hookedFish.type.pts;
  score     += pts;
  fishCount++;
  // addPopup, addRipple, playCatch — wired in Tasks 7/8
  fish = fish.filter(f => f !== hookedFish);
  hookedFish = null;
  state = 'casting';
  lure.inWater = false;
  lure.x = ROD_TIP.x; lure.y = ROD_TIP.y;
}
```

- [ ] **Step 5: Wire `updateReel(dt, now)` into loop**

- [ ] **Step 6: Add scatter on splash — in `launchCast()` after setting state='waiting'**
```js
for (const f of fish) {
  if (dist({ x: lure.targetX, y: WATER_Y }, { x: f.x, y: f.y }) < 80) {
    f.state = 'spooked';
    f.spookedUntil = performance.now() + 2000;
    setTimeout(() => { if (f.state === 'spooked') f.state = 'idle'; }, 2000);
  }
}
```

- [ ] **Step 7: Verify — full loop works: cast → wait → bite → hook → reel → catch/break**

- [ ] **Step 8: Commit**
```bash
git commit -m "feat(gone-fishin): task 5 — hook bite window, reel mechanic, tension, catch/break"
```

---

### Task 6: Web Audio — chord progression loop, water ambience, event sounds

**Files:**
- Modify: `gone-fishin.html` — add full audio section before game state

**This is the key audio innovation:** The background music is a pre-composed G–C–D–G fingerpicked chord progression. Each bar schedules 8 triangle-wave notes at exact eighth-note intervals. Bass notes (even positions) are louder than upper chord tones (odd positions) — this creates a genuine boom-chick country feel, not random notes.

- [ ] **Step 1: Add AudioContext and masterGain**

```js
const AC = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = AC.createGain();
masterGain.connect(AC.destination);
masterGain.gain.setValueAtTime(1.0, AC.currentTime);

async function ensureAudio() {
  if (AC.state === 'suspended') await AC.resume();
}
canvas.addEventListener('touchstart', () => ensureAudio(), { once: true });
canvas.addEventListener('click',      () => ensureAudio(), { once: true });
```

- [ ] **Step 2: Add guitar note scheduler and chord progression loop**

```js
function scheduleGuitarNote(freq, t, gain) {
  const osc    = AC.createOscillator();
  const filter = AC.createBiquadFilter();
  const g      = AC.createGain();
  osc.connect(filter); filter.connect(g); g.connect(masterGain);
  osc.type = 'triangle';
  filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 0.8;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  osc.start(t); osc.stop(t + 0.32);
}

function scheduleChordBar(barNotes, barStartSec) {
  const e = (BEAT_MS / 1000) / 2; // seconds per eighth note
  barNotes.forEach((freq, i) => {
    const gain = i % 2 === 0 ? 0.28 : 0.14; // bass louder than melody
    scheduleGuitarNote(freq, barStartSec + i * e, gain);
  });
}

let nextBarTime = 0;
let beatTimer   = null;
let barIndex    = 0;

function startBeat() {
  masterGain.gain.cancelScheduledValues(AC.currentTime);
  masterGain.gain.setValueAtTime(1.0, AC.currentTime);
  nextBarTime = AC.currentTime + 0.05;
  barIndex    = 0;
  function tick() {
    const barDuration = (BEAT_MS / 1000) * 4; // 4 beats per bar
    while (nextBarTime < AC.currentTime + 2.0) {
      scheduleChordBar(CHORD_BARS[barIndex % CHORD_BARS.length], nextBarTime);
      nextBarTime += barDuration;
      barIndex++;
    }
    beatTimer = setTimeout(tick, 500);
  }
  tick();
  startWaterAmbience();
}

function stopBeat() {
  clearTimeout(beatTimer);
  beatTimer = null;
  masterGain.gain.cancelScheduledValues(AC.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, AC.currentTime + 0.15);
  setTimeout(() => masterGain.gain.setValueAtTime(1.0, AC.currentTime), 300);
  stopWaterAmbience();
}
```

- [ ] **Step 3: Add water ambience (continuous noise layers)**

```js
let waterNodes = null;

function startWaterAmbience() {
  if (waterNodes) return;
  const len    = AC.sampleRate * 2;
  const buf    = AC.createBuffer(1, len, AC.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  // Low rumble
  const rumble = AC.createBufferSource();
  const lpf    = AC.createBiquadFilter();
  const gRumble = AC.createGain();
  rumble.buffer = buf; rumble.loop = true;
  lpf.type = 'lowpass'; lpf.frequency.value = 80;
  gRumble.gain.value = 0.06;
  rumble.connect(lpf); lpf.connect(gRumble); gRumble.connect(masterGain);
  rumble.start();

  // Surface wash
  const wash  = AC.createBufferSource();
  const bpf   = AC.createBiquadFilter();
  const gWash = AC.createGain();
  wash.buffer = buf; wash.loop = true;
  bpf.type = 'bandpass'; bpf.frequency.value = 400; bpf.Q.value = 0.3;
  gWash.gain.value = 0.04;
  wash.connect(bpf); bpf.connect(gWash); gWash.connect(masterGain);
  wash.start();

  waterNodes = [rumble, wash];
}

function stopWaterAmbience() {
  if (!waterNodes) return;
  waterNodes.forEach(n => { try { n.stop(); } catch(e){} });
  waterNodes = null;
}
```

- [ ] **Step 4: Add event sounds**

```js
function playCast() {
  // Whoosh sweep
  const noise = AC.createBufferSource();
  const len   = Math.floor(AC.sampleRate * 0.25);
  const buf   = AC.createBuffer(1, len, AC.sampleRate);
  const data  = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const bpf = AC.createBiquadFilter();
  const g   = AC.createGain();
  noise.buffer = buf;
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(800, AC.currentTime);
  bpf.frequency.exponentialRampToValueAtTime(200, AC.currentTime + 0.25);
  g.gain.setValueAtTime(0.12, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.25);
  noise.connect(bpf); bpf.connect(g); g.connect(masterGain);
  noise.start(); noise.stop(AC.currentTime + 0.25);
}

function playSplash() {
  const len  = Math.floor(AC.sampleRate * 0.15);
  const buf  = AC.createBuffer(1, len, AC.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = AC.createBufferSource();
  const lpf   = AC.createBiquadFilter();
  const g     = AC.createGain();
  noise.buffer = buf;
  lpf.type = 'lowpass'; lpf.frequency.value = 400;
  g.gain.setValueAtTime(0.18, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.15);
  noise.connect(lpf); lpf.connect(g); g.connect(masterGain);
  noise.start(); noise.stop(AC.currentTime + 0.15);
}

function playNibble() {
  const osc = AC.createOscillator(); const g = AC.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.frequency.value = 520; osc.type = 'sine';
  g.gain.setValueAtTime(0.08, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.08);
  osc.start(); osc.stop(AC.currentTime + 0.08);
}

function playHook() {
  const osc = AC.createOscillator(); const g = AC.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, AC.currentTime);
  osc.frequency.exponentialRampToValueAtTime(280, AC.currentTime + 0.12);
  g.gain.setValueAtTime(0.2, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.12);
  osc.start(); osc.stop(AC.currentTime + 0.12);
}

function playCatch() {
  // Ascending arpeggio: G4 B4 D5 G5
  [392, 494, 587, 784].forEach((freq, i) => {
    const t = AC.currentTime + i * 0.09;
    const osc = AC.createOscillator(); const g = AC.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'triangle'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.start(t); osc.stop(t + 0.28);
  });
}

function playLineBreak() {
  const osc = AC.createOscillator(); const g = AC.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.type = 'square'; osc.frequency.value = 120;
  g.gain.setValueAtTime(0.15, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.2);
  osc.start(); osc.stop(AC.currentTime + 0.2);
}
```

- [ ] **Step 5: Wire audio calls into existing functions**

In `startGame()`: add `await ensureAudio(); startBeat();` (make `startGame` async)

In `endGame()`: add `stopBeat();`

In `launchCast()`: add `playCast(); setTimeout(playSplash, 400);`

In the biting trigger (where biteTimer is set): add `playNibble();`

In `onTap` hook section: add `playHook();`

In `catchFish()`: add `playCatch();`

In reel update line-break section: add `playLineBreak();`

- [ ] **Step 6: Verify — chord progression plays and actually sounds like a song (G-C-D-G loop). Water ambience audible. Event sounds fire correctly.**

- [ ] **Step 7: Commit**
```bash
git commit -m "feat(gone-fishin): task 6 — web audio: G-C-D-G chord loop, water ambience, event sounds"
```

---

### Task 7: Particles & visual effects — ripples, catch burst, popups

**Files:**
- Modify: `gone-fishin.html` — add particle/ripple/popup systems

- [ ] **Step 1: Add ripple system**

```js
// ripples: [{x, y, born, maxR}]
function addRipple(x, y, maxR = 40) {
  ripples.push({ x, y, born: performance.now(), maxR });
}

function updateRipples(now) {
  ripples = ripples.filter(r => now - r.born < 800);
}

function drawRipples(now) {
  ctx.save();
  for (const r of ripples) {
    const age   = (now - r.born) / 800;
    const radius = r.maxR * age;
    ctx.globalAlpha = (1 - age) * 0.5;
    ctx.strokeStyle = 'rgba(255,220,120,0.8)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(r.x, WATER_Y, radius, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
```

- [ ] **Step 2: Add particle burst system**

```js
function addBurst(x, y, count, color) {
  const now = performance.now();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 60 + Math.random() * 100;
    particles.push({
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 40,
      r: 2 + Math.random() * 3, color, born: now, life: 0.7,
    });
  }
}

function updateParticles(dt, now) {
  particles = particles.filter(p => now - p.born < p.life * 1000);
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 120 * dt; // gravity
  }
}

function drawParticles(now) {
  ctx.save();
  for (const p of particles) {
    const age = (now - p.born) / (p.life * 1000);
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle   = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - age * 0.4), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
```

- [ ] **Step 3: Add floating text popup system**

```js
function addPopup(text, x, y, color) {
  popups.push({ text, x, y, color, born: performance.now(), life: 1200 });
}

function updatePopups(now) {
  popups = popups.filter(p => now - p.born < p.life);
}

function drawPopups(now) {
  ctx.save();
  for (const p of popups) {
    const age   = (now - p.born) / p.life;
    const alpha = age < 0.6 ? 1 : 1 - (age - 0.6) / 0.4;
    ctx.globalAlpha  = alpha;
    ctx.fillStyle    = p.color;
    ctx.shadowColor  = p.color; ctx.shadowBlur = 8;
    ctx.font         = 'bold 15px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, p.x, p.y - age * 40);
  }
  ctx.restore();
}
```

- [ ] **Step 4: Wire effects into game events**

In `launchCast()` after `castAnim = null` check (when lure hits water): call `addRipple(lure.x, WATER_Y)` — add inside the `castAnim.t >= 1` block in `updateCast`.

In `catchFish()`: 
```js
addBurst(lure.x, WATER_Y, 14, '#5af');
addRipple(lure.x, WATER_Y, 60);
addPopup(`${hookedFish.type.name}  +${hookedFish.type.pts}`, lure.x, WATER_Y - 20, '#FFD700');
```

- [ ] **Step 5: Wire update calls into loop (in playing state block)**

```js
updateRipples(now);
updateParticles(dt, now);
updatePopups(now);
```

- [ ] **Step 6: Wire draw calls into loop (after drawFish, before HUD)**

```js
drawRipples(now);
drawParticles(now);
drawPopups(now);
```

- [ ] **Step 7: Verify — ripple appears on splash, burst + popup appears on catch**

- [ ] **Step 8: Commit**
```bash
git commit -m "feat(gone-fishin): task 7 — ripples, particle bursts, floating score popups"
```

---

### Task 8: HUD — score, timer, tension bar during reel

**Files:**
- Modify: `gone-fishin.html` — replace `drawHUD` stub

- [ ] **Step 1: Replace `drawHUD` stub**

```js
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function drawHUD(now) {
  if (state === 'title' || state === 'gameover') return;
  ctx.save();

  // Score pill — top left
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 8, 8, 130, 28, 8); ctx.fill();
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`🐟 ${score.toLocaleString()} pts`, 16, 22);

  // Timer — top right
  const mins  = Math.floor(timeLeft / 60);
  const secs  = String(timeLeft % 60).padStart(2, '0');
  const timerColor = timeLeft <= 10 ? '#e05030' : '#E8DCC8';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W - 80, 8, 72, 28, 8); ctx.fill();
  ctx.fillStyle = timerColor; ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right'; ctx.fillText(`${mins}:${secs}`, W - 12, 22);

  // Tension bar — bottom strip during reel
  if (state === 'reeling') {
    const bx = 20, by = H - 44, bw = W - 40, bh = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, bx, by, bw, bh, 6); ctx.fill();
    const t = tension / 100;
    const barColor = t > 0.8 ? '#e04020' : t > 0.5 ? '#e0a020' : '#40c060';
    ctx.fillStyle = barColor;
    roundRect(ctx, bx, by, bw * t, bh, 6); ctx.fill();
    ctx.fillStyle = '#E8DCC8'; ctx.font = '10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TENSION', W / 2, by + bh / 2);

    // Danger flash
    if (t > 0.85) {
      ctx.fillStyle = `rgba(200,40,20,${0.12 * Math.sin(now / 80)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Cast instructions
  if (state === 'casting' && !castHeld) {
    ctx.fillStyle = 'rgba(255,220,150,0.55)'; ctx.font = '13px Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('Hold to cast', W / 2, H - 20);
  }

  if (state === 'biting') {
    const pulse = 0.7 + 0.3 * Math.sin(now / 80);
    ctx.globalAlpha  = pulse;
    ctx.fillStyle    = '#FFD700'; ctx.font = 'bold 22px Georgia,serif';
    ctx.shadowColor  = '#FFD700'; ctx.shadowBlur = 20;
    ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TAP!', W / 2, H / 2);
  }

  ctx.restore();
  drawPowerBar(now);
}
```

- [ ] **Step 2: Verify — score and timer visible, tension bar appears during reel, TAP prompt on bite, danger flash when tension high**

- [ ] **Step 3: Commit**
```bash
git commit -m "feat(gone-fishin): task 8 — HUD: score, timer, tension bar, cast/bite prompts"
```

---

### Task 9: Title and game over screens, feedback form, localStorage

**Files:**
- Modify: `gone-fishin.html` — replace `drawTitle` and `drawGameOver` stubs, add feedback overlay HTML and JS

- [ ] **Step 1: Replace `drawTitle` stub**

```js
function drawTitle(now) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,10,15,0.75)';
  ctx.fillRect(0, 0, W, H);

  // Gently bobbing lure preview on title
  const bob = Math.sin(now / 900) * 3;
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath(); ctx.arc(W/2, WATER_Y + bob, 7, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#e03020';
  ctx.beginPath(); ctx.arc(W/2, WATER_Y + bob, 7, Math.PI, 0); ctx.fill();

  // Title
  ctx.fillStyle   = '#FFD700'; ctx.font = 'bold 48px Georgia,serif';
  ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
  ctx.fillText("Gone Fishin'", W/2, H/2 - 80);

  // Pulsing tap prompt
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 580);
  ctx.fillStyle   = '#A09070'; ctx.font = '18px Georgia,serif';
  ctx.fillText('Tap to start', W/2, H/2 - 14);
  ctx.globalAlpha = 1;

  if (bestScore > 0) {
    ctx.fillStyle = '#70584a'; ctx.font = '13px sans-serif';
    ctx.fillText('Best: ' + bestScore.toLocaleString() + ' pts', W/2, H/2 + 22);
  }

  ctx.fillStyle = '#333'; ctx.font = '12px sans-serif';
  ctx.fillText('Hold to cast · Tap to hook · Hold to reel', W/2, H/2 + 55);

  ctx.restore();
}
```

- [ ] **Step 2: Replace `drawGameOver` stub**

```js
function drawGameOver(now) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,10,15,0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  ctx.fillStyle = '#E8DCC8'; ctx.font = 'bold 36px Georgia,serif';
  ctx.fillText('GAME OVER', W/2, H/2 - 120);

  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(score.toLocaleString() + ' pts', W/2, H/2 - 74);

  ctx.fillStyle = '#70584a'; ctx.font = '14px sans-serif';
  ctx.fillText(`Fish caught: ${fishCount}`, W/2, H/2 - 42);

  if (score > 0 && score >= bestScore) {
    const pulse = 0.75 + 0.25 * Math.sin(now / 180);
    ctx.globalAlpha = pulse; ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px sans-serif'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
    ctx.fillText('NEW RECORD!', W/2, H/2 - 14);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  ctx.fillStyle = '#907860'; ctx.font = '13px sans-serif';
  ctx.fillText('Best: ' + bestScore.toLocaleString() + ' pts', W/2, H/2 + 8);

  // Play Again button
  ctx.fillStyle = '#FFD700';
  roundRect(ctx, W/2-80, H/2+28, 160, 44, 10); ctx.fill();
  ctx.fillStyle = '#0d0608'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Play Again', W/2, H/2 + 50);

  // Feedback button
  ctx.fillStyle = 'rgba(255,215,0,0.1)';
  roundRect(ctx, W/2-105, H/2+86, 210, 36, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#907860'; ctx.font = '13px sans-serif';
  ctx.fillText('Tell Us What You Think 🤠', W/2, H/2 + 104);

  ctx.restore();
}
```

- [ ] **Step 3: Add feedback overlay HTML (inside `#wrap` div)**

```html
<div id="feedback-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%;
  flex-direction:column; align-items:center; justify-content:center; gap:14px;
  background:rgba(10,4,8,0.97); border:2px solid #FFD700; box-sizing:border-box; padding:28px; z-index:10;">
  <h2 style="color:#FFD700; font-family:serif; font-size:22px; margin:0; text-align:center;">Tell Us What You Think 🤠</h2>
  <div id="stars" style="display:flex; gap:10px; font-size:34px; cursor:pointer; user-select:none;">
    <span data-v="1" style="color:rgba(255,215,0,0.4)">☆</span>
    <span data-v="2" style="color:rgba(255,215,0,0.4)">☆</span>
    <span data-v="3" style="color:rgba(255,215,0,0.4)">☆</span>
    <span data-v="4" style="color:rgba(255,215,0,0.4)">☆</span>
    <span data-v="5" style="color:rgba(255,215,0,0.4)">☆</span>
  </div>
  <textarea id="fb-text" rows="4" placeholder="What worked? What could be better?"
    style="width:100%; max-width:300px; background:#1a0a06; color:#E8DCC8; border:1px solid #555;
    border-radius:6px; padding:10px; font-size:14px; resize:none; font-family:sans-serif;"></textarea>
  <button id="fb-submit" style="background:#FFD700; color:#0d0608; font-weight:bold; font-size:16px;
    padding:10px 36px; border:none; border-radius:8px; cursor:pointer;">Submit</button>
  <button id="fb-cancel" style="background:none; border:none; color:#A09070; font-size:14px;
    cursor:pointer; text-decoration:underline;">Cancel</button>
  <p id="fb-status" style="color:#A09070; font-size:13px; min-height:18px; margin:0; text-align:center;"></p>
</div>
```

- [ ] **Step 4: Add feedback form JS**

```js
const feedbackOverlay = document.getElementById('feedback-overlay');
const starSpans       = document.querySelectorAll('#stars span');
const fbText          = document.getElementById('fb-text');
const fbStatus        = document.getElementById('fb-status');
const fbSubmitBtn     = document.getElementById('fb-submit');
let fbRating = 0;

starSpans.forEach(span => {
  span.addEventListener('click', () => {
    fbRating = parseInt(span.dataset.v, 10);
    starSpans.forEach(s => {
      const v = parseInt(s.dataset.v, 10);
      s.textContent = v <= fbRating ? '★' : '☆';
      s.style.color = v <= fbRating ? '#FFD700' : 'rgba(255,215,0,0.4)';
    });
  });
});

document.getElementById('fb-cancel').addEventListener('click', () => feedbackOverlay.style.display = 'none');
fbSubmitBtn.addEventListener('click', async () => {
  if (fbRating === 0) { fbStatus.textContent = 'Please pick a star rating.'; return; }
  fbStatus.textContent = 'Sending…'; fbSubmitBtn.disabled = true;
  try {
    const res = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ game: "Gone Fishin'", rating: fbRating,
        feedback: fbText.value, score, fish_count: fishCount }),
    });
    if (res.ok) { fbStatus.textContent = 'Thanks! 🤠'; setTimeout(() => feedbackOverlay.style.display = 'none', 1500); }
    else throw new Error();
  } catch {
    fbStatus.textContent = "Couldn't send — try again.";
    fbSubmitBtn.textContent = 'Retry'; fbSubmitBtn.disabled = false;
  }
});
```

- [ ] **Step 5: Wire feedback button in `onTap` game over section**

```js
if (state === 'gameover') {
  if (x > W/2-80 && x < W/2+80 && y > H/2+28 && y < H/2+72) { startGame(); return; }
  if (x > W/2-105 && x < W/2+105 && y > H/2+86 && y < H/2+122) {
    fbRating = 0; fbText.value = ''; fbStatus.textContent = '';
    fbSubmitBtn.textContent = 'Submit'; fbSubmitBtn.disabled = false;
    starSpans.forEach(s => { s.textContent = '☆'; s.style.color = 'rgba(255,215,0,0.4)'; });
    feedbackOverlay.style.display = 'flex';
  }
  return;
}
```

- [ ] **Step 6: Verify — title screen animates, game over shows score + fish count, feedback form submits**

- [ ] **Step 7: Commit**
```bash
git commit -m "feat(gone-fishin): task 9 — title/gameover screens, feedback form, localStorage"
```

---

### Task 10: Final polish — draw order, timing, full play-through verification

**Files:**
- Modify: `gone-fishin.html` — fix draw order, wire any missing connections, full test

- [ ] **Step 1: Audit draw order in `loop` — correct order is:**
```
clearRect
drawScene       ← sky, water, trees
drawRipples     ← water surface effects
drawFish        ← underwater fish
drawLine        ← rod, bezier line, bobber
drawParticles   ← over everything
drawPopups      ← floating text
drawHUD         ← UI overlay
drawTitle / drawGameOver  ← full-screen overlays
```

- [ ] **Step 2: Verify all pre-empted failure modes (from top of plan)**
  - Every drawX is wrapped in ctx.save/restore ✓
  - No state mutation inside any draw function ✓
  - startGame() resets every stateful variable ✓
  - ctx.filter (if used) reset after ctx.restore ✓
  - startBeat() cancels/resets gain before scheduling ✓
  - stopBeat() ramps gain to 0 ✓

- [ ] **Step 3: Full play-through test**
  - Title screen → tap → cast charges → release → lure arcs, splashes, sinks
  - Fish spawn, swim, approach lure
  - Fish bites → TAP prompt → tap → hooked
  - Reel in → tension rises/falls → catch or break
  - Timer counts down → game over → Play Again works
  - Music plays throughout and sounds like a G-C-D-G country loop
  - Water ambience audible
  - Personal best saves and displays

- [ ] **Step 4: Final commit**
```bash
git commit -m "feat(gone-fishin): task 10 — draw order, wiring audit, full play-through verified"
```

---

### Task 11: Add to website and update index

**Files:**
- Modify: `index.html` — add Gone Fishin' as Game 04
- Modify: `docs/game-dev-knowledge/index.md` — add row

- [ ] **Step 1: Add game card to index.html (above Honky Tonk card)**

```html
<a class="game-card" href="gone-fishin.html">
  <div class="game-card-info">
    <div class="game-num">Game 04</div>
    <div class="game-title">Gone Fishin'</div>
    <div class="game-desc">Cast your line, wait for the bite</div>
  </div>
  <div class="play-btn">Play</div>
</a>
```

- [ ] **Step 2: Update game-dev-knowledge index**

- [ ] **Step 3: Commit and push**
```bash
git add gone-fishin.html index.html docs/game-dev-knowledge/index.md
git commit -m "feat: add Gone Fishin' (game 04) to site"
git push
```

---

### Task 12: Retrospective

Follow the same format as `docs/game-dev-knowledge/retrospectives/01-honky-tonk.md`.

Cover:
- What went well
- What caused friction  
- Bugs caught by review
- Action items for Game 05
- Updated rules for knowledge base

Save to: `docs/game-dev-knowledge/retrospectives/02-gone-fishin.md`

Update: `docs/game-dev-knowledge/index.md` with retrospective link.

Commit: `git commit -m "docs: gone fishin retrospective and knowledge base update"`
Push.
