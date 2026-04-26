# Honky Tonk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `honky-tonk.html` — a full rhythm game with Web Audio procedural beat, animated crowd, spotlight stage lighting, particle bursts, and an in-app Formspree feedback form.

**Architecture:** Single HTML file; 360×640 canvas with responsive CSS scaling. State machine (`title` | `playing` | `gameover`) drives the game loop. Web Audio beat is scheduled ahead with `AC.currentTime` look-ahead; notes spawn on an eighth-note beat grid (90 BPM) with musical constraints (per-lane gap, simultaneous-note cap). Feedback form is an absolutely-positioned HTML `<div>` overlay, not canvas.

**Tech Stack:** HTML5 Canvas 2D, Web Audio API, Vanilla JS, CSS (inline), Formspree (POST JSON)

**Audio note:** Guitar tones G3/C4/E4 form a G major chord — always consonant when played together. Notes always spawn on the beat grid, never at random intervals. Musical quality is a first-class requirement.

---

### Task 1: Scaffold + Static Stage

**Files:**
- Create: `honky-tonk.html`

- [ ] **Step 1: Create the file with full boilerplate, constants, canvas setup, and static stage drawing**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>Honky Tonk</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; touch-action: none; }
#wrap { position: relative; }
canvas { display: block; }
</style>
</head>
<body>
<div id="wrap">
  <canvas id="c"></canvas>
</div>
<script>
const W = 360, H = 640;
const HIT_Y        = 510;
const PERFECT_DIST = 20;
const GOOD_DIST    = 45;
const MISS_DIST    = 60;
const NOTE_W = 64, NOTE_H = 24;
const BPM        = 90;
const BEAT_MS    = 60000 / BPM;      // 666.7ms
const EIGHTH_MS  = BEAT_MS / 2;      // 333.3ms
const LANES = [
  { x:  72, color: '#FF6B35' },  // orange
  { x: 180, color: '#FFD700' },  // gold
  { x: 288, color: '#C878F0' },  // purple
];
const FEEDBACK_ENDPOINT = 'https://formspree.io/f/xdayvnvo';
const MUSIC_SRC = '';

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
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Stage drawing ─────────────────────────────────────────
// drawStage accepts `now` (ms) and `laneRedFlash` for miss-flash coloring
function drawStage(now, laneRedFlash, laneFlash) {
  // Background
  ctx.fillStyle = '#0d0608';
  ctx.fillRect(0, 0, W, H);

  // Lane guides — subtle vertical stripes
  for (const lane of LANES) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(lane.x - 40, 110, 80, 380);
  }

  // Stage floor planks (y=545–640)
  for (let row = 0; row * 14 + 545 < H; row++) {
    ctx.fillStyle = row % 2 === 0 ? '#1a0a06' : '#120804';
    ctx.fillRect(0, 545 + row * 14, W, 14);
  }

  // Hit zone glowing bar
  ctx.save();
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur  = 14;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(0, HIT_Y); ctx.lineTo(W, HIT_Y);
  ctx.stroke();
  ctx.restore();

  // Lane buttons (y=520–542) — color reacts to miss/hit flash
  for (let i = 0; i < 3; i++) {
    const lane     = LANES[i];
    const isRed    = laneRedFlash[i] > now;
    const isHit    = !isRed && laneFlash[i] > now;
    const alpha    = isRed ? 0.9 : isHit ? 1.0 : 0.3;
    const fillColor = isRed ? '#E74C3C' : lane.color;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = fillColor;
    if (isHit || isRed) { ctx.shadowColor = fillColor; ctx.shadowBlur = 14; }
    roundRect(ctx, lane.x - 35, 520, 70, 22, 6);
    ctx.fill();
    ctx.restore();
  }
}

// ── Bootstrap render loop (replaced in Task 4) ───────────
function loop(now) {
  ctx.clearRect(0, 0, W, H);
  drawStage(now, [0, 0, 0], [0, 0, 0]);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
</script>
</body>
</html>
```

- [ ] **Step 2: Open `honky-tonk.html` in a browser**

Expected: Dark stage (`#0d0608`) with three barely-visible lane stripes, white glowing hit-zone bar at y=510, three softly-colored lane buttons below it, repeating dark wood plank floor beneath. Canvas scales to fit the viewport.

- [ ] **Step 3: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): scaffold, constants, static stage"
```

---

### Task 2: Animated Crowd + Spotlight Beams

**Files:**
- Modify: `honky-tonk.html`

Add crowd and spotlight before the bootstrap loop. The crowd bobs on a sine wave; amplitude and frequency escalate with streak multiplier. Spotlights are blurred triangular cones, barely visible by default, brightening when a note enters the lane or a hit fires.

- [ ] **Step 1: Add crowd data and drawing function**

Insert in `<script>` before the bootstrap loop:

```javascript
// ── Crowd ─────────────────────────────────────────────────
const CROWD = Array.from({ length: 18 }, (_, i) => ({
  x:       10 + i * 19 + (Math.random() * 5 - 2.5),
  baseY:   70 + Math.random() * 22,
  r:       7  + Math.random() * 5,
  bobFreq: 1.0 + Math.random() * 0.4,
  phase:   Math.random() * Math.PI * 2,
}));

function crowdParams(streak) {
  if (streak >= 24) return { amp: 18, freqScale: 2.0, sway: true,  bright: true  };
  if (streak >= 16) return { amp: 12, freqScale: 1.67, sway: true,  bright: false };
  if (streak >= 8 ) return { amp:  7, freqScale: 1.5,  sway: false, bright: false };
                    return { amp:  3, freqScale: 1.0,  sway: false, bright: false };
}

