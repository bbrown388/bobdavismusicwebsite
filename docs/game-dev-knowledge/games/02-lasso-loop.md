# Game 2: Lasso Loop

**File:** `lasso-loop.html` | **Lines:** ~560 | **Committed:** 2026-04-26

## Concept
Precision timing game. A lasso continuously rotates around a cowboy silhouette. Items drift across a night sky. Single tap throws the lasso — timing must align the loop with an item.

## Mechanic
- Lasso rotates at constant angular speed (clockwise, ~4s/revolution at start)
- Items drift L→R or R→L with sine-wave vertical wobble
- Tap to freeze lasso for 120ms and check hit distance
- PERFECT (<20px): 2× points. GOOD (<36px): 1×. MISS: lose life.
- Danger items (🐍, 🌵) with red warning ring — catching = lose life + reset streak
- Streak ×2/×3/×4, speed escalates every 500pts
- 3 lives

## Technical Highlights

### Radial position pattern
All lasso math uses rotation center + angle + radius:
```javascript
const RCX = W/2, RCY = 356; // rotation center (hand height; ground at y=420)
const ROPE_LEN = 180;        // radius
function loopCenter() {
  return { x: RCX + Math.cos(lassoAngle)*ROPE_LEN, y: RCY + Math.sin(lassoAngle)*ROPE_LEN };
}
```

### Weighted spawn pool
Simple, readable weighted randomness:
```javascript
const SPAWN_POOL = ['pick','pick','pick','pick','pick','shoe','shoe','shoe','cash','cash','cash','snake','snake','cactus'];
const type = SPAWN_POOL[Math.floor(Math.random() * SPAWN_POOL.length)];
```

### Feedback system
```javascript
// Add: feedbacks.push({ text, x, y, color, born: performance.now() })
// Draw: filter expired, float up (y - age*0.025), fade (globalAlpha = 1 - age/FEEDBACK_MS)
```

### HUD pill helper
Reusable for any HUD element:
```javascript
function hpill(cx, cy, text, color, w, alpha=0.65) { /* roundRect pill + centered text */ }
```

### Cooldown + freeze pattern
```javascript
// On throw:
throwFreezeUntil = now + THROW_FREEZE_MS; // lasso pauses
cooldownUntil    = now + COOLDOWN_MS;     // prevents spam
// In update:
if (now >= throwFreezeUntil) { lassoAngle += lassoSpeed * dt; }
```

### Sine wobble for items
```javascript
item.y = item.baseY + Math.sin(item.wobbleOffset + item.age * item.wobbleFreq) * item.wobbleAmp;
```

## Night Sky Technique
- `createRadialGradient` for sky: deep purple center → near-black edge
- Stars as `[x,y,r,opacity]` array, drawn with `globalAlpha`
- Moon: two radial gradients (disk + glow halo), crater details at `globalAlpha=0.22`
- Mesa silhouettes: filled polygons at exact ground line (y=420)
- Cactus silhouettes: `fillRect` combinations for trunk + arms

## What Worked Well
- Rotation center / ROPE_LEN abstraction is very clean and extensible
- Night sky scene renders beautifully from pure canvas
- Weighted pool pattern is readable and easy to tune
- Feedback float-up feels satisfying
- `hpill()` helper is genuinely reusable

## What Could Be Improved
- No particle effects when lasso catches something (sparks, glow burst)
- No screen shake
- No audio (Web Audio API could add satisfying catch sounds)
- Lasso rope is simple bezier — could have more physics-like droop/tension
- Items don't react when caught — just disappear
- No multi-layer parallax (single static background)

## Spec file
`docs/superpowers/specs/2026-04-24-lasso-loop-design.md`
