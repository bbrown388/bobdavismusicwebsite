# Retrospective: Jail Break (Game 29)

**Date:** 2026-05-04
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First vision-cone stealth system in the series** - All 28 prior games used avoidance or detection in various forms, but none computed a guard's visible tile set via ray-cast cone projection. `getVisibleTiles(guardIdx)` casts rays within a 76-degree cone (VISION_HALF = 38 degrees each side) up to 5 tiles, checking `hasLOS` (Bresenham-style ray cast stopping at WALL/DOOR) for each candidate tile. The result is a `Set` of `row*COLS+col` keys that `isDetected()` queries. The overlay draws each visible tile with a semi-transparent red fill, giving the player a clear spatial read of danger.

- **Object-throw distraction mechanic** - `doThrow(targetCol, targetRow)` places a stone marker and alerts all guards within ALERT_DIST (4 tiles) by setting `g.alertTurns = ALERT_TURNS (3)` and `g.alertTarget = {x, y}`. During alert turns, `stepGuard` moves the guard one tile toward the alert target each turn and then resumes patrol. This gives the player a reliable tool to redirect guard attention — the first explicit "create an opening" mechanic in the series.

- **Pick-lock adjacent interaction** - `tryPlayerAction(gc, gr)` checks adjacency (|dx|+|dy| <= 1), then branches: DOOR adjacent = pick (costs 1 pick, converts cell to FLOOR, player stays in place); EXIT adjacent = escape; FLOOR/SHADOW = move. The player spending a turn picking is itself a turn cost — a guard can walk into view during the pick animation window.

- **Shadow tile hiding** - `isDetected()` returns false immediately if `cellAt(player.x, player.y) === SHADOW`. Shadow tiles render with a darker fill and a faint blue glow so they're visually readable. Guards can physically walk through them but their vision cone still projects through (a deliberate design choice: shadow = concealment, not wall). This creates a second stealth layer: player can hide in shadow even while inside a guard's sight line.

- **5 escalating layouts** - Level 1: 1 guard, 1 door, 3 picks, 2 throws. Level 2: 1 guard, 2 doors, shadows added, 3 picks, 2 throws. Level 3: 2 guards, 2 doors, more shadows, 2 picks, 2 throws. Level 4: 3 guards, 3 doors, tight corridors, 2 picks, 1 throw. Level 5: 4 guards, 4 doors, no shadows, 1 pick, 1 throw. The final level removes both the hiding safety net and most resources simultaneously, forcing pure route planning.

- **50 tests pass** - Full coverage of: state machine, canvas dimensions, all startGame resets, 5-level data validity (17x12 maps, passable patrol waypoints, door/shadow presence per level), vision cone ray-cast (LOS true across open row, false through wall, visible tiles set contents), all movement cases (adjacent floor, wall block, non-adjacent block), pick-lock mechanics (door converted, picks decremented), throw mechanics (alert triggered, throws decremented), guard patrol step (movement, facing update, alert resume), shadow hiding, turns decrement, wait action, detection, levelScores, localStorage key, pixel renders (title gradient, HUD background, grid floor, vision red overlay), console error sweep, full 10-turn state cycle.

---

## What Caused Friction

- **Guard starts at first patrol waypoint** - `stepGuard` checks if `dx===0, dy===0` at the current waypoint and only advances `patrolIdx` without moving the guard. Tests that called `stepGuard()` once and expected movement failed because the guard was already sitting at waypoint 0. Fixed by calling `stepGuard` twice in the movement test: first call advances the index, second call moves.

- **Canvas pixel sampling in headless tests** - Suite 46 sampled (180, 140) which is the center of "JAIL" text but happened to fall in the inter-character gap when anti-aliased. Suite 47 sampled (180, 14) which is the center of the '0' glyph (hole of the zero) in the score display — background color, not gold. Fixed by sampling the gradient itself for the title (y=580 where B=53) and the HUD background fill (x=4, y=4 where B=32) rather than relying on text pixel placement.

- **`best` variable reads localStorage at script load** - Suite 44 set `localStorage.setItem('jail_break_best', '9999')` then called `startGame()` expecting `getBest()` to return 9999. But `best` is assigned from `localStorage.getItem` once at parse time. Setting localStorage after load does not update the in-memory variable. Fixed by adding `setBest(n)` to `window.__test` and using it directly in the test.

---

## What Raised the Bar vs. Game 28

| Dimension | Brand Iron (28) | Jail Break (29) |
|---|---|---|
| Input model | Continuous drag along a path | Turn-based discrete tile grid |
| Core mechanic | Fine-motor heat management | Spatial planning + guard prediction |
| AI complexity | None (static templates) | Guard patrol + vision cone + alert state machine |
| Player tools | None (skill only) | Pick (resource), Throw (resource+AI redirect), Wait |
| State space | 1 float (heat) | Guard positions, facing, alertTurns, door states, player resources |
| Hiding system | None | Shadow tiles that defeat vision cone detection |
| Turn structure | Real-time continuous | Explicit per-turn: player acts, then all guards step |

---

## Action Items for Game 30

1. **Tumbleweed Pinball is next** - Physics-based pinball: tumbleweeds as balls, cactus bumpers, wanted-poster targets, saloon flippers.
2. **Physics simulation** - First game requiring simultaneous ball + flipper + bumper impulse physics. Use a simple circle-AABB/circle-circle collision model with restitution.
3. **Bumper scoring chains** - Hitting multiple bumpers in a single ball pass should compound the score multiplier.
4. **Multi-object simultaneous play** - If the design supports it, allow multiple tumbleweeds active at once (first in series with multiple live physics objects).
5. **Flipper timing** - Flippers need a hold-to-charge mechanic or a tap-to-flip model; tap-to-flip is simpler and more mobile-friendly.