function drawCrowd(now, streak) {
  const { amp, freqScale, sway, bright } = crowdParams(streak);
  const t = now / 1000;
  ctx.fillStyle = bright ? '#2a0a22' : '#1a0514';
  for (const h of CROWD) {
    const dy = Math.sin(t * h.bobFreq * freqScale + h.phase) * amp;
    const dx = sway ? Math.sin(t * h.bobFreq * 0.7 + h.phase + 1) * 6 : 0;
    ctx.beginPath();
    ctx.arc(h.x + dx, h.baseY + dy, h.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

- [ ] **Step 2: Add spotlight drawing function**

```javascript
// ── Spotlights ────────────────────────────────────────────
// notes: array of note objects; laneFlash: timestamp array
function drawSpotlights(now, notes, laneFlash) {
  ctx.save();
  ctx.filter = 'blur(3px)';
  for (let i = 0; i < 3; i++) {
    const lane    = LANES[i];
    const hasNote = notes.some(n => n.lane === i && !n.hit);
    const alpha   = laneFlash[i] > now ? 0.18 : hasNote ? 0.10 : 0.04;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = lane.color;
    ctx.beginPath();
    ctx.moveTo(lane.x, 0);
    ctx.lineTo(lane.x - 44, HIT_Y);
    ctx.lineTo(lane.x + 44, HIT_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter     = 'none';  // CRITICAL: reset before any other draw calls
  ctx.globalAlpha = 1;
  ctx.restore();
}
```

- [ ] **Step 3: Wire crowd and spotlights into the bootstrap loop**

Replace the existing bootstrap loop:

```javascript
let notes     = [];
let laneFlash    = [0, 0, 0];
let laneRedFlash = [0, 0, 0];
let streak    = 0;

function loop(now) {
  ctx.clearRect(0, 0, W, H);
  drawSpotlights(now, notes, laneFlash);
  drawCrowd(now, streak);
  drawStage(now, laneRedFlash, laneFlash);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

- [ ] **Step 4: Open the file and verify**

Expected: Soft, barely-visible orange/gold/purple triangular beams pointing from ceiling toward the hit zone. Eighteen dark silhouette circles gently bobbing between y=65–100. No blur bleeding into the stage area (floor and lane buttons look sharp).

- [ ] **Step 5: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): animated crowd + spotlight beams"
```

---

### Task 3: Web Audio — Beat + Guitar Tones

**Files:**
- Modify: `honky-tonk.html`

The beat must sound like real country music — not mechanical noise. Kick on beats 1 and 3 (with pitch drop), snare on 2 and 4 (filtered noise), high-pass hi-hat on every eighth. Guitar tones G3/C4/E4 form a G major chord; each starts 5% sharp and ramps to pitch over 60ms for a twang effect.

- [ ] **Step 1: Add AudioContext, master gain, and sound functions**

Insert in `<script>` before the state variables block:

```javascript
// ── Web Audio ─────────────────────────────────────────────
const AC = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = AC.createGain();
masterGain.connect(AC.destination);
masterGain.gain.setValueAtTime(1.0, AC.currentTime);

let musicOn   = true;
let beatTimer = null;

function ensureAudio() { if (AC.state === 'suspended') AC.resume(); }
canvas.addEventListener('touchstart', ensureAudio, { once: true });
canvas.addEventListener('click',      ensureAudio, { once: true });

function scheduleKick(t) {
  const osc  = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain); gain.connect(masterGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.18);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.85, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t); osc.stop(t + 0.18);
}

function scheduleSnare(t) {
  // White noise through bandpass — snare crack
  const len    = Math.floor(AC.sampleRate * 0.12);
  const buf    = AC.createBuffer(1, len, AC.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise  = AC.createBufferSource();
  const bp     = AC.createBiquadFilter();
  const gain   = AC.createGain();
  noise.buffer = buf;
  bp.type = 'bandpass'; bp.frequency.value = 220; bp.Q.value = 0.7;
  noise.connect(bp); bp.connect(gain); gain.connect(masterGain);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.45, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  noise.start(t); noise.stop(t + 0.12);
}

function scheduleHihat(t, open) {
  const dur  = open ? 0.18 : 0.045;
  const len  = Math.floor(AC.sampleRate * dur);
  const buf  = AC.createBuffer(1, len, AC.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = AC.createBufferSource();
  const hp    = AC.createBiquadFilter();
  const gain  = AC.createGain();
  noise.buffer = buf;
  hp.type = 'highpass'; hp.frequency.value = 9000;
  noise.connect(hp); hp.connect(gain); gain.connect(masterGain);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(open ? 0.12 : 0.07, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.start(t); noise.stop(t + dur);
}

// Schedule one full 4/4 bar starting at barStart (in AC seconds)
function scheduleBar(barStart) {
  const e = BEAT_MS / 1000 / 2; // seconds per eighth note
  for (let i = 0; i < 8; i++) {
    const t = barStart + i * e;
    // Hi-hat: closed on every eighth, open on beats 2 and 4 (i=2,6)
    scheduleHihat(t, i === 2 || i === 6);
    if (i === 0 || i === 4) scheduleKick(t);    // beats 1, 3
    if (i === 2 || i === 6) scheduleSnare(t);   // beats 2, 4
  }
}

let nextBarTime = 0;

function startBeat() {
  if (!musicOn) return;
  nextBarTime = AC.currentTime + 0.05;
  function tick() {
    // Schedule bars up to 1 second ahead
    while (nextBarTime < AC.currentTime + 1.0) {
      scheduleBar(nextBarTime);
      nextBarTime += (BEAT_MS / 1000) * 4; // 4 beats per bar
    }
    beatTimer = setTimeout(tick, 250);
  }
  tick();
}

function stopBeat() {
  clearTimeout(beatTimer);
  beatTimer = null;
}

function duckBeat(durationSec) {
  masterGain.gain.cancelScheduledValues(AC.currentTime);
  masterGain.gain.setValueAtTime(0.4, AC.currentTime);
  masterGain.gain.linearRampToValueAtTime(1.0, AC.currentTime + durationSec);
}

// ── Guitar tones (per lane, on hit) ──────────────────────
// G3/C4/E4 form a G major chord — always consonant together
const GUITAR_FREQS = [
  { target: 196, start: 206 },  // Lane 0: G3 (5% sharp start)
  { target: 262, start: 275 },  // Lane 1: C4
  { target: 330, start: 347 },  // Lane 2: E4
];

function playGuitar(laneIdx) {
  const { target, start } = GUITAR_FREQS[laneIdx];
  const osc  = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain); gain.connect(masterGain);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(start, AC.currentTime);
  osc.frequency.linearRampToValueAtTime(target, AC.currentTime + 0.06);
  gain.gain.setValueAtTime(0, AC.currentTime);
  gain.gain.linearRampToValueAtTime(0.38, AC.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.29);
  osc.start(); osc.stop(AC.currentTime + 0.29);
}

function playMiss() {
  const osc  = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain); gain.connect(masterGain);
  osc.type = 'square';
  osc.frequency.setValueAtTime(100, AC.currentTime);
  gain.gain.setValueAtTime(0, AC.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, AC.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.08);
  osc.start(); osc.stop(AC.currentTime + 0.08);
}
```

- [ ] **Step 2: Add music toggle drawing function**

```javascript
function drawMusicToggle() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, W - 52, H - 38, 46, 28, 7);
  ctx.fill();
  ctx.fillStyle    = '#aaa';
  ctx.font         = '12px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(musicOn ? '♪ ON' : '♪ OFF', W - 29, H - 24);
  ctx.restore();
}

function handleMusicToggleTap(x, y) {
  if (x > W - 54 && x < W - 4 && y > H - 40 && y < H - 8) {
    musicOn = !musicOn;
    if (musicOn) { ensureAudio(); if (state === 'playing') startBeat(); }
    else         { stopBeat(); }
    return true;
  }
  return false;
}
```

- [ ] **Step 3: Add `drawMusicToggle()` call at end of loop**

In the bootstrap loop, add `drawMusicToggle()` as the last draw call before `requestAnimationFrame`.

- [ ] **Step 4: Temporary beat test**

Add after the loop bootstrap (remove after testing):

```javascript
// TEMP TEST — remove after verifying beat sounds correct
setTimeout(() => { ensureAudio(); AC.resume().then(startBeat); }, 500);
```

Open the file, click/tap once to unblock AudioContext if needed, wait 0.5s. Verify the beat sounds like a real country drum pattern: solid kick on 1 and 3, snapping snare on 2 and 4, closed hi-hat ticking on every eighth with open hi-hat on the backbeat. Remove the TEMP line.

- [ ] **Step 5: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): web audio beat scheduler + guitar tones"
```

---

### Task 4: State Machine + Note Spawning

**Files:**
- Modify: `honky-tonk.html`

Notes spawn on the eighth-note grid only. Per-lane minimum gaps and a per-tick simultaneous-note cap ensure the patterns sound musical rather than cluttered.

- [ ] **Step 1: Add all game state variables**

Replace the three variable declarations (`let notes`, `let laneFlash`, `let streak`) with the full state block:

```javascript
// ── Game state ────────────────────────────────────────────
let state    = 'title';
let score    = 0;
let lives    = 3;
let streak   = 0;
let bestScore = parseInt(localStorage.getItem('honkytonk_best') || '0', 10);

let notes        = [];
let particles    = [];
let feedbacks    = [];
let laneFlash    = [0, 0, 0];   // timestamp until lane button hit-flash ends
let laneRedFlash = [0, 0, 0];   // timestamp until lane button miss-flash (red) ends

let densityLevel   = 1;
let noteSpeed      = 200;
let lastEighthTick = 0;
let lastNoteTime   = [0, 0, 0]; // last spawn time per lane

let shakeUntil     = 0;
let shakeIntensity = 0;

let milestoneFlash = { until: 0, color: '#FFD700' };

// Density config: prob = spawn probability per lane per tick
// minGapMs = minimum ms between notes in the same lane
// maxSimul = max notes spawned across all lanes per tick
const DENSITY = [
  null,
  { prob: 0.25, maxSimul: 1, minGapMs: EIGHTH_MS * 2 },  // level 1
  { prob: 0.40, maxSimul: 2, minGapMs: EIGHTH_MS * 2 },  // level 2
  { prob: 0.55, maxSimul: 2, minGapMs: EIGHTH_MS     },  // level 3
  { prob: 0.70, maxSimul: 3, minGapMs: EIGHTH_MS     },  // level 4
  { prob: 0.80, maxSimul: 3, minGapMs: EIGHTH_MS     },  // level 5
];
const SPEED_BY_DENSITY      = [0, 200, 240, 290, 350, 420];
const DENSITY_THRESHOLDS    = [0, 0, 300, 700, 1200, 2000];
```

- [ ] **Step 2: Add note spawning and update functions**

```javascript
function trySpawnNotes(now) {
  // Only fire on a new eighth-note boundary (90% threshold avoids double-firing on dt variance)
  if (now - lastEighthTick < EIGHTH_MS * 0.9) return;
  lastEighthTick = now;

  const d = DENSITY[densityLevel];
  let spawned = 0;
  // Shuffle lane order each tick so no lane is systematically preferred
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  for (const i of order) {
    if (spawned >= d.maxSimul) break;
    if (now - lastNoteTime[i] < d.minGapMs) continue; // enforce musical gap
    if (Math.random() > d.prob) continue;
    notes.push({ lane: i, y: 110, hit: false });
    lastNoteTime[i] = now;
    spawned++;
  }
}

function updateNotes(dt, now) {
  for (const n of notes) {
    if (!n.hit) n.y += noteSpeed * dt;
  }
  // Detect misses and remove spent notes
  const live = [];
  for (const n of notes) {
    if (n.hit) continue;                      // already hit — drop it
    if (n.y > HIT_Y + MISS_DIST) {
      onMiss(n.lane, now);                    // triggers life loss, shake, etc.
      continue;                               // drop it
    }
    live.push(n);
  }
  notes = live;
}

function checkDensity() {
  for (let d = 5; d >= 2; d--) {
    if (score >= DENSITY_THRESHOLDS[d] && densityLevel < d) {
      densityLevel = d;
      noteSpeed    = SPEED_BY_DENSITY[d];
      break;
    }
  }
}
```

- [ ] **Step 3: Add note drawing**

```javascript
function drawNotes(now) {
  for (const n of notes) {
    if (n.hit) continue;
    const lane   = LANES[n.lane];
    const near   = n.y > HIT_Y - 50; // approaching hit zone — boost glow
    ctx.save();
    ctx.shadowColor = lane.color;
    ctx.shadowBlur  = near ? 20 : 8;
    ctx.fillStyle   = lane.color;
    roundRect(ctx, lane.x - NOTE_W / 2, n.y - NOTE_H / 2, NOTE_W, NOTE_H, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
```

- [ ] **Step 4: Add stub functions for hit/miss/screens (replaced in later tasks)**

```javascript
function onHit(laneIdx, quality, now) {}
function onMiss(laneIdx, now) {}

function drawTitle(now) {
  ctx.fillStyle = 'rgba(5,2,8,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle    = '#FFD700';
  ctx.font         = 'bold 52px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = '#FFD700'; ctx.shadowBlur = 24;
  ctx.fillText('Honky Tonk', W / 2, H / 2 - 60);
  ctx.shadowBlur = 0;
  ctx.fillStyle  = '#A09070';
  ctx.font       = '18px Georgia, serif';
  ctx.fillText('Tap to start', W / 2, H / 2 + 10);
}
function drawHUD(now)      {}
function drawGameOver(now) {}
function showFeedbackForm() {}
function startGame() { state = 'playing'; lastEighthTick = performance.now(); startBeat(); }
```

- [ ] **Step 5: Replace bootstrap loop with full game loop**

```javascript
let lastTime = 0;

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state === 'playing') {
    trySpawnNotes(now);
    updateNotes(dt, now);
    checkDensity();
  }

  ctx.save();
  if (now < shakeUntil) {
    ctx.translate(
      (Math.random() - 0.5) * shakeIntensity * 2,
      (Math.random() - 0.5) * shakeIntensity * 2
    );
  }
  // Clear with padding for shake
  ctx.clearRect(-10, -10, W + 20, H + 20);

  drawSpotlights(now, notes, laneFlash);
  drawCrowd(now, streak);
  drawStage(now, laneRedFlash, laneFlash);
  drawNotes(now);

  // Milestone flash overlay (on top of everything except HUD/screens)
  if (milestoneFlash.until > now) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle   = milestoneFlash.color;
    ctx.fillRect(-10, -10, W + 20, H + 20);
    ctx.restore();
  }

  if (state === 'title')    drawTitle(now);
  if (state === 'playing')  drawHUD(now);
  if (state === 'gameover') drawGameOver(now);

  drawMusicToggle();
  ctx.restore();

  requestAnimationFrame(loop);
}
requestAnimationFrame(t => { lastTime = t; loop(t); });
```

- [ ] **Step 6: Open file and verify**

Expected: Title screen with "Honky Tonk" gold text and "Tap to start". Notes are NOT falling yet (no tap handler). Spotlights and crowd visible in background.

- [ ] **Step 7: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): state machine + beat-grid note spawning"
```

---

### Task 5: Input + Hit Detection + Scoring

**Files:**
- Modify: `honky-tonk.html`

- [ ] **Step 1: Add input helpers**

```javascript
// ── Input ─────────────────────────────────────────────────
function getXY(e) {
  const r = canvas.getBoundingClientRect();
  const s = e.touches ? e.touches[0] : e;
  return {
    x: (s.clientX - r.left) * (W / r.width),
    y: (s.clientY - r.top)  * (H / r.height),
  };
}

function tapToLane(x) {
  if (x < W / 3)        return 0;
  if (x < (2 * W) / 3)  return 1;
  return 2;
}
```

- [ ] **Step 2: Add streakMultiplier helper**

```javascript
function streakMultiplier() {
  if (streak >= 24) return 4;
  if (streak >= 16) return 3;
  if (streak >= 8)  return 2;
  return 1;
}
```

- [ ] **Step 3: Replace onHit stub with full implementation**

```javascript
function onHit(laneIdx, quality, now) {
  const prevStreak = streak;
  streak++;

  const pts = 100 * (quality === 'PERFECT' ? 2 : 1) * streakMultiplier();
  score += pts;

  playGuitar(laneIdx);
  laneFlash[laneIdx] = now + (quality === 'PERFECT' ? 200 : 120);

  // Streak multiplier milestone?
  const prevMult = prevStreak >= 24 ? 4 : prevStreak >= 16 ? 3 : prevStreak >= 8 ? 2 : 1;
  const newMult  = streakMultiplier();
  if (newMult > prevMult) {
    milestoneFlash = { until: now + 150, color: LANES[laneIdx].color };
    shakeUntil     = now + 300;
    shakeIntensity = 6;
  }

  const label = quality === 'PERFECT' ? 'PERFECT!' : 'GOOD';
  const color = quality === 'PERFECT' ? '#FFD700'  : '#4CAF50';
  feedbacks.push({ text: label, x: LANES[laneIdx].x, y: HIT_Y - 30, color, born: now });
  burst(LANES[laneIdx].x, HIT_Y, quality === 'PERFECT' ? 12 : 6, LANES[laneIdx].color, now);
}
```

- [ ] **Step 4: Replace onMiss stub with full implementation**

```javascript
function onMiss(laneIdx, now) {
  lives--;
  streak = 0;
  shakeUntil      = now + 200;
  shakeIntensity  = 4;
  laneRedFlash[laneIdx] = now + 220;

  playMiss();
  duckBeat(0.5);

  feedbacks.push({ text: 'MISS', x: LANES[laneIdx].x, y: HIT_Y - 30, color: '#E74C3C', born: now });

  if (lives <= 0) {
    state = 'gameover';
    stopBeat();
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('honkytonk_best', bestScore);
    }
  }
}
```

- [ ] **Step 5: Add hit resolution function**

```javascript
function resolveHit(laneIdx, now) {
  laneFlash[laneIdx] = now + 80; // brief button tap flash regardless of hit

  let closest = null, dist = Infinity;
  for (const n of notes) {
    if (n.hit || n.lane !== laneIdx) continue;
    const d = Math.abs(n.y - HIT_Y);
    if (d < dist) { dist = d; closest = n; }
  }

  if (!closest) return; // empty tap — no penalty, no feedback

  if (dist <= PERFECT_DIST) {
    closest.hit = true;
    onHit(laneIdx, 'PERFECT', now);
  } else if (dist <= GOOD_DIST) {
    closest.hit = true;
    onHit(laneIdx, 'GOOD', now);
  }
  // Note exists but dist > GOOD_DIST: early tap, ignore (forgiving)
}
```

- [ ] **Step 6: Replace startGame stub**

```javascript
function startGame() {
  state         = 'playing';
  score         = 0;
  lives         = 3;
  streak        = 0;
  notes         = [];
  particles     = [];
  feedbacks     = [];
  laneFlash     = [0, 0, 0];
  laneRedFlash  = [0, 0, 0];
  densityLevel  = 1;
  noteSpeed     = SPEED_BY_DENSITY[1];
  lastEighthTick = performance.now();
  lastNoteTime  = [0, 0, 0];
  shakeUntil    = 0;
  milestoneFlash = { until: 0, color: '#FFD700' };
  ensureAudio();
  startBeat();
}
```

- [ ] **Step 7: Add tap and keyboard handlers**

```javascript
function onTap(e) {
  e.preventDefault();
  ensureAudio();
  const { x, y } = getXY(e);

  if (handleMusicToggleTap(x, y)) return;

  if (state === 'title') {
    startGame();
    return;
  }

  if (state === 'gameover') {
    // Play Again button — centered at (W/2, H/2+52), 160×44
    if (x > W/2 - 80 && x < W/2 + 80 && y > H/2 + 30 && y < H/2 + 74) {
      startGame();
    }
    // Feedback button — centered at (W/2, H/2+108), 200×36
    if (x > W/2 - 100 && x < W/2 + 100 && y > H/2 + 90 && y < H/2 + 126) {
      showFeedbackForm();
    }
    return;
  }

  if (state === 'playing') {
    resolveHit(tapToLane(x), performance.now());
  }
}

canvas.addEventListener('touchstart', onTap, { passive: false });
canvas.addEventListener('click',      onTap);

document.addEventListener('keydown', e => {
  if (state !== 'playing') return;
  const now = performance.now();
  if (e.key === 'a' || e.key === 'A') resolveHit(0, now);
  if (e.key === 's' || e.key === 'S') resolveHit(1, now);
  if (e.key === 'd' || e.key === 'D') resolveHit(2, now);
});
```

- [ ] **Step 8: Add particle burst stub (replaced in Task 6)**

```javascript
function burst(x, y, count, color, now) {} // implemented in Task 6
```

- [ ] **Step 9: Open file, tap to start, verify**

Expected: Tapping starts the game and beat. Notes fall. Tapping the correct lane at the right time shows PERFECT!/GOOD float-up text. Missing a note triggers screen shake, red lane flash, "MISS" text, and beat ducks briefly. Three misses → game over state (title/HUD stubs show; Play Again works).

- [ ] **Step 10: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): input, hit detection, scoring, lives"
```

---

### Task 6: HUD + Particles + Feedback Floats

**Files:**
- Modify: `honky-tonk.html`

- [ ] **Step 1: Replace drawHUD stub**

```javascript
function drawHUD(now) {
  // Score pill — top center
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, W / 2 - 62, 8, 124, 28, 8);
  ctx.fill();
  ctx.fillStyle    = '#FFD700';
  ctx.font         = 'bold 14px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⭐ ' + score.toLocaleString() + ' pts', W / 2, 22);
  ctx.restore();

  // Lives — top left (guitar picks)
  ctx.save();
  ctx.font         = '18px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎸'.repeat(Math.max(0, lives)), 8, 22);
  ctx.restore();

  // Streak indicator — top right (hidden at ×1)
  if (streak >= 8) {
    ctx.save();
    ctx.fillStyle    = '#FFD700';
    ctx.font         = 'bold 14px sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥 ×' + streakMultiplier(), W - 8, 22);
    ctx.restore();
  }
}
```

- [ ] **Step 2: Replace burst stub with full particle system**

```javascript
function burst(x, y, count, color, now) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = count >= 12
      ? 80  + Math.random() * 100   // PERFECT: faster, wider
      : 40  + Math.random() * 40;   // GOOD: gentler
    const r = count >= 12 ? 3 + Math.random() * 2 : 2 + Math.random() * 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      r, color, born: now, lifeSec: 0.6,
    });
  }
}

