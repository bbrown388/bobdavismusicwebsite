# Retrospective: Game 49 — Lariat Spin

**Date:** 2026-05-13
**File:** `lariat-spin.html`
**Tests:** 35 pass

---

## What Was Built

Physics-based rope spinning skill game. Player taps rhythmically to add angular impulse to a spinning lasso loop. The rope ellipse expands as omega increases, visually communicating momentum. A speed bar shows current omega vs. the sweet zone (OPTIMAL_MIN=8 to OPTIMAL_MAX=12 rad/s). Once fast enough, the player releases (THROW button) at the right angle to catch a moving steer. Five rounds with escalating target speed, catch requirements, and tighter aim tolerance.

**Mechanics introduced:**
- Rotational physics: angular velocity (omega), exponential drag decay (`omega * DRAG^dt`), max cap with collapse zone
- Momentum-accumulation + precision-release dual-phase (build speed, then aim+throw)
- Rope radius that scales with omega (visual momentum feedback)
- Collapse mechanic: over-spinning drops the rope entirely
- Aim indicator shows throw trajectory and highlights when aligned with target
- Sweet zone band on speed bar signals optimal throw window

---

## What Raised the Bar vs. Game 48

1. **Physics simulation**: First game with explicit angular velocity dynamics, drag decay, and physical state visible on-screen through rope geometry. Not reaction timing or state matching - a continuous physics system players manipulate.
2. **Dual-phase skill mechanic**: Build phase (tap to accumulate omega) and precision phase (aim and throw) are distinct, requiring two different skills. No prior game had this structure.

---

## Technical Implementation

**State machine:** title → round_intro → spinning → thrown → result → (repeat or gameover/win)

**Key physics:**
- `omega` adds `TAP_IMPULSE=2.8 rad/s` per tap, decays at `DRAG=0.78` exponent per second
- `theta` advances by `omega * dt` each frame (rope rotation)
- `ropeRadius()` = `MIN_ROPE_R + (MAX_ROPE_R - MIN_ROPE_R) * min(omega / COLLAPSE_OMEGA, 1)`
- Rope drawn as 52-segment ellipse with wobble term `wob * sin(a * 3 + theta * 2.5)`
- `throwLandX(theta)` = `HAND_X + cos(theta) * AIM_REACH` — horizontal projection of throw
- `flyThrow` animates a lasso loop traveling from tip to target over `dist / THROW_SPEED` seconds
- Hit detection: `|flyThrow.tx - target.x| <= ROUNDS[roundNum].aimTolerance * 80`

**Collapse mechanic:** omega > COLLAPSE_OMEGA triggers `triggerCollapse()` — zeros omega, sets 900ms cooldown. During cooldown, taps ignored and rope not drawn.

**Target:** scrolls horizontally at `targetSpeed px/s`, wraps at canvas edges.

**Audio:**
- `playTap()`: triangle oscillator 300→180Hz chirp, 0.15 gain
- `playCatch()`: C major arpeggio [261.6, 329.6, 392, 523.2Hz] with staggered onset
- `playMiss()`: sawtooth 320→120Hz slide, 0.18 gain
- `playCollapse()`: bandpass-filtered noise burst, 220Hz center, Q=1.2

---

## Bugs Fixed This Session

1. **`popups` undefined at startup** — The game loop starts before `startGame()` is called, so `popups.filter()` crashed on the first frame. Fixed by initializing `popups = []` alongside `state = 'title'` in the init block.

2. **`flyThrow` missing setter in `__ls` API** — Tests set `window.__ls.flyThrow = {...}` but only a getter was defined; the assignment created a property on `__ls` without writing the internal variable. Added `set flyThrow(v) { flyThrow = v; }` to the API object.

3. **Test race conditions** — Several tests split setup and assertion across two `page.evaluate()` calls. The game loop fires between them and processes state transitions (e.g., calling `landThrow()` before the test did, or draining `resultTimer` from 0). Fixed by combining setup + call into single evaluate blocks.

---

## Test Architecture Notes

**Pattern for action tests:** Setup (startGame, set state, set vars) + call action + read result — all in one `page.evaluate()`. Splitting into multiple evaluate calls is a race condition waiting to happen because `requestAnimationFrame` fires between calls.

**flyThrow t=0, duration=10 pattern:** When testing `landThrow()` directly, set `flyThrow.t = 0` and `duration = 10` so the game loop doesn't auto-trigger `landThrow()` first (which it would if `t/duration >= 1`).

---

## Action Items for Game 50

- Continue with Tin Pan Alley (melody-completion puzzle) per queue
- Consider adding a visual rope twirl effect on collapse that's more dramatic
- The sweet zone concept (build to right speed range, then execute) is strong — worth reusing in future skill-toy mechanics
