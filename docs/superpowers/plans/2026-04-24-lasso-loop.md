# Lasso Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `lasso-loop.html` — a precision timing browser game where a spinning lasso catches items drifting across a night sky.

**Architecture:** Single self-contained HTML file, all styles and JavaScript inline, no dependencies. Canvas 360×640 with responsive CSS scaling. State machine (`title` → `playing` → `gameover`) drives a `requestAnimationFrame` loop. All game objects are plain JS objects.

**Tech Stack:** HTML5 Canvas 2D API, vanilla JavaScript, `localStorage` for personal best.

---

### Task 1: HTML shell — full logic + stub renderers

**Files:**
- Create: `lasso-loop.html`

This task creates the entire file. All game logic is fully implemented here. Render functions for background, cowboy, lasso, and items are stubs that will be replaced in Tasks 2–4. HUD, title screen, game-over screen, input, and game loop are complete.

- [ ] **Step 1: Create `lasso-loop.html` with the content below**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Lasso Loop — Bob Davis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center;
           min-height: 100vh; overflow: hidden; }
    canvas { display: block; touch-action: manipulation; }
  </style>
</head>
<body>
<canvas id="c"></canvas>
<script>
// ── CONSTANTS ────────────────────────────────────────────────
const W = 360, H = 640;
const MUSIC_SRC = '';

// Lasso geometry
const LASSO_SPEED_START = 1.5;    // rad/s clockwise
const ROPE_LEN          = 180;    // px: rotation center → loop center
const RCX = W / 2;                // 180 — rotation center x
const RCY = 356;                  // rotation center y (cowboy raised hand level; ground is y=420)
const LOOP_RX = 22, LOOP_RY = 15; // lasso loop ellipse radii (px)

// Hit detection
const CATCH_RADIUS   = 36; // px — GOOD
const PERFECT_RADIUS = 20; // px — PERFECT (2× pts)

// Timing
const THROW_FREEZE_MS = 120; // ms lasso freezes on throw
const COOLDOWN_MS     = 600; // ms before next throw
const FEEDBACK_MS     = 800; // ms feedback text lives

// Items
const ITEM_SPEED_START = 60; // px/s horizontal drift at start
const MAX_ITEMS        = 4;
const MIN_ITEMS        = 2;

// Progression
const SPEED_UP_EVERY = 500;  // pts per speed step
const SPEED_FACTOR   = 1.08; // multiply speed per step

// ── CANVAS ───────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
canvas.width  = W;
canvas.height = H;

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width  = W * s + 'px';
  canvas.style.height = H * s + 'px';
}
window.addEventListener('resize', resize);
resize();

// ── MUSIC ────────────────────────────────────────────────────
const audio = document.createElement('audio');
if (MUSIC_SRC) { audio.src = MUSIC_SRC; audio.loop = true; }
let musicOn = false;
function toggleMusic() {
  if (!MUSIC_SRC) return;
  musicOn = !musicOn;
  musicOn ? audio.play() : audio.pause();
}

// ── LOCALSTORAGE ─────────────────────────────────────────────
let bestScore = 0;
function loadBest() { bestScore = parseInt(localStorage.getItem('lasso_loop_best') || '0', 10); }
function saveBest() {
  if (score > bestScore) { bestScore = score; localStorage.setItem('lasso_loop_best', bestScore); }
}

// ── GAME STATE ───────────────────────────────────────────────
let state = 'title'; // 'title' | 'playing' | 'gameover'
let score, lives, streak;
let lassoAngle, lassoSpeed, itemSpeed, nextSpeedAt;
let throwFreezeUntil, cooldownUntil;
let items, feedbacks;

// ── ITEM DEFINITIONS ─────────────────────────────────────────
const ITEM_DEFS = {
  pick:   { points: 50,  danger: false, emoji: null,  haloColor: 'rgba(255,180,30,0.15)' },
  shoe:   { points: 75,  danger: false, emoji: '🧲',  haloColor: 'rgba(150,100,255,0.12)' },
  cash:   { points: 100, danger: false, emoji: '💰',  haloColor: 'rgba(100,255,100,0.08)' },
  snake:  { points: 0,   danger: true,  emoji: '🐍',  haloColor: null },
  cactus: { points: 0,   danger: true,  emoji: '🌵',  haloColor: null },
};