function updateParticles(dt, now) {
  particles = particles.filter(p => now - p.born < p.lifeSec * 1000);
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

function drawParticles(now) {
  for (const p of particles) {
    const age   = (now - p.born) / (p.lifeSec * 1000);
    const alpha = 1 - age;
    const r     = p.r * (1 - age * 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(r, 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
```

- [ ] **Step 3: Add feedback float-up drawing**

```javascript
const FEEDBACK_DURATION_MS = 800;

function drawFeedbacks(now) {
  feedbacks = feedbacks.filter(f => now - f.born < FEEDBACK_DURATION_MS);
  for (const f of feedbacks) {
    const age   = now - f.born;
    const alpha = 1 - age / FEEDBACK_DURATION_MS;
    ctx.save();
    ctx.globalAlpha  = alpha;
    ctx.fillStyle    = f.color;
    ctx.shadowColor  = f.color;
    ctx.shadowBlur   = 8;
    ctx.font         = 'bold 16px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.text, f.x, f.y - age * 0.032);
    ctx.restore();
  }
}
```

- [ ] **Step 4: Wire particles + feedbacks into the game loop**

In the `if (state === 'playing')` block inside `loop`, add:

```javascript
updateParticles(dt, now);
```

In the draw section, after `drawNotes(now)`, add:

```javascript
drawParticles(now);
drawFeedbacks(now);
```

- [ ] **Step 5: Open file and verify**

Expected: Score pill at top center, 🎸 icons top left, 🔥 ×N top right when streak ≥ 8. PERFECT hits produce a spray of 12 colored particles from the hit zone. GOOD hits produce 6 smaller particles. Float-up text fades and drifts upward over 800ms.

- [ ] **Step 6: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): HUD, particle system, feedback float-ups"
```

---

### Task 7: Title Screen + Game Over Screen

**Files:**
- Modify: `honky-tonk.html`

- [ ] **Step 1: Replace drawTitle stub with full title screen**

```javascript
function drawTitle(now) {
  ctx.fillStyle = 'rgba(5,2,8,0.72)';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.save();
  ctx.fillStyle    = '#FFD700';
  ctx.font         = 'bold 52px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = '#FFD700';
  ctx.shadowBlur   = 28;
  ctx.fillText('Honky Tonk', W / 2, H / 2 - 90);
  ctx.restore();

  // Pulsing tap prompt
  const pulse = 0.55 + 0.45 * Math.sin(now / 580);
  ctx.save();
  ctx.globalAlpha  = pulse;
  ctx.fillStyle    = '#A09070';
  ctx.font         = '18px Georgia, serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tap to start', W / 2, H / 2 - 20);
  ctx.restore();

  // Personal best
  if (bestScore > 0) {
    ctx.fillStyle    = '#907860';
    ctx.font         = '14px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Best: ' + bestScore.toLocaleString() + ' pts', W / 2, H / 2 + 22);
  }

  // Controls hint
  ctx.fillStyle    = '#444';
  ctx.font         = '13px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A · S · D  or  tap lanes', W / 2, H / 2 + 55);
}
```

- [ ] **Step 2: Replace drawGameOver stub with full game over screen**

```javascript
function drawGameOver(now) {
  ctx.fillStyle = 'rgba(5,2,8,0.84)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // "GAME OVER"
  ctx.fillStyle = '#E8DCC8';
  ctx.font      = 'bold 38px serif';
  ctx.fillText('GAME OVER', W / 2, H / 2 - 125);

  // Score
  ctx.fillStyle = '#FFD700';
  ctx.font      = 'bold 28px sans-serif';
  ctx.fillText(score.toLocaleString() + ' pts', W / 2, H / 2 - 75);

  // NEW RECORD pulse
  if (score > 0 && score >= bestScore) {
    const pulse = 0.75 + 0.25 * Math.sin(now / 180);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#FFD700';
    ctx.font        = 'bold 18px sans-serif';
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
    ctx.fillText('NEW RECORD!', W / 2, H / 2 - 38);
    ctx.restore();
  }

  // Best score
  ctx.fillStyle = '#907860';
  ctx.font      = '14px sans-serif';
  ctx.fillText('Best: ' + bestScore.toLocaleString() + ' pts', W / 2, H / 2 + 2);

  // Play Again button
  ctx.save();
  ctx.fillStyle = '#FFD700';
  roundRect(ctx, W / 2 - 80, H / 2 + 30, 160, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#0d0608';
  ctx.font      = 'bold 18px sans-serif';
  ctx.fillText('Play Again', W / 2, H / 2 + 52);
  ctx.restore();

  // Feedback button
  ctx.save();
  ctx.fillStyle = 'rgba(255,215,0,0.12)';
  roundRect(ctx, W / 2 - 105, H / 2 + 88, 210, 38, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.35)';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.fillStyle   = '#A09070';
  ctx.font        = '14px sans-serif';
  ctx.fillText('Tell Us What You Think 🤠', W / 2, H / 2 + 107);
  ctx.restore();
}
```

- [ ] **Step 3: Open file, play to game over, verify**

Expected: Title screen shows "Honky Tonk" with pulsing "Tap to start". Game over screen shows score, pulsing "NEW RECORD!" if applicable, best score, Play Again button restarts the game correctly.

- [ ] **Step 4: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): title and game over screens"
```

---

### Task 8: In-App Feedback Form

**Files:**
- Modify: `honky-tonk.html`

The feedback form is a `<div>` overlay positioned over the canvas — not drawn on canvas. HTML inputs and a Fetch POST to Formspree handle submission. The form is hidden until triggered from the game over screen.

- [ ] **Step 1: Add feedback overlay HTML**

Inside `<div id="wrap">`, immediately after `<canvas id="c"></canvas>`:

```html
<div id="feedback-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:rgba(10,4,8,0.97); border:2px solid #FFD700; box-sizing:border-box; padding:28px; z-index:10;">
  <h2 style="color:#FFD700; font-family:serif; font-size:22px; margin:0; text-align:center;">Tell Us What You Think 🤠</h2>
  <div id="stars" style="display:flex; gap:10px; font-size:34px; cursor:pointer; user-select:none;">
    <span data-v="1">☆</span><span data-v="2">☆</span><span data-v="3">☆</span><span data-v="4">☆</span><span data-v="5">☆</span>
  </div>
  <textarea id="fb-text" rows="4" placeholder="What worked? What could be better?" style="width:100%; max-width:300px; background:#1a0a06; color:#E8DCC8; border:1px solid #555; border-radius:6px; padding:10px; font-size:14px; resize:none; font-family:sans-serif;"></textarea>
  <button id="fb-submit" style="background:#FFD700; color:#0d0608; font-weight:bold; font-size:16px; padding:10px 36px; border:none; border-radius:8px; cursor:pointer;">Submit</button>
  <button id="fb-cancel" style="background:none; border:none; color:#A09070; font-size:14px; cursor:pointer; text-decoration:underline;">Cancel</button>
  <p id="fb-status" style="color:#A09070; font-size:13px; min-height:18px; margin:0; text-align:center;"></p>
</div>
```

- [ ] **Step 2: Add feedback form JS**

```javascript
// ── Feedback form ─────────────────────────────────────────
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
      s.textContent = parseInt(s.dataset.v, 10) <= fbRating ? '★' : '☆';
    });
  });
});

