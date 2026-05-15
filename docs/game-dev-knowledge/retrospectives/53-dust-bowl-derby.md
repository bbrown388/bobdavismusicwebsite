# Retrospective: Game 53 -- Dust Bowl Derby

**Date:** 2026-05-15
**File:** `dust-bowl-derby.html`
**Tests:** 66 pass

---

## What Was Built

Top-down demolition derby in a frontier dust arena. The player drives a battered 1930s-era jalopy through a dirt oval, ramming rival cars to full body damage while managing two simultaneous resources. Three escalating rounds: one rival, two rivals, three rivals. Survive all three rounds to become Derby Champ.

**Controls:** Three virtual buttons at bottom of canvas -- LEFT arrow (turn counterclockwise), BOOST (burst speed + heat generation), RIGHT arrow (turn clockwise). Car always moves forward; steering changes heading. Keyboard fallback: ArrowLeft/ArrowRight/Space.

**Engine Heat gauge (left, amber):** Rises at 48/s while boosting, falls 20/s when not. Reaches 100 = stall for 1.6s -- engine cuts out, car stops, boost locked out for 2.8s cooldown. Forces offensive/defensive pacing.

**Body Damage gauge (right, red-to-green):** Rises on collision (2-14 per hit depending on relative impact speed). Reaches 100 = eliminated. Player elimination = gameover. Rival elimination = +500 score + dust burst.

**Rival AI:** Each rival continuously steers toward player using `atan2` angle tracking with angular clamping. Occasionally boosts (0.3% per frame, 1.2s burst). Rivals also overheat if they boost too long (overheating at 50% the HEAT_RISE rate), adding a natural breathing rhythm to their aggression.

**Physics:** Velocity-based car model -- each car has (vx, vy) = speed * (cos angle, sin angle). Collision impulse: relative velocity projected onto collision normal, applied symmetrically. Ellipse arena boundary uses normalized ellipse check; out-of-bounds cars pushed back and velocity reflected along ellipse normal.

**Barrel obstacles:** 8 barrels placed at 70% ellipse radius evenly distributed. Deflect cars with +3 damage on contact.

**Round progression:** Clearing a round increments round counter and spawns fresh rivals (1, 2, 3). Player gets partial damage/heat heal between rounds. 2.6s intermission overlay. Bonus +350 per round cleared, +1200 on final win.

---

## What Raised the Bar vs. Game 52

1. **First vehicular combat mechanic in series**: All prior driving/movement games (On the Road, Dust Storm, Outlaw Run, Dust Road Derby, River Run) involve navigation or obstacle avoidance. Dust Bowl Derby introduces offensive ramming -- the primary goal is to collide, not to avoid colliding. This inverts the movement paradigm: closing distance is the objective, not maintaining it.

2. **First arena-survival format with simultaneous dual-resource drain**: Engine heat and body damage both rise continuously -- one from player choices (boosting), one from rival behavior (impacts). Neither can be zeroed by a single recovery action; both must be managed across the whole session. The tension between "boost more to ram faster" and "heat builds toward stall" creates a throttle management layer absent in all prior games.

3. **First physics-impulse collision response used offensively**: Prior collision physics (Tumbleweed Pinball bumpers, River Run boulders, Dust Devil obstacles) are all passive -- they deflect or damage the player. In Dust Bowl Derby, the impulse exchange is bidirectional: high-speed rams generate large impulses that knock rivals off course and add significant damage. The player must optimize approach angle and relative velocity to maximize ram damage while minimizing self-damage.

---

## Technical Implementation

**State machine:** title -> playing -> gameover (with intermissionTimer gating between rounds)

**Arena:**
```
ARENA_CX=180, ARENA_CY=285, ARENA_RX=150, ARENA_RY=210
isInsideArena(x,y): (x-cx)^2/RX^2 + (y-cy)^2/RY^2 <= 1
pushInsideArena: normalize to ellipse, push to 88% of boundary, reflect velocity
```

**Car physics:**
```
vx = cos(angle) * speed
vy = sin(angle) * speed
x += vx * dt; y += vy * dt
Steering: angle += steerDir * STEER_RATE * dt  (2.8 rad/s)
```

