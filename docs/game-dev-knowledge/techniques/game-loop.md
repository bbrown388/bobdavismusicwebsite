# Game Loop Patterns

## State Machine (proven pattern)
```javascript
let state = 'title'; // 'title' | 'playing' | 'gameover'
// In loop:
if (state === 'title')    { drawTitle(); }
else if (state === 'playing') { update(dt, now); drawScene(); drawHUD(); }
else                          { drawGameOver(); }
```

## Delta Time Game Loop
```javascript
let lastTime = 0;
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms (protects against tab backgrounding)
  lastTime = now;
  ctx.clearRect(0, 0, W, H);
  // update + draw
  requestAnimationFrame(loop);
}
requestAnimationFrame(t => { lastTime = t; loop(t); });
```

## Speed Escalation (proven pattern)
```javascript
const SPEED_UP_EVERY = 500; // pts
const SPEED_FACTOR   = 1.08; // 8% per step
let nextSpeedAt = SPEED_UP_EVERY;

function checkSpeedUp() {
  if (score >= nextSpeedAt) {
    lassoSpeed *= SPEED_FACTOR;
    itemSpeed  *= SPEED_FACTOR;
    nextSpeedAt += SPEED_UP_EVERY;
  }
}
// Only call after scoring — speed only goes up when player is succeeding
```

## Weighted Spawn Pool
```javascript
// Simple: just repeat entries proportionally
const POOL = ['common','common','common','uncommon','uncommon','rare'];
const pick = POOL[Math.floor(Math.random() * POOL.length)];
```

## Input Cooldown + Freeze Pattern
```javascript
let throwFreezeUntil = 0, cooldownUntil = 0;

function handleAction(now) {
  if (now < cooldownUntil) return; // too soon
  throwFreezeUntil = now + FREEZE_MS;   // briefly pause the thing
  cooldownUntil    = now + COOLDOWN_MS; // prevent spam
  // ... resolve action ...
}
// In update:
if (now >= throwFreezeUntil) { /* resume normal physics */ }
```

## Feedback Float-Up System
```javascript
const feedbacks = [];
function addFeedback(text, x, y, color) {
  feedbacks.push({ text, x, y, color, born: performance.now() });
}
function drawFeedbacks(now) {
  feedbacks.splice(0, feedbacks.length, ...feedbacks.filter(f => now - f.born < FEEDBACK_MS));
  for (const f of feedbacks) {
    const age = now - f.born;
    ctx.save();
    ctx.globalAlpha     = 1 - age / FEEDBACK_MS;
    ctx.fillStyle       = f.color;
    ctx.font            = 'bold 16px sans-serif';
    ctx.textAlign       = 'center';
    ctx.textBaseline    = 'middle';
    ctx.fillText(f.text, f.x, f.y - age * 0.025); // gentle upward drift
    ctx.restore();
  }
}
```

## Item Spawning with Sine Wobble
```javascript
function spawnItem() {
  const fromLeft = Math.random() < 0.5;
  const baseY    = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
  items.push({
    x: fromLeft ? -32 : W + 32,
    baseY, y: baseY,
    vx: (fromLeft ? 1 : -1) * (speed + Math.random() * 20),
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleAmp:    12 + Math.random() * 18,
    wobbleFreq:   1.5 + Math.random() * 1.0,
    age: 0,
  });
}
// In update:
item.y = item.baseY + Math.sin(item.wobbleOffset + item.age * item.wobbleFreq) * item.wobbleAmp;
```

## localStorage Personal Best
```javascript
const STORAGE_KEY = 'game_slug_best';
let bestScore = 0;
function loadBest() { bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10); }
function saveBest() {
  if (score > bestScore) { bestScore = score; localStorage.setItem(STORAGE_KEY, bestScore); }
}
```

## Touch Input (unified tap/click handler)
```javascript
function getXY(e) {
  const r = canvas.getBoundingClientRect();
  const s = e.touches ? e.touches[0] : e;
  return { x: (s.clientX - r.left) * (W / r.width), y: (s.clientY - r.top) * (H / r.height) };
}
canvas.addEventListener('touchstart', onTap, { passive: false });
canvas.addEventListener('click', onTap);
// In onTap: e.preventDefault() always. Check state first, then handle input.
```

## Web Audio API (procedural sound — no files needed)
```javascript
const AC = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, gainVal = 0.3) {
  const osc  = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain); gain.connect(AC.destination);
  osc.type = type; // 'sine' | 'square' | 'sawtooth' | 'triangle'
  osc.frequency.setValueAtTime(freq, AC.currentTime);
  gain.gain.setValueAtTime(gainVal, AC.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + duration);
  osc.start(); osc.stop(AC.currentTime + duration);
}

// Resume AudioContext on first user gesture (browser requirement):
function ensureAudio() { if (AC.state === 'suspended') AC.resume(); }
canvas.addEventListener('touchstart', ensureAudio, { once: true });
canvas.addEventListener('click', ensureAudio, { once: true });
```

## Particle Burst on Event
```javascript
function burst(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 1, color, r: 3 + Math.random()*3 });
  }
}
```