document.getElementById('fb-cancel').addEventListener('click', hideFeedbackForm);
fbSubmitBtn.addEventListener('click', submitFeedback);

function showFeedbackForm() {
  fbRating = 0;
  fbText.value = '';
  fbStatus.textContent = '';
  fbSubmitBtn.textContent = 'Submit';
  starSpans.forEach(s => s.textContent = '☆');
  feedbackOverlay.style.display = 'flex';
}

function hideFeedbackForm() {
  feedbackOverlay.style.display = 'none';
}

async function submitFeedback() {
  if (fbRating === 0) {
    fbStatus.textContent = 'Please pick a star rating.';
    return;
  }
  fbStatus.textContent = 'Sending…';
  fbSubmitBtn.disabled = true;
  try {
    const res = await fetch(FEEDBACK_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        game:            'Honky Tonk',
        rating:          fbRating,
        feedback:        fbText.value,
        score:           score,
        lives_remaining: Math.max(0, lives),
      }),
    });
    if (res.ok) {
      fbStatus.textContent = 'Thanks! 🤠';
      setTimeout(hideFeedbackForm, 1500);
    } else {
      throw new Error('server error');
    }
  } catch {
    fbStatus.textContent = "Couldn't send — try again.";
    fbSubmitBtn.textContent = 'Retry';
    fbSubmitBtn.disabled = false;
  }
}
```

- [ ] **Step 3: Verify form behavior**

Open the file, play to game over, tap "Tell Us What You Think". Expected: dark gold-bordered overlay appears over the game; tapping stars fills them gold; Cancel closes the overlay; Submit without a star rating shows error message. (Live Formspree submission can be tested once the game is deployed.)

- [ ] **Step 4: Commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): in-app feedback form (Formspree)"
```

