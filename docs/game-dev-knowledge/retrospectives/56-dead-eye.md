# Retrospective: Game 56 -- Dead Eye

**Date:** 2026-05-17
**File:** `dead-eye.html`
**Tests:** 58 pass

---

## What Was Built

Wind-drift shooting gallery. A crosshair spring-follows the player's aim position while a sine-wave wind continuously pushes it left or right. The wind direction and amplitude are fixed per round; the player must move against the wind to hold steady, then release and fire. Three target types appear: tin cans on fence posts (stationary, $100), wanted posters on a moving line ($200), and horse riders galloping through ($350). Six shots per round, five rounds, win condition $1200 total.

**Controls:** Drag/mouse to move aim point; click/tap/Space to fire. Crosshair spring-follows with SPRING=6/s lag. On touchend, fires at current crosshair position (not aim position) -- the lag is intentional.

**Wind mechanic:**
- `windPhase` advances each frame: `windPhase += (dt / period) * Math.PI * 2`
- `windX = cfg.windAmp * Math.sin(windPhase)` -- oscillates from -amp to +amp
- Crosshair: `crossX += (aimX - crossX) * SPRING * dt + windX * dt` -- spring + wind push
- Clamped to [24, W-24]
- Five periods (3.2, 2.8, 3.8, 2.5, 4.2s) vary the rhythm between rounds

**Spawn system:** Targets spawn on a timer (`spawnTimer`) up to `cfg.targetCount` per round. Tin cans pick a free POST_XS slot; posters and riders spawn from either edge with riderChance scaling from 0% (round 1) to 45% (round 5).

**Hit detection:** `fire(fx, fy)` checks Euclidean distance `d = Math.hypot(fx - t.x, fy - t.y) < TARGET_RAD[t.type]`. Accuracy bonus: `bonus = ratio * TARGET_VAL[type] * 0.5` where `ratio = 1 - d/radius`.

**Round end:** `roundEndTimer = 1.2s` after ammo hits zero, or `1.0s` if all targets clear while ammo remains.

**Bug found + fixed in session:** `hitTarget.value` was undefined in the `fire()` bonus calculation. `spawnTarget()` never sets `.value` on targets. Fixed by replacing `hitTarget.value` with `TARGET_VAL[hitTarget.type]` throughout the bonus calculation.

---

## What Raised the Bar vs. Game 55

1. **First ballistic wind-drift aiming mechanic in series:** Every prior shooting mechanic (Canyon Crossfire, Tin Star Showdown, quick-draw games) involved instant hit detection or static crosshairs. Dead Eye introduces a physics-driven crosshair that continuously drifts under wind force. The spring-follow lag adds a second layer: the crosshair doesn't snap to finger position. Players must account for both where they're aiming AND where the wind will push while the spring catches up. No prior game asked players to model a moving aim point under external force.

2. **First gallery-shooter format in series:** All prior target games had the player as a fixed subject reacting to moving threats. Dead Eye reverses this: the player is the shooter, targets are the objects, and success depends on precision aiming rather than reflexes. The gallery format (three target types at different value/difficulty tiers) is structurally novel.

3. **Richer audio landscape than most prior games:** Full ambient wind drone (bandpass noise loop, muted when idle), gunshot synthesis (noise burst + sawtooth thump), hit sound (square pitch-fall), and empty-clip click. Four distinct audio events covering all outcomes.

---

## Technical Implementation

**Canvas layout:**
- Sky gradient (dark purple → orange-red at horizon): y=0-430
- Stars: 15 fixed positions
- Moon: arc at (306, 58) with shadow circle
- Mesas: three trapezoid silhouettes
- Ground gradient: y=430-640
- Fence: rails + 6 posts at POST_XS=[28, 88, 148, 208, 268, 328]
- HUD strip: top 42px

**State machine:**
```
'title' → startGame() → 'playing'
'playing' → endRound() → 'round_result'
'round_result' → nextRound() [if round<4] → 'playing'
                           [if round>=4] → 'result'
'result' → click → startGame() → 'playing'
```

**Target object schema:**
```javascript
{ type, x, y, vx, alive, age, hit, hitTimer, maxLife, fromLeft, postIdx? }
```

**Wind gauge:** Draws at bottom (y=572), shows normalized `windX` as a bar filling from center outward, with direction arrow overlay.

**Ammo display:** 6 bullet silhouettes at y=610, gold when loaded, dark when spent.

**Test API (`window.__eye`):** Full getters/setters for state, round, totalScore, roundScore, ammo, crossX, crossY, aimX, aimY, windX, windPhase, targets, spawnedCount, roundEndTimer. Exposed: startGame, startRound, endRound, nextRound, fire, spawnTarget, update, all constants.

---

## Bugs Fixed This Session

1. **`hitTarget.value` undefined bug:** `fire()` used `hitTarget.value` for the accuracy bonus but `spawnTarget()` never sets `.value`. Score calculation produced `NaN`, so hits returned $0. Fixed by using `TARGET_VAL[hitTarget.type]` consistently.

---

## Test Architecture Notes

- 58 tests across 11 suites
- Suite 5 (firing & hit detection) manually inserts targets at known coordinates to test hit/miss logic deterministically
- Suite 7 (wind) uses `update(dt)` to advance simulation state in test context
- Suite 9 (target lifecycle) tests both age-expiry and hitTimer persistence in sequence within a single test
- Probabilistic spawn tests (cans, posters, riders) use 10-30 loop iterations to ensure type distribution

---

## Action Items for Game 57

- Canyon Run (first-person perspective obstacle runner) is next per queue
- The spring-follow + external-force pattern (`crossX += (aimX - crossX) * SPRING * dt + force * dt`) is clean and reusable for any physics-driven cursor
- The per-round oscillation period array (WIND_PERIODS) makes rhythm variation per level a one-liner -- keep for any oscillating hazard system
- Gallery shooter format (spawned targets, limited ammo, accuracy bonus) is proven and testable -- reusable for any future shooter variant