// Weighted pool: ~36% pick, 21% shoe, 21% cash, 14% snake, 7% cactus
const SPAWN_POOL = [
  'pick','pick','pick','pick','pick',
  'shoe','shoe','shoe',
  'cash','cash','cash',
  'snake','snake',
  'cactus',
];

function streakMult() {
  if (streak >= 10) return 4;
  if (streak >= 6)  return 3;
  if (streak >= 3)  return 2;
  return 1;
}

// ── INIT ─────────────────────────────────────────────────────
function startGame() {
  score            = 0;
  lives            = 3;
  streak           = 0;
  lassoAngle       = -Math.PI / 2; // 12 o'clock
  lassoSpeed       = LASSO_SPEED_START;
  itemSpeed        = ITEM_SPEED_START;
  nextSpeedAt      = SPEED_UP_EVERY;
  throwFreezeUntil = 0;
  cooldownUntil    = 0;
  items            = [];
  feedbacks        = [];
  state            = 'playing';
}

// ── ITEM SPAWNING ─────────────────────────────────────────────
function spawnItem() {
  const type     = SPAWN_POOL[Math.floor(Math.random() * SPAWN_POOL.length)];
  const def      = ITEM_DEFS[type];
  const fromLeft = Math.random() < 0.5;
  const baseY    = 150 + Math.random() * 200; // items drift between y 150–350
  const speed    = itemSpeed + Math.random() * 20;
  items.push({
    type, ...def,
    x:            fromLeft ? -32 : W + 32,
    baseY, y:     baseY,
    vx:           fromLeft ? speed : -speed,
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleAmp:    12 + Math.random() * 18,
    wobbleFreq:   1.5 + Math.random() * 1.0, // rad/s → gentle sine bob
    age:          0,
  });
}

// ── LASSO POSITION ────────────────────────────────────────────
function loopCenter() {
  return {
    x: RCX + Math.cos(lassoAngle) * ROPE_LEN,
    y: RCY + Math.sin(lassoAngle) * ROPE_LEN,
  };
}

// ── FEEDBACK ─────────────────────────────────────────────────
function addFeedback(text, x, y, color) {
  feedbacks.push({ text, x, y, color, born: performance.now() });
}

// ── THROW + HIT DETECTION ─────────────────────────────────────
function handleThrow(now) {
  if (state !== 'playing') return;
  if (now < cooldownUntil) return;

  throwFreezeUntil = now + THROW_FREEZE_MS;
  cooldownUntil    = now + COOLDOWN_MS;

  const lc = loopCenter();

  let hit = null, hitDist = Infinity;
  for (const item of items) {
    const dx = item.x - lc.x, dy = item.y - lc.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < CATCH_RADIUS && d < hitDist) { hit = item; hitDist = d; }
  }

  if (hit) {
    items.splice(items.indexOf(hit), 1);
    if (hit.danger) {
      loseLife(lc.x, lc.y);
    } else {
      const perfect = hitDist < PERFECT_RADIUS;
      const pts     = hit.points * (perfect ? 2 : 1) * streakMult();
      score += pts;
      streak++;
      checkSpeedUp();
      addFeedback(perfect ? '★ PERFECT! ★' : 'GOOD', lc.x, lc.y - 20,
                  perfect ? '#FFD700' : '#4CAF50');
    }
  } else {
    streak = 0;
    loseLife(lc.x, lc.y);
  }
}

function loseLife(x, y) {
  lives--;
  addFeedback('MISS', x, y - 20, '#E74C3C');
  if (lives <= 0) { saveBest(); state = 'gameover'; }
}

function checkSpeedUp() {
  if (score >= nextSpeedAt) {
    lassoSpeed  *= SPEED_FACTOR;
    itemSpeed   *= SPEED_FACTOR;
    nextSpeedAt += SPEED_UP_EVERY;
  }
}