---

### Task 9: Draw Order Fix + Mobile Verification

**Files:**
- Modify: `honky-tonk.html`

- [ ] **Step 1: Verify ctx.filter is always reset after spotlight drawing**

In `drawSpotlights`, confirm the last two lines before `ctx.restore()` are:

```javascript
ctx.filter      = 'none';
ctx.globalAlpha = 1;
```

If missing, add them. This prevents spotlight blur from bleeding into all subsequent canvas draw calls.

- [ ] **Step 2: Verify draw order in the loop**

The draw calls in `loop` must be in this exact order:
1. `drawSpotlights` (blur on → off)
2. `drawCrowd`
3. `drawStage` (lane guides, floor, hit bar, buttons)
4. `drawNotes`
5. `drawParticles`
6. `drawFeedbacks`
7. `milestoneFlash` overlay block
8. `drawTitle` / `drawHUD` / `drawGameOver` (only the active state)
9. `drawMusicToggle`

Correct any ordering issues found.

- [ ] **Step 3: Verify mobile touch targets**

Tap zones for lanes are `W/3 = 120px` wide each — much wider than the 70px lane buttons. This is intentional and correct: the player taps a zone, not a button. Verify `tapToLane(x)` returns 0 for x<120, 1 for 120≤x<240, 2 for x≥240.

