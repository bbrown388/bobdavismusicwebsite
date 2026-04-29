# Retrospective: Midnight Rodeo (Game 14)

**Date:** 2026-04-29
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First balance/input-matching mechanic in the series** -- all prior 14 games use spatial dodge, matching, timing, or knowledge mechanics. Midnight Rodeo introduces a directional response mechanic: the bull telegraphs LEFT, RIGHT, or STRAIGHT, and the player must tap the corresponding half of the screen before the telegraph window expires. This is fundamentally different from everything prior -- the player is responding to a predicted direction, not reacting to a collision or matching a static recipe.

- **Crowd energy multiplier system** -- the `crowd` variable (0-1) acts as a persistent score multiplier (1x at 0%, 3x at 100%). Correct responses raise it (+20%), wrong ones drain it (-25%), and it slowly decays over time (-0.8%/s). This creates a skill curve within a single run: a player on a hot streak earns disproportionately more than one who barely survives. The multiplier is displayed live as a floating "x1.4" under the score, so players understand it immediately.

- **Three-level difficulty escalation** -- telegraph window shrinks (0.70s -> 0.52s -> 0.36s) and riding gaps shorten (1.4s -> 1.1s -> 0.75s) every 14 seconds. Level advancement is invisible except for a small "LVL 2" indicator, which keeps the difficulty pressure building without announcing it.

- **Direction arc timer** -- during the telegraph phase, a partial arc (like a countdown clock face) draws around the center of the screen, shrinking from full circle to zero as the window expires. It turns red when under 40% remaining. Players instinctively read this as urgency, making the timing pressure legible without any text.

- **Bull lean animation** -- `bullLean` interpolates toward the bull's spin direction during telegraphing (lerp with rate 9), and `riderLean` counters it (rate 7). On a LEFT telegraph, the bull shifts visually left while the rider tilts right. This makes the direction cue double-coded: the screen arrow AND the bull's body movement both signal the required tap.

- **Spotlight and arena art** -- two cone gradients from the top corners illuminate the arena center, fading to black at the edges. The crowd silhouettes at the horizon, fence rails with posts, and starfield night sky establish the midnight rodeo setting immediately, with no text needed.

- **tickFrames + forcePhase/forceBullDir test helpers** -- the test suite uses a combination of forcePhase (sets bullPhase with timer=0, expires on next tick) and forceBullDir to deterministically control the phase machine. This allowed 31 clean suites without relying on random direction selection or real-time timing.

- **31 tests, all pass** -- covers: title (1), canvas dimensions (2), startGame state (3), riding phase (4), mistakes=0 (5), crowd=0.5 (6), score=0 (7), valid directions (8), correct left (9), correct right (10), wrong left (11), wrong right (12), STRAIGHT always correct (13), crowd up on correct (14), crowd down on wrong (15), crowd floor=0 (16), score increases (17), crowd multiplier (18), 3 mistakes -> dead (19), dead screen (20), phase cycle (21), tap-phase guard (22), level advance (23), localStorage (24), new record (25), canvas content (26), bull lean (27), feedback overlay (28), full cycle (29), tickFrames sync (30), console error sweep (31).

---

## What Caused Friction

- **Phase timer expiry floating point** -- the `rideDur()` = 1.4s should expire after 84 ticks at 1/60 each. However, accumulated floating point subtraction of 1/60 means the exact tick count at which phaseTimer <= 0 varies. Suite 21 initially used `tickFrames(90)` to check the phase AFTER the evaluate block, but the RAF loop could fire between evaluate calls and advance the state further (cycling back through telegraphing, bucking, recovering, and re-entering riding). Fix: moved startGame + tickFrames + getBullPhase into a single evaluate block to prevent RAF interleaving, and used forcePhase-based testing for the phase cycle.

- **forcePhase initial timer** -- the first version set `phaseTimer = telDur()` on forcePhase, meaning tests needed ~42 tickFrames just to expire the telegraph. Changed to `phaseTimer = 0` so the phase expires on the very next tick, making tests fast and predictable.

- **Suite 20 (dead screen pixel)** -- checking the dead screen via pixel required the game to actually reach 'dead' state. With `tickFrames(40)` per wrong tap and phaseTimer = original value (0.7s = 42 ticks), only 40 ticks wasn't enough. After fixing phaseTimer = 0 and increasing to 60 ticks/cycle, suite 20 passes reliably.

---

## Bugs Caught Before Shipping

- **evaluateTap during natural phase cycling**: when `tickFrames(n)` runs a full ride → telegraph → buck cycle without a forced direction, the randomly selected bullDir might be LEFT or RIGHT with `playerTap = null`, counting as a mistake. This could cause unintended death during tests that don't explicitly set bullDir. Fix: suite 21 uses `forceBullDir(0)` (STRAIGHT) to ensure evaluateTap always succeeds.

---

## Action Items for Game 15

1. **Wind direction HUD element** -- Prairie Fire (Game 15) will have dynamic wind. The Midnight Rodeo crowd energy bar is a good precedent for a vertical side-bar indicator. Consider a wind vane or compass-style arrow as HUD.

2. **Tap feedback visual** -- Midnight Rodeo shows popups ("RIDE EM!", "SLIPPING!") but no brief screen flash on correct/wrong. A quick green/red border flash would give additional confirmation without cluttering the scene.

3. **Persistent streak counter** -- Action item from Game 13 retro (combo streak). Not implemented in Game 14. Game 15's strategy/placement mechanic doesn't naturally lend itself to streaks, but Game 16 (Moonshine Run) could use it.

4. **Rider throw arc** -- the `riderFly` object launches the rider on 3rd mistake but the animation may be short-lived (life decays at 0.8/s, flies off-screen quickly). Future games could use longer physics arcs for dramatic effect.

5. **Dynamic music SFX** -- crowd audio reacts to `crowd` variable (gain modulated by crowd energy). This pattern -- ambient audio that responds to game state -- should be reused in Prairie Fire (fire crackle intensity) and Moonshine Run (still bubbling rate).

---

## What Raised the Bar vs. Game 13

| Dimension | Snake Oil (13) | Midnight Rodeo (14) |
|---|---|---|
| Input model | Tap ingredient + scroll tray | Directional tap (left/right half) |
| Timing pressure | Per-customer timer bar | Shrinking arc window (0.7 -> 0.36s) |
| Score depth | Time bonus per correct serve | Crowd multiplier (1x - 3x) compounding |
| Difficulty escalation | Ailment pool expands | Window shrinks + ride gaps shorten |
| Audio response | Feedback tones | Crowd noise modulated by game state |
| Visual storytelling | Wagon backdrop + customer walk-in | Arena spotlights + bull lean + rider counter-lean |
| Test count | 30 | 31 |
| Phase machine | Linear update loop | Multi-phase state machine (riding/telegraphing/bucking/recovering) |
