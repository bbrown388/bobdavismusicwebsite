# Retrospective: Brand Iron (Game 28)

**Date:** 2026-05-04
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First continuous drag / path-tracing mechanic in the series** - All 27 prior games used tap, hold, or swipe gestures on the game canvas as a whole. Brand Iron introduces `pointermove` tracking where the player drags their finger along a specific route. The iron position updates every `pointermove` event, giving a genuinely analog feel distinct from anything in the series before.

- **Dual-threshold heat gauge** - The "sweet zone" mechanic creates a new kind of pressure: the player must simultaneously manage forward progress AND heat. Drag too slow (iron cools below HEAT_COLD=0.22) and nothing marks. Drag too fast without lifting (iron exceeds HEAT_HOT=0.80) and the score burns away at 2pts per 0.35s. The heat bar's color gradient (blue=cold, green=sweet, orange=hot, red=burning) gives instant feedback without any text labels.

- **Arc-length progress system** - Progress is tracked as a single float `progress` (0..totalLen arc length). The `nearestOnPathAhead` function restricts the search window to `currentProgress + ADVANCE_LIMIT (88px)` so the player cannot skip forward by tapping the end of the path. Progress only advances, never retreats. This makes "tracing skill" the core mechanic rather than "find the endpoint."

- **Five distinct brand shapes** - V/Crossbar, Z/Trail Z, Lightning/Thunder, closed Arrowhead, and 5-point Lone Star. Each shape is a qualitatively different challenge: the Crossbar teaches direction changes, Trail Z adds a backtrack, Thunder introduces diagonals, Arrowhead has a closure (must trace back to start), and Lone Star requires handling 10 segments without losing heat across the inner-outer alternation.

- **Audio responsive to contact** - Highpass-filtered noise ramps gain and frequency with heat level during active drag. Silent when cold. Higher-pitched sizzle when overheating. Clean audio-to-gameplay coupling that reinforces the heat state without visual overlap.

- **45 tests pass** - Full coverage of: state machine, canvas dims, all startGame resets (score/lives/level/heat/progress), BRANDS array structure, heat constants, buildPath geometry, loadLevel, heat rise/fall mechanics, clamp at 0/1, burn penalty, timer countdown, timer expiry with lives>1 and lives=1, nearestOnPathAhead geometry (on path / far from path), progress advance / no-advance conditions, progress no-regression, brand completion at non-last and last level, score increase, toCanvas conversion, starPath point count, PASS_PCT range, FEEDBACK_ENDPOINT, localStorage key, pixel renders (title gold, HUD gold, gameover red, hide tan, progress bar orange), console error sweep, full 5-level state cycle.

---

## What Caused Friction

- **Suite 45 test loop** - The initial test looped through levels 1-3 without resetting state to 'playing' after each level completed. Since `update()` checks `state === 'playing'` before running, the tick was a no-op when state='success'. Fixed by adding `window.__test.setState('playing')` before each level's tick in the test loop.

---

## What Raised the Bar vs. Game 27

| Dimension | River Run (27) | Brand Iron (28) |
|---|---|---|
| Primary input | Hold left/right to steer + brake zone | Continuous drag along a defined path |
| Skill demanded | Spatial navigation + momentum prediction | Fine-motor precision + resource management |
| Resource system | Speed as implicit resource (brake tradeoff) | Heat as explicit dual-threshold gauge |
| Path structure | Infinite scrolling lane | 5 discrete shaped templates with arc-length tracking |
| Visual feedback | River flow, swirl indicators | Heat-colored iron glow, traced burn marks on hide |
| Completion condition | Distance + time | Coverage ratio (82% of path length) |

---

## Action Items for Game 29

1. **Jail Break is next** - Turn-based stealth grid. Guard vision cones, pick-lock mechanic, object-throw distraction, shadow zones.
2. **Vision cone rendering** - Compute a polygon fan from guard position + direction. Clip to walls. Fill with semi-transparent danger color.
3. **Object throw** - Player selects a tile to throw at; generates a noise event that redirects nearby guards for N turns.
4. **Shadow zones** - Tiles that guards cannot see into even with vision cones (walls between guard and tile, or recessed alcoves).
5. **5-layout escalation** - Each layout adds one guard, one door, or one narrow corridor to increase planning complexity.