- [ ] **Step 4: Verify AudioContext resume**

In `startGame()`, `ensureAudio()` is called before `startBeat()`. On mobile, the AudioContext starts suspended; `ensureAudio()` calls `AC.resume()`. Verify the beat starts on the first tap (not silent) on a mobile device or mobile emulation.

- [ ] **Step 5: Final commit**

```bash
git add honky-tonk.html
git commit -m "feat(honky-tonk): draw order, mobile audio, touch targets verified"
```

---

### Task 10: Knowledge Base Update

**Files:**
- Create: `docs/game-dev-knowledge/games/03-honky-tonk.md`
- Modify: `docs/game-dev-knowledge/index.md`

- [ ] **Step 1: Create game knowledge file**

```markdown
# Game 03: Honky Tonk

**File:** `honky-tonk.html`
**Theme:** Concert stage, rhythm game
**New techniques:** Web Audio procedural beat, particle system, animated crowd, dynamic spotlight beams

## Key Constants
| Constant | Value | Notes |
|---|---|---|
| W / H | 360 / 640 | Same for all games |
| HIT_Y | 510 | Center of hit detection zone |
| PERFECT_DIST | 20px | ≤20px from HIT_Y |
| GOOD_DIST | 45px | ≤45px from HIT_Y |
| MISS_DIST | 60px | Note exits without hit |
| BPM | 90 | Standard country tempo |
| NOTE_W / NOTE_H | 64 / 24 | Rounded-rect note block |

## Lane Layout
| Lane | X center | Color | Keyboard |
|---|---|---|---|
| 0 | 72 | #FF6B35 orange | A |
| 1 | 180 | #FFD700 gold | S |
| 2 | 288 | #C878F0 purple | D |

## Audio Architecture
- `masterGain` node between all sounds and `AC.destination` — enables beat ducking
- Beat scheduled with look-ahead loop: `while (nextBarTime < AC.currentTime + 1.0)` + `setTimeout(tick, 250)`
- Noise buffers created fresh per hit (avoids AudioBuffer reuse issues)
- Guitar twang: sawtooth, start 5% sharp, `linearRampToValueAtTime(target, t + 0.06)`
- G3/C4/E4 = G major chord → always harmonically consonant when played together

## Musical Coherence Rules
- Notes only spawn on eighth-note grid (every EIGHTH_MS ≈ 333ms)
- Per-lane `minGapMs` prevents same-lane bursts that sound cluttered
- `maxSimul` cap per tick prevents all 3 lanes firing at low density
- Empty taps carry no penalty — player can tap early without punishment

## Density System
| Level | Unlock pts | prob | maxSimul | noteSpeed |
|---|---|---|---|---|
| 1 | 0 | 25% | 1 | 200 px/s |
| 2 | 300 | 40% | 2 | 240 px/s |
| 3 | 700 | 55% | 2 | 290 px/s |
| 4 | 1200 | 70% | 3 | 350 px/s |
| 5 | 2000 | 80% | 3 | 420 px/s |

## Streak → Crowd Energy
`crowdParams(streak)` returns `{amp, freqScale, sway, bright}`. Crowd bobs wider/faster at ×2, sways at ×3, heads lighten at ×4.

## Spotlight Beams
`ctx.filter='blur(3px)'` on triangular cones. Alpha: 0.04 default / 0.10 note-in-lane / 0.18 on hit. MUST reset `ctx.filter='none'` + `ctx.globalAlpha=1` before any other draw calls.

## Lessons
- HTML overlay for the feedback form (not canvas) — native inputs, no custom text rendering needed
- `ctx.filter` bleeds if not reset — reset immediately after blurred draw pass
- Fresh noise AudioBuffers per hit prevent subtle audio sync bugs
- Beat look-ahead scheduler with 1s horizon + 250ms tick works reliably even on throttled mobile CPUs
```

