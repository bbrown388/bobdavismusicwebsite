# Canvas Techniques

## Boilerplate Setup (proven pattern)
```javascript
const W = 360, H = 640;
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
```
CSS: `body { display:flex; justify-content:center; align-items:center; min-height:100vh; overflow:hidden; background:#000; }`
Canvas: `touch-action: manipulation` (prevents double-tap zoom and scroll interference)

## Coordinate Transforms (positioned drawing)
Always use `ctx.save() / ctx.translate() / ctx.rotate() / ctx.restore()` for any positioned object. Never accumulate transforms without saving.
```javascript
function drawThing(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // draw at (0,0)
  ctx.restore();
}
```

## Glow / Bloom Effect (Canvas 2D, no WebGL needed)
Draw the glowing element twice: once blurred (large, transparent stroke), once sharp.
```javascript
// Outer glow
ctx.shadowColor = '#FFE066';
ctx.shadowBlur  = 20;
// draw shape
ctx.shadowBlur  = 0; // always reset after use
```
Or: draw to offscreen canvas, apply `ctx.filter = 'blur(8px)'`, composite back with `lighter` blend mode.

## Multi-layer Parallax
Stack multiple `<canvas>` elements via CSS (`position:absolute; top:0; left:0`). Each layer redraws only what moves. Background (slowest) redraws at reduced frequency or only on scroll events.

## Radial Sky Gradient
```javascript
const sky = ctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, H*0.72);
sky.addColorStop(0, '#1a0d35');
sky.addColorStop(1, '#050208');
ctx.fillStyle = sky;
ctx.fillRect(0, 0, W, H);
```

## Stars Pattern
```javascript
const STARS = [ [x,y,r,opacity], ... ]; // define once as constant
for (const [x,y,r,a] of STARS) {
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
}
ctx.globalAlpha = 1; // always restore
```

## Particle System Pattern
```javascript
const particles = [];
function spawnParticle(x, y, options) {
  particles.push({ x, y, vx: options.vx, vy: options.vy, life: 1, color: options.color, r: options.r });
}
function updateParticles(dt) {
  for (const p of particles) { p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt*2; }
  particles.splice(0, particles.length, ...particles.filter(p => p.life > 0));
}
function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
```

## Screen Shake
```javascript
let shakeUntil = 0, shakeIntensity = 0;
function shake(intensity, durationMs) { shakeUntil = performance.now() + durationMs; shakeIntensity = intensity; }

// In game loop, before any drawing:
if (performance.now() < shakeUntil) {
  ctx.save();
  ctx.translate(
    (Math.random() - 0.5) * shakeIntensity * 2,
    (Math.random() - 0.5) * shakeIntensity * 2
  );
  // ... draw everything ...
  ctx.restore();
}
```

## HUD Pill Helper (proven pattern)
```javascript
function hpill(cx, cy, text, color, w, alpha = 0.65) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = 'rgba(10,5,0,0.75)';
  ctx.beginPath(); ctx.roundRect(cx - w/2, cy - 14, w, 28, 14); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle   = color;
  ctx.font        = 'bold 13px sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}
```

## Silhouette Character Drawing
- Use dark fills only: `#1a0520`, `#2a0f30`
- `roundRect` for body parts (requires Chrome 99+, FF 112+, Safari 15.4+)
- `ellipse` for heads/shadows
- Shadow ellipse: `ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.ellipse(0, 6, 28, 7, 0, 0, Math.PI*2);`
- Always translate to character's base point (feet for standing, center for flying), draw relative to (0,0)

## Guitar Pick Shape
```javascript
ctx.beginPath();
ctx.moveTo(0, -16);
ctx.quadraticCurveTo(17, -8, 13, 10);
ctx.quadraticCurveTo(0, 18, -13, 10);
ctx.quadraticCurveTo(-17, -8, 0, -16);
ctx.closePath();
```

## Moon with Glow
```javascript
// Glow halo (large radial gradient filled over whole canvas)
const glow = ctx.createRadialGradient(mx, my, r*0.7, mx, my, r*2.2);
glow.addColorStop(0, 'rgba(255,224,102,0.09)');
glow.addColorStop(1, 'rgba(255,224,102,0)');
ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

// Moon disk (radial gradient)
const moonG = ctx.createRadialGradient(mx-3, my-3, 0, mx, my, r);
moonG.addColorStop(0, '#FFF9E0'); moonG.addColorStop(0.6, '#FFE066'); moonG.addColorStop(1, '#F4C842');
ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI*2);
ctx.fillStyle = moonG; ctx.fill();
```

## ctx.filter for Blur (Canvas 2D native)
```javascript
ctx.filter = 'blur(4px)';
// draw blurred elements
ctx.filter = 'none'; // must reset
```
Note: `ctx.filter` re-renders elements blurred. Useful for soft glows. Performance cost — use sparingly.
