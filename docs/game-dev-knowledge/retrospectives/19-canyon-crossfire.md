# Retrospective: Canyon Crossfire (Game 19)

**Date:** 2026-05-02
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First shooter mechanic in the series** — Cover-based gameplay introduces a risk/reward exposure system completely new to the series. Player fires from behind a boulder, exposed for 0.55s per shot (PEEK_DUR). Any outlaw that transitions to FIRING during the exposure window deals damage. Staying covered is survival.

- **Staggered outlaw reload patterns create tactical reading** — Three outlaws (Slim, Hank, Dagger) have distinct cycle durations:
  - **Slim** (closest, largest): watchDur=2.8s, reloadDur=1.8s — most frequent threat
  - **Hank** (mid-range): watchDur=3.4s, reloadDur=2.4s — moderate threat
  - **Dagger** (farthest, smallest): watchDur=4.0s, reloadDur=3.0s — rarest threat, safe longest
  - Dagger starts in RELOADING on session init to give player an immediate safe window and orient them to the mechanic

- **Three-state outlaw cycle: watching → firing → reloading → watching** — Visual state indicators (red depleting bar = watching, green filling bar = reloading, orange flash = FIRE!) make it trivially readable at a glance. Players learn to fire during green bars.

- **Visible ballistic projectiles** — Both player shots (gold dots) and outlaw shots (red dots) travel across the canvas with animated trails. Player bullet dur=0.22s, outlaw bullet dur=0.30s. Gives physical confirmation of the exchange.

- **Depth illusion from scale** — Outlaws are drawn at scale 1.0, 0.74, and 0.55 respectively. The smallest appears farthest away. Combined with the canyon background (right wall receding upward), the scene reads as a 2.5D space without any 3D math.

- **Hit flash + EXPOSED/COVERED HUD** — Screen flashes red on player hit (hitFlash alpha * 2.2). Top-right label shows COVERED (green) or EXPOSED (red) so players always know their risk state at a glance.

- **Target ring auto-advances** — After eliminating an outlaw, targetIdx advances to the next living outlaw. Gold ring follows the target. No manual selection needed — keeps the flow uninterrupted.

- **36 tests, all pass** — Full coverage of: title/playing/gameover/cleared states, outlaw HP and state machines, peek system, damage when peeked, safe when covered, bullet spawning, popup spawning, HUD rendering, reload bar green pixels, state helpers, PEEK_DUR/FIRE_DUR constants, full state cycle, console error sweep.

- **muzzle flash animation** — While `peekTimer > PEEK_DUR - 0.09`, a gold circle renders at the gun barrel tip. 90ms flash = snappy, satisfying shot confirmation.

---

## What Caused Friction

- **Suite 30 pixel check off-center** — Initial test sampled exactly `(180, 30)` for the gold score text. The "0" glyph has a hollow center, so that exact pixel landed on the dark background. Fixed by scanning a 160×30 region for any gold pixel (r>180, g>140, b<120). Lesson: always scan a small region rather than a single pixel for text-rendered elements.

- **Outlaw dead shadow** — When an outlaw is dead, a small ellipse shadow is drawn at reduced opacity. This intentionally keeps the scene from feeling suddenly empty. Simple but effective.

---

## Bugs Caught Before Shipping

None — all 36 tests passed after the one pixel-check fix. No game logic bugs in the shooting system, damage, or state machines.

---

## Action Items for Game 20

1. **Trail Boss is next** — Top-down wagon train escort. First top-down perspective, first multi-resource cross-map management.
2. **Event system** — Random events (ambush, storm, river crossing) demand real-time tap decisions. Each event type needs a distinct visual and a clear 2-3s decision window.
3. **Biome progression** — Five biomes (plains, desert, mountains, forest, river). Each changes the hazard mix and resource drain rates.
4. **Resource HUD** — Three resources: water, food, axle durability. Each drains at different rates. Clear gauge bars are essential.
5. **Map scrolling** — Top-down view scrolls downward as wagon advances. Wagon stays at vertical center.

---

## What Raised the Bar vs. Game 18

| Dimension | Dead Man's Hand (18) | Canyon Crossfire (19) |
|---|---|---|
| Core mechanic | Turn-based card game | Real-time cover shooter |
| Player agency | Choose bet/fold/raise | Time the peek window under pressure |
| Enemy type | AI decision trees (card game) | State-machine shooters with reload cycles |
| Risk system | Chip loss | Life loss tied to exposure timing |
| New mechanic | First card game, hand evaluator | First shooter, first cover system |
| Pacing | Deliberate (turn-based) | Intense (real-time, sub-second decisions) |
| Visual movement | Static card renders | Animated bullet projectiles, muzzle flash |
| Test count | 44 | 36 |