// ── UPDATE ────────────────────────────────────────────────────
function update(dt, now) {
  if (now >= throwFreezeUntil) {
    lassoAngle += lassoSpeed * dt;
    if (lassoAngle > Math.PI * 2) lassoAngle -= Math.PI * 2;
  }
  for (const item of items) {
    item.age += dt;
    item.x   += item.vx * dt;
    item.y    = item.baseY + Math.sin(item.wobbleOffset + item.age * item.wobbleFreq) * item.wobbleAmp;
  }
  items = items.filter(i => i.x > -64 && i.x < W + 64);
  while (items.length < MIN_ITEMS) spawnItem();
  if (items.length < MAX_ITEMS && Math.random() < dt * 0.5) spawnItem();
}

// ── DRAW STUBS (replaced in Tasks 2–4) ───────────────────────
function drawBackground() {
  ctx.fillStyle = '#050208';
  ctx.fillRect(0, 0, W, H);
}
function drawCowboy() { /* Task 3 */ }
function drawLasso()  { /* Task 3 */ }
function drawItems()  {
  // Placeholder: colored circles until Task 4
  for (const item of items) {
    ctx.fillStyle = item.danger ? '#E74C3C' : '#FFD700';
    ctx.beginPath(); ctx.arc(item.x, item.y, 18, 0, Math.PI * 2); ctx.fill();
  }
}

// ── FEEDBACK DRAW ─────────────────────────────────────────────
function drawFeedbacks(now) {
  feedbacks = feedbacks.filter(f => now - f.born < FEEDBACK_MS);
  for (const f of feedbacks) {
    const age = now - f.born;
    ctx.save();
    ctx.globalAlpha      = 1 - age / FEEDBACK_MS;
    ctx.fillStyle        = f.color;
    ctx.font             = 'bold 16px sans-serif';
    ctx.textAlign        = 'center';
    ctx.textBaseline     = 'middle';
    ctx.fillText(f.text, f.x, f.y - age * 0.025);
    ctx.restore();
  }
}

// ── HUD ───────────────────────────────────────────────────────
function hpill(cx, cy, text, color, w, alpha = 0.65) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = 'rgba(10,5,0,0.75)';
  ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - 14, w, 28, 14); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle   = color;
  ctx.font        = 'bold 13px sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function drawHUD() {
  hpill(W / 2, 28, `⭐ ${score} pts`, '#FFE066', 132);
  hpill(48,    28, '❤️'.repeat(lives) || '💀', '#fff', 84);
  const m = streakMult();
  if (m > 1) hpill(W - 44, 28, `🔥 ×${m}`, '#FF9F43', 72);
  hpill(W - 32, H - 20, MUSIC_SRC ? (musicOn ? '🎵' : '🔇') : '🎵', '#ccc', 52, 0.45);
}

// ── TITLE SCREEN ──────────────────────────────────────────────
function drawTitle() {
  drawBackground();
  ctx.fillStyle    = '#FFE066';
  ctx.font         = 'bold 52px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🤠', W / 2, H / 2 - 90);
  ctx.fillText('Lasso Loop', W / 2, H / 2 - 28);
  ctx.fillStyle = '#A09070';
  ctx.font      = '17px Georgia, serif';
  ctx.fillText('Tap anywhere to start', W / 2, H / 2 + 32);
  if (bestScore > 0) {
    ctx.fillStyle = '#B8860B';
    ctx.font      = '14px sans-serif';
    ctx.fillText(`Best: ${bestScore} pts`, W / 2, H / 2 + 70);
  }
  hpill(W - 32, H - 20, MUSIC_SRC ? (musicOn ? '🎵' : '🔇') : '🎵', '#ccc', 52, 0.45);
}