**Collision impulse:**
```
nx,ny = unit vector along collision axis
relV = (a.vx - b.vx)*nx + (a.vy - b.vy)*ny
a.vx -= nx*relV; a.vy -= ny*relV
b.vx += nx*relV; b.vy += ny*relV
dmg = clamp(round(impactSpeed/9), 2, 14)
```
Note: impulse is fully elastic (coefficient=1) -- energy is conserved. This means glancing hits barely matter and head-on hits are dramatic, which is correct derby behavior.

**Rival AI (simple but effective):**
```
targetAngle = atan2(player.y - rival.y, player.x - rival.x)
diff = normalize(targetAngle - rival.angle) to [-PI, PI]
rival.angle += sign(diff) * min(|diff|, RIVAL_STEER * dt)  // capped to prevent overshoot
```

**Boost boost logic:**
- Player: `boostHeld && car.boostCooldown <= 0` → speed=BOOST_SPEED, heat rises
- Rival: random 0.3% per frame → 1.2s boost burst, heat rises at 50% rate
- Both: stall at STALL_HEAT=100 → stallTimer set → vx=vy=0 for duration

**Audio stack:**
- Engine: sawtooth oscillator 80-160Hz, gain 0.055 (always on during play)
- Boost activation: sawtooth sweep 55→110Hz, 0.25s
- Collision: bandpass noise (350Hz lowpass) + sine thud (110→42Hz exponential), intensity-scaled
- Stall: sawtooth decay 78→28Hz, 0.45s
- Rival elimination: three descending square wave notes (440/352/280Hz, 100ms apart)
- Win: C major arpeggio triangle waves (523/659/784/1047Hz)

**Particles:** Dust bursts on collision (10 particles, speed 55), wall bounce (4 particles, speed 28), elimination (22 particles, speed 85). Life=1.0, decays at 1.6/s. Color: `hsl(28,55%,28-56%)` warm brown.

**Test API (`window.__dbd`):** Full getters/setters for all state. Key additions: `bestScore` setter (required for localStorage test isolation), `intermissionTimer` setter (for pausing tests mid-round). Functions exposed: `startGame`, `update`, `spawnRound`, `collide`, `isInsideArena`, `pushInsideArena`, `addDust`, `addPopup`.

---

## Bugs Fixed This Session

- **Particles test generating new particles**: After killing rivals, round-clear fired and `spawnRound` created new active rivals that collided with player and generated dust. Fixed by adding a dummy stalled alive rival to block round-clear while particles are being monitored.
- **bestScore not writable from test**: `bestScore` was get-only in test API. Fixed by adding `set bestScore(v) { bestScore = v; }`.
- **"boost increases car speed" test**: Used `window` in Node.js assert context. Fixed by using `page.evaluate` for the assertion.
- **"rival eliminated" test**: After elimination, `spawnRound` replaced the `rivals` array with new entries, so checking `rivals[0].alive` after update returned the new rival (alive=true). Fixed by capturing the rival object reference inside `evaluate` before calling `update`.

---

## Test Architecture Notes

- 66 tests across 15 suites
- Arena geometry: `isInsideArena` tested at center, outside corner, and near-edge
- `pushInsideArena`: verified that (0,0) placed car ends up inside
- Steering: angle change direction verified for left/right hold + 0.1s frame
- Boost/heat: heat rise at 0.2s boost, heat fall at 0.2s idle, stall trigger at threshold
- Collision: overlapping cars tested for return value, damage to both, separation distance, damage cap
- Round progression: round increment, intermission timer, new rival count at round 1
- localStorage: reset `bestScore` variable directly in test to ensure score comparison works
- Particles: dummy stalled rival prevents round-clear from spawning active rivals during decay test
- Console error sweep: load-time + full 3-round cycle (skipping AudioContext errors as expected)

---

## Action Items for Game 54

- Continue with Smoke Signal (timed pattern communication) per queue
- The ellipse arena boundary (isInsideArena + pushInsideArena) is a clean reusable primitive for any circular-arena game
- Velocity-based car physics + impulse collision is the pattern to use for any vehicle game; don't reinvent
- The rival dummy-stall pattern in tests (alive=true but stallTimer=high to freeze state without triggering round transitions) is a useful test isolation technique
- The dual-resource drain format (player-controlled + environmental) works well for sustained tension -- can adapt to any game where one resource is managed and one is threatened
