# Retrospective: Rodeo Queen (Game 36)

**Date:** 2026-05-05
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First multi-discipline skill-chain structure in the series** - Three sequential events (barrel racing, lasso roping, trick riding) each with a completely different input paradigm, all sharing one crowd energy meter and a single combo multiplier. The chain structure means the game rewards consecutive excellence across event types, not just within one.

- **Three genuinely distinct input mechanics in one game**:
  - *Barrel Racing*: Tap timing at moment-of-truth. A cursor sweeps toward each barrel at increasing speed. The perfect window (±0.10 t-units) is tighter than the good window (±0.25), creating a clear skill gradient.
  - *Lasso Roping*: Clockwise circular drag to spin a virtual lasso (1.8 full rotations required), then tap to throw with the calf at center-screen. Only clockwise delta is counted to prevent accidental credit for counter-rotation.
  - *Trick Riding*: Hold/release synchronized to a vertically oscillating bar. Peak detection uses derivative sign change (cos crossing from + to -), valley via (cos crossing - to +). This fires exactly once per cycle regardless of frame rate.

- **Derivative-based peak/valley detection is the right pattern** - Unlike the threshold-crossing approach used in Pony Express, tracking `prevCos → currCos` sign change (where cos = derivative of sin) fires exactly once at peak/valley regardless of dt. The pattern is: `isPeak = prevCos > 0 && currCos <= 0`, `isValley = prevCos < 0 && currCos >= 0`. This is the cleanest oscillator timing solution in the series.

- **Energy + multiplier dual system** - The crowd energy meter is purely contextual (visual health indicator), while the multiplier is the primary incentive for chaining. Missing any action resets multiplier to 1.0; each perfect action adds 0.5 (capped at 5.0). This is the deepest combo-chain system in the series.

- **37 tests across 37 suites all pass** - Coverage includes canvas dims, phase transitions, all barrel timing windows (perfect/good/miss), auto-miss timer, rope turn accumulation, ready-state on threshold, throw hit/miss zones, throw guard against unready state, tricks peak/valley scoring, cycle completion, game_over transition, multiplier cap, energy direction, score accumulation, bestScore localStorage, pixel color, and console error sweep.

- **Barrel advancing uses a timer in updateBarrel, not setTimeout** - The tap result + BARREL_ADVANCE_TIMER pattern means barrel advancement is driven by the game loop dt, not setTimeout. This makes the barrel phase fully deterministic and testable: set bp.t, call updateBarrel(dt > timer), check result.

---

## What Caused Friction

- **Missed `totalCycles` in initTricks** - The tricks phase used `tp.totalCycles` in the completion check (`tp.cyclesDone >= tp.totalCycles`) but `totalCycles` was never set in the state object initialization. It was `undefined`, making `N >= undefined` always false and preventing completion detection. Fixed by adding `totalCycles: TRICKS_CYCLES` to the `tp = {...}` block.

- **Missing window export for BARREL_AUTOMISS_T** - Test Suite 33 used `window.BARREL_AUTOMISS_T` to set the cursor position just before the auto-miss threshold. The constant was defined locally but not exported to `window`. Fixed by adding `window.BARREL_AUTOMISS_T = BARREL_AUTOMISS_T` to the exports block. Lesson: any constant referenced by name in tests must be exported.

- **Clockwise-only lasso tracking** - The ropeTrackAngle function must normalize the angle delta to [-π, π] before checking sign, otherwise large jumps across the ±π boundary give false readings. The pattern `while (delta > π) delta -= 2π; while (delta < -π) delta += 2π;` then `if (delta > 0) totalTurns += delta / (2π)` correctly handles all wrap-around cases.

---

## What Raised the Bar vs. Game 35

| Dimension | Snake Canyon (35) | Rodeo Queen (36) |
|---|---|---|
| Core input | First-person turn/step navigation | Three distinct gestures: tap timing, circular drag, hold/release |
| Game structure | Single event (maze navigation) | Three-event sequence with shared energy meter |
| Audio role | Primary navigation instrument | Supportive feedback layer (cowbell, gallop, whoosh, crowd) |
| Multiplier | None | Combo chain 1.0x-5.0x, resets on any miss |
| Mechanic variety | One mechanic throughout | Three completely different mechanics in one session |
| Tests | 26 | 37 |
| Phase transitions | 2 (title, playing, game_over) | 5 (title, barrel, rope, tricks, round_end, game_over) |

---

## Action Items for Game 37

1. **Tumbledown Town is next** - Physics demolition puzzle: tap to knock out rickety supports, guide collapse to crush wanted targets while sparing innocents. First Verlet/impulse physics simulation in the series.
2. **Verlet integration pattern** - Use position + previous position (not velocity) for stability. Each support joint stores pos + prevPos. Forces update prevPos then resolve constraints.
3. **Constraint-based structure** - Model the saloon as a graph of joints connected by rigid links. Each frame, apply gravity, then iterate 8-10 constraint passes to hold links at target length. Removed supports create dangling chains.
4. **Innocents vs targets** - Distinguish by color/hat. Show clear visual difference before collapse. Win condition: all targets crushed and ≥1 innocent survived.
