# Retrospective: Rattlesnake Round-Up (Game 45)

**Date:** 2026-05-11
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First multi-phase hold+drag mechanic per entity in the series** - All prior games used single-phase interactions: tap, or drag, or hold. Rattlesnake Round-Up is the first where each entity requires TWO distinct input phases in sequence: hold to pin (lock ring fills), then drag to bag. This creates a qualitatively different interaction from every prior game.

- **Timer per entity (pin timer arc)** - Once a snake is captured, a countdown arc visible on its head shows remaining pin time. This creates urgency that is local to each entity rather than a global round timer. Players must prioritize which snake to bag first based on how much pin time remains. First per-entity timer mechanic in the series.

- **Thermal scope visual layer** - Rendering snakes as heat signatures via radial gradient overlays on a dark teal background with scanlines and vignette is visually distinct from every prior game in the series. No game had a thermal/heat-map layer before. The contrast between the cool blue bag zone and the warm snake heat colors immediately communicates game state.

- **Three snake difficulty tiers** - Regular (lockTime=0), tough (lockTime=800ms), diamondback (lockTime=1400ms, pinDuration=2000ms). Each tier requires more careful input without changing the core mechanic. The escalation is mechanical, not visual - players learn one interaction pattern and face progressively tighter versions of it.

- **Noise texture pre-rendered to offscreen canvas** - The thermal background noise (350 speckle dots) is built once to an offscreen canvas and blitted each frame via `drawImage()`. This is efficient - no per-frame random dot generation, which would cause jitter.

- **24 tests, all pass first run** - No test logic errors. The `window._rru` test helper exports all state getters and key constants cleanly. S21 required a one-line fix to expose FEEDBACK_ENDPOINT via `_rru` instead of checking `window.FEEDBACK_ENDPOINT` (const declarations don't become window properties).

---

## What Caused Friction

- **`const` vs `window` property** - S21 initially failed because `FEEDBACK_ENDPOINT` is declared with `const` at the top of the script, which in a browser does not create a property on `window`. The fix was to add it to the `_rru` test helper object. This is the same pattern issue as other games - all exported test-accessible values must go through `_rru`.

- **Locking progress driven by timestamps vs dt** - The lock ring fill was initially designed to be driven by the `update(ts)` loop's `dt` accumulation. But since `grab.lockStart` is set at the moment of `pointerdown` (via `performance.now()`), and `update()` receives `requestAnimationFrame` timestamps, it was cleaner to compute `lockProgress = (ts - lockStart) / lockTime` directly in `update()`. This removes the need for a separate dt accumulator for locking.

- **Bag zone placement** - Placed the bag inside the pit at bottom-right (305, 555). This works but constrains the wander area for snakes - they avoid the bag zone naturally since their target is randomized within the upper portion of the pit. A future version might put the bag in a dedicated region outside the pit for cleaner separation.

---

## What Raised the Bar vs. Game 44

| Dimension | Trail Blaze (44) | Rattlesnake Round-Up (45) |
|---|---|---|
| Core mechanic | Player-drawn pathfinding | Multi-phase hold+drag per entity |
| Primary input | Drag across grid | Hold to lock, drag to bag |
| Challenge type | Strategic route optimization | Per-entity timing + dexterity |
| New mechanic | A* pathfinding comparison | Per-entity pin timer, lock-ring fill |
| New visual | Seeded terrain generation | Thermal heat-map rendering, scanlines, vignette |
| Entity system | Grid cells (static) | Live moving agents with state machine |
| Audio | No audio in Trail Blaze | Rattle synthesis (bandpass noise), lock click, bag thud, ambient crickets |

---

## Action Items for Game 46

1. **Prairie Telegraph is next** - Semaphore signal relay: frontier outposts, decode incoming flag signals (arm positions = letters), relay the message before the signal chain breaks.
2. **Visual symbol decoding** - Flag arm positions = letter mapping. First visual-symbol decoding game (vs Morse code audio in Wire Tap).
3. **Relay-chain structure** - Multiple outposts in a chain; player must decode from one and relay to the next within a time window.
4. **Wind interference** - Gusts scramble flag positions mid-signal, requiring the player to average or filter the visual input.
