# Retrospective: Game 57 -- Canyon Run

**Date:** 2026-05-18
**File:** `canyon-run.html`
**Tests:** 65 pass

---

## What Was Built

First-person perspective obstacle runner down a canyon. The player sprints along a three-lane road that converges to a vanishing point at the center-top of the screen. Obstacles (rocks, tumbleweeds, cacti) are born at `SPAWN_Z=2200` world units away and advance toward the camera each frame. Their screen position and size are derived from perspective projection math, so they start tiny near the vanishing point and grow to fill the screen as they close in. Tap left or right to dodge between lanes. Three lives, five stages with escalating speed and spawn rate.

**Controls:** Tap/click left half of canvas to move left lane, right half to move right lane. Arrow keys and WASD also supported. Space/Enter starts from title.

**Perspective system:**
- Vanishing point: `(VP_X=180, VP_Y=200)`
- Focal length: `FOCAL=200`
- Projection: `t = FOCAL / (worldZ + FOCAL)`, `screenX = VP_X + worldX * t`, `screenY = VP_Y + GROUND_H * t`
- At `worldZ=0` (player): `t=1.0`, objects at full scale
- At `worldZ=2200` (spawn): `t≈0.083`, objects tiny near VP
- Scale factor `t` drives both screen position and obstacle rendered size

**Obstacle types:**
- `rock`: stationary, large (radius=52 base), highest threat
- `tumbleweed`: drifts laterally across lanes with `driftDir`, bounces at lane boundaries, spins (`spin += 2.8*dt`)
- `cactus`: stationary, narrow (radius=26 base), appears from stage 2 only

**Lane system:** Three world-X positions `LANES=[-110, 0, 110]`. Player snaps smoothly with `playerX += (LANES[playerLane] - playerX) * Math.min(1, 10*dt)`.

**Collision:** At `worldZ < COLLISION_Z=60`, obstacle `passed` flag checked. If `|obs.worldX - playerX| < LANE_W=68` and `invTimer <= 0`: HIT. Within `|dx| < LANE_W*2.0`: close dodge +50 bonus.

**Stage progression:** Five stages each 16 seconds, speed 320→760 world-units/s, spawnRate 0.50→1.22/s. Stage clear adds +300 score and a 1.8s freeze with stage label overlay. Completing stage 5 wins.

**Close dodge bonus:** When an obstacle passes the player within 2x lane width (but not a hit): +50 score, playDodge() chime.

---

## What Raised the Bar vs. Game 56

1. **First pseudo-3D depth illusion in series:** All prior games used flat 2D coordinates. Canyon Run implements a perspective projection system where worldZ drives both screen position AND rendered scale. Objects genuinely "grow" from the vanishing point as they approach. The canyon wall silhouettes, road edge lines converging to VP, and scrolling depth stripe markers all reinforce the 3D illusion. No prior game in the 56-game series used perspective math.

2. **First frame-rate-independent obstacle approach system:** Prior runner games (On the Road, Stampede) used fixed-pixel-per-frame movement. Canyon Run uses world-space physics: obstacles have a `worldZ` coordinate that advances at `speed * dt` world-units per second. The perspective projection converts world position to screen position each frame. This is a step toward a true 3D engine.

3. **Richer environment rendering:** Canyon wall silhouettes (three depth layers per side with jagged rock profiles using sine-modulated vertices), scrolling perspective road stripes (five stripe markers that loop at SPAWN_Z), per-obstacle radial gradient shadows, danger flash pulse on approaching obstacles, star twinkle on title. Significantly more visual complexity than Dead Eye's static background.

---

## Technical Implementation

**Canvas layout (playing state):**
- Sky gradient (dark purple → dark red): y=0 to VP_Y+55
- Fixed star field (15 positions) with time-based twinkle
- Ground triangle (VP to canvas corners): VP_Y to H=640
- Canyon walls: 3-layer silhouettes each side, jagged rock profile
- Road markings: edge lines from VP to corners, dashed lane dividers, scrolling depth stripes
- Obstacles (sorted back-to-front by worldZ): rock, tumbleweed, cactus with drop shadow
- Player: two animated boots at canvas bottom, lane indicator dots
- HUD: score pill (top center), lives dots (top left), stage label (top right), stage progress bar, feedback link

**State machine:**
```
'title' → startGame() → 'playing'
'playing' → endGame(won) → 'result'
'result' → click → startGame() → 'playing'
```

**Obstacle object schema:**
```javascript
{ type, lane, worldX, worldZ, driftDir, spin, passed }
```

**Stripe depth markers:** Five `stripeZs` values cycle: `stripeZs[i] -= speed*dt; if(stripeZs[i] < 0) stripeZs[i] += SPAWN_Z`. Drawn as narrow trapezoids widening toward the player.

**Audio:**
- `startWind()`: bandpass noise loop (240Hz, Q=0.4), gain 0.055 -- ambient canyon wind during play
- `playHit()`: sawtooth pitch-fall (130→42Hz) + bandpass noise burst
- `playDodge()`: sine chirp up (520→880Hz), gain 0.14
- `playStageUp()`: C-major arpeggio (523/659/784/1047Hz), triangle waves staggered 110ms

**Test API (`window.__run`):** Getters/setters for state, stage, lives, score, playerLane, playerX, invTimer, stageTimer, transTimer, spawnTimer, resultWon, obstacles, stripeZs, speed, best. Exposed: STAGES, LANES, FOCAL, VP_X, VP_Y, GROUND_H, SPAWN_Z, COLLISION_Z, LANE_W, OBS_RADIUS, startGame, update, applyStage, handleTap, spawnObstacle, addPopup, project, endGame.

---

## Resumed from Previous Session

The game file (`canyon-run.html`) was fully implemented but uncommitted from a prior session. This session resumed by writing the test file, running all 65 tests, adding the game card, and completing the docs/status update.

---

## Test Architecture Notes

- 65 tests across 11 suites
- Suite 6 (stage progression) drives stage transitions by setting `stageTimer=0.01` and calling `update(0.05)` -- cleaner than time-based waiting
- Collision tests manually place obstacles at `worldZ=COLLISION_Z-1` to force hit-check on next update frame
- Perspective math tested via `project()` API: farther object has smaller scale, `worldX=0` always projects to `VP_X`
- Probabilistic tests (cactus only in stage >=2) run 50 spawn calls to confirm type exclusion

---

## Action Items for Game 58

- Saddlebag (spatial packing puzzle) is next per queue
- The perspective projection pattern (`t = FOCAL / (worldZ + FOCAL)`) is proven reusable for any vanishing-point scene
- For any future runner variant, the LANE_W collision half-width + worldX approach is simpler than per-pixel hit detection
- The "close dodge bonus" (+50 at 2x lane width) is a nice risk-reward touch worth reusing in obstacle games
- The `stripeZs` cycling pattern is clean for any scrolling depth marker system