// ── GAME OVER SCREEN ──────────────────────────────────────────
function drawGameOver() {
  // Draw scene underneath
  drawBackground();

  // Overlay
  ctx.fillStyle = 'rgba(5,2,8,0.78)';
  ctx.fillRect(0, 0, W, H);

  const isRecord = score > 0 && score >= bestScore;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  if (isRecord) {
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 180);
    ctx.fillStyle = `rgba(255,215,0,${pulse})`;
    ctx.font      = 'bold 20px sans-serif';
    ctx.fillText('★  NEW RECORD!  ★', W / 2, H / 2 - 118);
  }

  ctx.fillStyle = '#FFE066';
  ctx.font      = 'bold 42px serif';
  ctx.fillText('Game Over', W / 2, H / 2 - 65);

  ctx.fillStyle = '#E8DCC8';
  ctx.font      = '30px sans-serif';
  ctx.fillText(`${score} pts`, W / 2, H / 2 - 12);

  ctx.fillStyle = '#907860';
  ctx.font      = '15px sans-serif';
  ctx.fillText(`Best: ${bestScore} pts`, W / 2, H / 2 + 26);

  // Play Again button — hit zone: cx=W/2, cy=H/2+84, w=160, h=44
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.roundRect(W / 2 - 80, H / 2 + 62, 160, 44, 22); ctx.fill();
  ctx.fillStyle = '#1a0a00';
  ctx.font      = 'bold 17px sans-serif';
  ctx.fillText('Play Again', W / 2, H / 2 + 84);

  // Share button — hit zone: cy=H/2+140, w=130, h=36
  if (navigator.share) {
    ctx.fillStyle   = 'rgba(255,255,255,0.1)';
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(W / 2 - 65, H / 2 + 122, 130, 36, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle  = '#E8DCC8';
    ctx.font       = '14px sans-serif';
    ctx.fillText('📤 Share Score', W / 2, H / 2 + 140);
  }
}

// ── INPUT ─────────────────────────────────────────────────────
function getXY(e) {
  const r = canvas.getBoundingClientRect();
  const s = e.touches ? e.touches[0] : e;
  return {
    x: (s.clientX - r.left) * (W / r.width),
    y: (s.clientY - r.top)  * (H / r.height),
  };
}

function onTap(e) {
  e.preventDefault();
  const now      = performance.now();
  const { x, y } = getXY(e);

  if (state === 'title') { startGame(); return; }

  if (state === 'gameover') {
    if (x > W / 2 - 80 && x < W / 2 + 80 && y > H / 2 + 62 && y < H / 2 + 106) {
      startGame(); return;
    }
    if (navigator.share && y > H / 2 + 122 && y < H / 2 + 158) {
      navigator.share({ title: 'Lasso Loop', text: `I scored ${score} pts on Lasso Loop! bobdavismusic.com` });
      return;
    }
    return;
  }

  // Music pill (bottom-right, playing state)
  if (x > W - 60 && x < W - 4 && y > H - 36 && y < H - 4) { toggleMusic(); return; }

  handleThrow(now);
}

canvas.addEventListener('touchstart', onTap, { passive: false });
canvas.addEventListener('click', onTap);
document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  const now = performance.now();
  if (state === 'title')    { startGame();    return; }
  if (state === 'gameover') { startGame();    return; }
  handleThrow(now);
});

// ── GAME LOOP ─────────────────────────────────────────────────
let lastTime = 0;
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  ctx.clearRect(0, 0, W, H);

  if (state === 'title') {
    drawTitle();
  } else if (state === 'playing') {
    update(dt, now);
    drawBackground();
    drawItems();
    drawCowboy();
    drawLasso();
    drawFeedbacks(now);
    drawHUD();
  } else {
    drawGameOver();
  }

  requestAnimationFrame(loop);
}

