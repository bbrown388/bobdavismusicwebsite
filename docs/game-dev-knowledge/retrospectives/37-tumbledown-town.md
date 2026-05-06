# Retrospective: Tumbledown Town (Game 37)

**Date:** 2026-05-06
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First Verlet physics simulation in the series** - Authentic position-based Verlet integration: each joint stores current pos and previous pos (no explicit velocity), gravity adds to delta each frame, then 12 constraint satisfaction iterations hold links at rest length. The physics engine is ~40 lines and handles all game mechanics cleanly.

- **Clean puzzle design via independent sections** - Levels 1-3 use independent pillars with no cross-links. This gives the player direct, legible cause-and-effect: tap support = that section falls, others stay. No confusion from unexpected coupling.

- **Progressive coupling introduction** - Level 4 introduces a diagonal brace that transfers force. Players learn they can't always just tap the obvious post — the brace holds the outlaw's section up even after the pillar is removed. Level 5 extends to two braces. The difficulty ramp is clean.

- **Floor constraint keeps physics stable** - After all Verlet integration and constraint iterations, `if (j.y > GROUND_Y) { j.y = GROUND_Y; j.py += ... }` prevents joints from passing through the ground. Damping coefficient 0.995 per frame prevents energy blowup.

- **CRUSH_Y / SAFE_Y thresholds give 90px ambiguity buffer** - CRUSH_Y=460, SAFE_Y=370, joints start at ~295-320. Free-falling joints reach 520 (crushed ✓), constrained joints stay near 300 (safe ✓). The 90px gap between thresholds means well-designed levels have unambiguous outcomes.

- **Recursion bug caught and fixed** - The export `window.removeSupport = (idx) => removeSupport(links[idx])` caused infinite recursion because in a browser global script, function declarations and `window.X` share the same binding. Fix: `const _removeSupportFn = removeSupport; window.removeSupport = (idx) => _removeSupportFn(links[idx]);`. Pattern for all future exports: save reference before overwriting.

- **50 tests across 50 suites all pass** - Coverage includes canvas dims, all constants, all level structures, joint/link validity, restLen positive, Verlet integration, floor constraint, settle timer, CRUSH_Y/SAFE_Y thresholds, win/lose conditions, distToSegment geometry, and console error sweep.

---

## What Caused Friction

- **`window.X = (args) => localFn(args)` recursion trap** - When exporting `removeSupport`, the arrow function captured `removeSupport` from global scope. After the assignment, `window.removeSupport` pointed to the arrow, so the arrow called itself. Fix: always save a local const reference first. This applies to any function being exported while also being called internally.

- **Brace must be geometrically diagonal** - Initial Level 4 had both joints at y=300 making the brace perfectly horizontal. Test checking `|dy| > 10` failed. Fixed by putting J1 at y=320 (dx=160, dy=20). Lesson: when designing levels that introduce "diagonal braces," give the joints different y values.

- **Joint 0 stays constrained until support is truly removed** - One test checked "joint falls after support removed" but the physics step ran BEFORE removeSupport was called, due to state from prior tests. Fixed by calling `setupLevel(0)` fresh at start of each test that needs clean state.

---

## What Raised the Bar vs. Game 36

| Dimension | Rodeo Queen (36) | Tumbledown Town (37) |
|---|---|---|
| Core mechanic | Skill-chain timing gestures | First-ever physics simulation (Verlet) |
| Player agency | Reaction to rhythm cues | Spatial/causal reasoning about structure |
| Physics model | None (gesture math) | Full position-based Verlet with constraint iteration |
| Level structure | 3 sequential events | 5 distinct puzzle configurations |
| Chain reactions | None | Diagonal braces transmit force across sections |
| Tests | 37 | 50 |
| Input model | Multi-gesture (tap, drag, hold) | Single tap with spatial precision |

---

## Action Items for Game 38

1. **Dust Road Derby is next** - Top-down oval racing, 3 AI rivals, slipstream mechanic, dust cloud visibility, 5 laps. First racing/driving mechanic in the series.
2. **Rubber-band AI** - AI rivals use rubber-band difficulty: when behind they drive faster, when ahead they slow slightly. Keeps race competitive without being impossible.
3. **Slipstream implementation** - When player is within 60px directly behind a leading car, apply a 15-20% speed boost. Show visual indicator (air distortion lines).
4. **Top-down car physics** - Simple: car has velocity vector, player steers to change heading. Use lerp for steering input to prevent instant direction changes. Add lateral friction to prevent perfect 90-degree turns.
5. **Dust cloud** - When car goes off the racing line (measured by distance to oval centerline > threshold), spawn dust particles that obscure vision ahead by reducing alpha of that canvas region.