- [ ] **Step 2: Update index.md**

Add the Game 3 row to the Games Built table:

```markdown
| 3 | Honky Tonk | `honky-tonk.html` | Rhythm game, Web Audio, particles | 2026-04-26 |
```

Add to the Quick Reference:

```markdown
- [Game 3: Honky Tonk](games/03-honky-tonk.md) — rhythm, Web Audio, crowd, spotlights, particles
```

- [ ] **Step 3: Commit**

```bash
git add docs/game-dev-knowledge/games/03-honky-tonk.md docs/game-dev-knowledge/index.md
git commit -m "docs: add Honky Tonk knowledge base entry"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in |
|---|---|
| Stage layout (5 zones, 3 lanes) | Task 1 |
| Spotlight beams (blur, opacity reaction) | Task 2 |
| Crowd (18 heads, bobbing, streak escalation) | Task 2 |
| Note fall + draw with glow | Task 4 |
| Beat-grid spawn, density levels 1–5 | Task 4 |
| PERFECT / GOOD / MISS hit detection | Task 5 |
| Scoring 100 × qMult × sMult | Task 5 |
| Streak multiplier thresholds | Task 5 |
| 3 lives, guitar pick icons, game over at 0 | Task 5 |
| Web Audio beat (kick/snare/hihat 90 BPM) | Task 3 |
| Guitar tones G3/C4/E4 sawtooth + twang | Task 3 |
| MISS buzz sound | Task 3 |
| Beat duck on miss | Task 3 |
| Particle bursts PERFECT(12) / GOOD(6) | Task 6 |
| Screen shake (miss 4px, ×4 milestone 6px) | Task 5 |
| Lane miss flash red | Task 5 |
| Streak milestone canvas flash | Task 5 (onHit) |
| HUD (score pill, lives, streak) | Task 6 |
| Music toggle | Task 3 |
| Title screen (pulsing tap prompt, best) | Task 7 |
| Game over (score, NEW RECORD pulse, Play Again, feedback) | Task 7 |
| In-app feedback form (stars, textarea, Formspree) | Task 8 |
| Personal best localStorage | Task 5 |
| Speed escalation per density | Task 4 |
| ctx.filter reset after spotlights | Task 9 |
| Knowledge base update | Task 10 |
| Musical coherence (beat grid, gap, maxSimul) | Task 4 |

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:**
- `burst(x, y, count, color, now)` — stub in Task 5 step 8, implemented in Task 6 step 2. Signature identical. ✅
- `laneFlash` and `laneRedFlash` — both declared in Task 4 step 1, passed to `drawStage(now, laneRedFlash, laneFlash)`. ✅
- `particles` — declared in Task 4 step 1. ✅
- `feedbacks` — declared in Task 4 step 1. ✅
- `milestoneFlash` — declared in Task 4 step 1, set in `onHit` (Task 5 step 3), read in `loop` draw section (Task 4 step 5). ✅