// ── BOOT ──────────────────────────────────────────────────────
loadBest();
requestAnimationFrame(t => { lastTime = t; loop(t); });
</script>
</body>
</html>
```

- [ ] **Step 2: Open `lasso-loop.html` in a browser**

Expected: Black canvas fills the viewport. Title screen shows "🤠 Lasso Loop" and "Tap anywhere to start". Tap/click starts the game — yellow and red dots drift across the black screen. Pressing Space or tapping throws the lasso (invisible for now); PERFECT/GOOD/MISS text flashes. Three misses shows "Game Over" with a Play Again button.

- [ ] **Step 3: Commit**

```bash
git add lasso-loop.html
git commit -m "feat: lasso-loop — full game logic with stub renderers"
```

---

### Task 2: Night sky background

**Files:**
- Modify: `lasso-loop.html` — replace `drawBackground()` stub

- [ ] **Step 1: Replace the `drawBackground()` function**

Find the line `function drawBackground() {` and replace the entire function with:

```javascript
function drawBackground() {
  // Sky
  const sky = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, H * 0.72);
  sky.addColorStop(0, '#1a0d35');
  sky.addColorStop(1, '#050208');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars [x, y, radius, opacity]
  const STARS = [
    [40,45,1.5,.9],[95,22,1,.7],[145,60,2,.8],[200,30,1.5,.6],[255,18,1,.9],
    [300,55,1.5,.7],[330,35,1,.8],[70,90,1,.5],[320,100,1.5,.6],[165,15,1,.8],
    [58,130,2.5,.6],[290,80,2,.7],[180,110,1.5,.5],[220,72,1,.6],[130,42,1,.7],
    [348,118,1.5,.8],[18,68,1,.5],[238,48,2,.7],[312,140,1,.6],[78,158,1.5,.5],
    [15,140,1,.7],[345,50,1.5,.6],[108,148,1,.8],[260,130,2,.5],[190,155,1,.6],
  ];
  for (const [x, y, r, a] of STARS) {
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon outer glow
  const glow = ctx.createRadialGradient(280, 65, 28, 280, 65, 82);
  glow.addColorStop(0, 'rgba(255,224,102,0.09)');
  glow.addColorStop(1, 'rgba(255,224,102,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Moon disk
  const moonG = ctx.createRadialGradient(277, 62, 0, 280, 65, 38);
  moonG.addColorStop(0,   '#FFF9E0');
  moonG.addColorStop(0.6, '#FFE066');
  moonG.addColorStop(1,   '#F4C842');
  ctx.beginPath(); ctx.arc(280, 65, 38, 0, Math.PI * 2);
  ctx.fillStyle = moonG; ctx.fill();

  // Crater shadows
  ctx.globalAlpha = 0.22;
  ctx.fillStyle   = '#E8B020';
  for (const [cx, cy, cr] of [[268,55,8],[290,78,5],[275,72,3]]) {
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Mesa silhouettes
  ctx.fillStyle = '#0d0520';
  for (const pts of [
    [[0,480],[0,420],[80,420]],
    [[60,420],[180,340],[300,420]],
    [[240,420],[310,365],[360,402],[360,420]],
  ]) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }

  // Ground
  ctx.fillStyle = '#0a0318';
  ctx.fillRect(0, 420, W, H - 420);

  // Ground edge fade
  const gf = ctx.createLinearGradient(0, 414, 0, 426);
  gf.addColorStop(0, 'rgba(26,8,53,0)');
  gf.addColorStop(1, 'rgba(26,8,53,0.85)');
  ctx.fillStyle = gf; ctx.fillRect(0, 414, W, 14);

  // Cactus silhouettes
  ctx.fillStyle = '#050210';
  // Left cactus
  ctx.fillRect(25, 383, 7, 42);
  ctx.fillRect(14, 397, 22, 5);
  ctx.fillRect(12, 388, 5, 13);
  ctx.fillRect(30, 388, 5, 13);
  // Right cactus
  ctx.fillRect(328, 389, 6, 36);
  ctx.fillRect(319, 402, 20, 4);
  ctx.fillRect(317, 393, 5, 13);
  ctx.fillRect(333, 394, 5, 11);
}
```

- [ ] **Step 2: Open in browser**

Expected: Deep purple-to-black night sky with white star dots of varying sizes. Large warm gold moon in upper-right with soft glow and crater shadows. Dark purple mesa mountain silhouettes on the horizon. Cactus silhouettes in the foreground. Deep dark ground strip at bottom.

- [ ] **Step 3: Commit**

```bash
git add lasso-loop.html
git commit -m "feat: lasso-loop illustrated night sky background"
```

---

### Task 3: Cowboy silhouette and spinning lasso

**Files:**
- Modify: `lasso-loop.html` — replace `drawCowboy()` and `drawLasso()` stubs

- [ ] **Step 1: Replace `drawCowboy()` stub**

```javascript
function drawCowboy() {
  // Translate so (0,0) = cowboy's feet at ground line (y=420)
  ctx.save();
  ctx.translate(RCX, 420);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 6, 28, 7, 0, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.fillStyle = '#1a0520';
  ctx.beginPath(); ctx.roundRect(-10, -32, 8, 34, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(2,   -32, 8, 34, 3); ctx.fill();

  // Body
  ctx.fillStyle = '#2a0f30';
  ctx.beginPath(); ctx.roundRect(-13, -70, 26, 42, 4); ctx.fill();

  // Left arm (relaxed, angled down)
  ctx.save(); ctx.translate(-14, -62); ctx.rotate(-0.25);
  ctx.fillStyle = '#2a0f30';
  ctx.beginPath(); ctx.roundRect(0, 0, 12, 7, 3); ctx.fill();
  ctx.restore();

  // Right arm (raised — holding the lasso rope)
  ctx.save(); ctx.translate(14, -64); ctx.rotate(0.45);
  ctx.fillStyle = '#2a0f30';
  ctx.beginPath(); ctx.roundRect(0, 0, 16, 7, 3); ctx.fill();
  ctx.restore();

  // Head
  ctx.fillStyle = '#2a0f30';
  ctx.beginPath(); ctx.ellipse(0, -78, 11, 10, 0, 0, Math.PI * 2); ctx.fill();

  // Hat brim
  ctx.fillStyle = '#1a0520';
  ctx.beginPath(); ctx.roundRect(-15, -90, 30, 6, 2); ctx.fill();
  // Hat crown
  ctx.beginPath(); ctx.roundRect(-9, -112, 18, 24, 3); ctx.fill();

  ctx.restore();
}
```

- [ ] **Step 2: Replace `drawLasso()` stub**

```javascript
function drawLasso() {
  const lx = RCX + Math.cos(lassoAngle) * ROPE_LEN;
  const ly = RCY + Math.sin(lassoAngle) * ROPE_LEN;

  // Hand position — right hand of cowboy (offset from rotation center)
  const hx = RCX + 18, hy = RCY - 8;

  // Rope: quadratic bezier with natural outward curve
  const cpx = (hx + lx) / 2 + Math.cos(lassoAngle + Math.PI / 2) * 28;
  const cpy = (hy + ly) / 2 + Math.sin(lassoAngle + Math.PI / 2) * 28;

  ctx.strokeStyle = '#C8A04A';
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(cpx, cpy, lx, ly);
  ctx.stroke();

  // Lasso loop at tip
  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(lassoAngle);

  // Glow halo
  ctx.strokeStyle = 'rgba(255,228,90,0.35)';
  ctx.lineWidth   = 6;
  ctx.beginPath(); ctx.ellipse(0, 0, LOOP_RX + 3, LOOP_RY + 3, 0, 0, Math.PI * 2); ctx.stroke();

  // Main loop
  ctx.strokeStyle = '#D4A84B';
  ctx.fillStyle   = 'rgba(212,168,75,0.06)';
  ctx.lineWidth   = 2.5;
  ctx.beginPath(); ctx.ellipse(0, 0, LOOP_RX, LOOP_RY, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  ctx.restore();
}
```

- [ ] **Step 3: Open in browser**

Expected: Dark purple cowboy silhouette standing at bottom center with a raised right arm. A gold rope extends from his hand and sweeps continuously in a clockwise circle. A glowing gold oval loop sits at the rope's tip. Press Space — the loop briefly pauses (120ms), then resumes spinning.

- [ ] **Step 4: Commit**

```bash
git add lasso-loop.html
git commit -m "feat: lasso-loop cowboy silhouette and animated spinning lasso"
```

---

### Task 4: Item rendering

**Files:**
- Modify: `lasso-loop.html` — replace `drawItems()` stub, add `drawItem()` helper

- [ ] **Step 1: Replace `drawItems()` and add `drawItem()` above it**

Find the `drawItems()` function and replace it (the placeholder) with the two functions below:

```javascript
function drawItem(item) {
  ctx.save();
  ctx.translate(item.x, item.y);

  if (item.type === 'pick') {
    // Halo
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = item.haloColor; ctx.fill();

    // Guitar pick (teardrop shape)
    ctx.fillStyle   = '#FFD700';
    ctx.strokeStyle = '#D4A000';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(17, -8,  13,  10);
    ctx.quadraticCurveTo( 0, 18, -13,  10);
    ctx.quadraticCurveTo(-17, -8,  0, -16);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Music note
    ctx.fillStyle    = '#8B6400';
    ctx.font         = 'bold 12px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', 0, 1);

  } else {
    // Halo (safe items only)
    if (item.haloColor) {
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fillStyle = item.haloColor; ctx.fill();
    }

    // Red dashed warning ring (danger items)
    if (item.danger) {
      ctx.strokeStyle = 'rgba(231,76,60,0.65)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Emoji
    ctx.font         = '28px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 0);
  }

  ctx.restore();
}

function drawItems() {
  for (const item of items) drawItem(item);
}
```

- [ ] **Step 2: Open in browser and play**

Expected:
- Gold teardrop guitar picks with ♪ mark drift across the sky
- 🧲 horseshoes with purple halos
- 💰 cash bags with green halos
- 🐍 rattlesnakes and 🌵 cacti with red dashed warning rings
- All items bob gently on a sine-wave path
- Catching a safe item shows GOOD or PERFECT (2× for closer hits)
- Catching a danger item shows MISS and loses a life
- Streak multiplier (🔥 ×2/×3/×4) appears in top-right after 3 consecutive catches
- Score pill updates correctly; Personal best saves and persists on page reload

- [ ] **Step 3: Commit**

```bash
git add lasso-loop.html
git commit -m "feat: lasso-loop illustrated item rendering — picks, horseshoes, cash, danger items"
```

---

### Task 5: Integration test and final check

**Files:**
- Modify: `lasso-loop.html` — fix any bugs found during playtesting

- [ ] **Step 1: Play through the complete game flow and check each item**

Run through this checklist manually in the browser:

| Check | Expected |
|---|---|
| Title screen loads | "🤠 Lasso Loop", "Tap anywhere to start" |
| Tap/Space starts game | Items appear, lasso spins |
| GOOD catch | Item removed, score increases by item.points × streakMult |
| PERFECT catch | Score increases by item.points × 2 × streakMult, gold feedback |
| 3 consecutive catches | 🔥 ×2 appears top-right |
| 6 consecutive catches | 🔥 ×3 |
| 10 consecutive catches | 🔥 ×4 |
| Catching 🐍 or 🌵 | MISS text, life lost, streak resets to 0 |
| Missing throw | MISS text, life lost, streak resets |
| 3rd life lost | Game over screen appears |
| Score > previous best | "★ NEW RECORD! ★" pulses gold |
| Play Again | Resets score/lives/streak, starts fresh |
| Reload page | Best score persists |
| Speed at 500 pts | Lasso visibly faster, items drift faster |
| Mobile viewport | Canvas scales to fit, no scroll, tap works |

- [ ] **Step 2: Fix any issues found** (if none, skip)

Common issues to watch for:
- Lasso rope drawing through the cowboy body at certain angles — acceptable, silhouette style
- Items spawning too close together — adjust `MIN_ITEMS`/`MAX_ITEMS` spawn chance if needed
- Feedback text clipping at screen edges — check `f.x` bounds in `drawFeedbacks`

- [ ] **Step 3: Final commit**

```bash
git add lasso-loop.html
git commit -m "feat: lasso-loop v1 complete — precision timing lasso game"
```
