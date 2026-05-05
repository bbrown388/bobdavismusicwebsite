# Retrospective: Snake Canyon (Game 35)

**Date:** 2026-05-05
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First procedurally-generated level in the series** - DFS recursive backtracker produces a fully connected 11x7 maze every run. The guarantee is mathematical: every cell is reachable from every other because DFS carves through the grid exactly once, never creating disconnected regions. Suite 6 verified this by BFS-flooding from the start cell and confirming all 77 cells are reachable.

- **Audio-spatial rattlesnake is the primary navigation sense** - The snake rattle uses a Web Audio pipeline: noise buffer → bandpass filter (180Hz, Q=2.5) → LFO-modulated amplitude (20Hz tremolo) → StereoPannerNode → gain. The panning is computed from the snake's position rotated into player-relative coordinates: if the snake is to the player's right side in world space, the rattle pans right. The gain is distance-attenuated (max range = SNAKE_HEAR_RANGE + 2 = 6 cells). This means a player who knows how to listen can always localize the snake even without seeing it.

- **Alert state changes rattle character** - When alerted, the LFO gain increases from 0.55 to 0.8, making the rattle more aggressive/faster-feeling. This is a critical audio design decision: the rattle communicates *snake state* not just *snake position*, giving the player two distinct audio channels of information.

- **Footstep timing is the core risk mechanic** - The LOUD_STEP_WINDOW (0.55s) means tapping forward twice within half a second causes a loud footstep. This elegantly translates "rushing" into a measurable event. Quiet steps require deliberate pacing. The mechanic punishes the natural instinct to move quickly under time pressure.

- **Canyon FP rendering without raycasting** - The dungeon-crawler-style renderer uses 4 depth slots (SLOTS array), drawing perspective trapezoids for floor, ceiling, left wall, right wall, and back face at each depth. The result is a convincing first-person corridor with proper perspective convergence. Key insight: when a side passage is open, the background sky/floor bleeds through, which naturally looks like a dark corridor opening. No explicit side-corridor rendering needed.

- **26 tests across 26 suites all pass** - Coverage includes canvas dims, initial state, constants, SLOTS geometry, startGame reset, maze connectivity (BFS flood), player start position/direction, snake spawn distance, turning left/right, wall blocking, BFS pathfinding, getCorridorView structure, loud/quiet footstep alert, triggerWin score/localStorage, triggerLose, timer initialization, click-to-start, console errors, pixel color, FEEDBACK_ENDPOINT, exit cell wall, backWall detection, stepsTaken increment.

- **Maze exit design is clean** - The exit is at row 0, center column. The north wall of that cell is opened at generation time. When the player steps forward into the north wall from that cell, the movement code checks if they've gone out-of-bounds (nr < 0) and triggers the win. This naturally creates an "exit at the top of the maze" feeling.

---

## What Caused Friction

- **Coordinate system for panning** - Computing the snake's relative direction required rotating the world-space offset (dr, dc) into player-facing coordinates. The 4 cases (N/E/S/W facing) each map dr/dc differently to forward/right axes. Getting this right required careful reasoning: if player faces North (dir=0), forward = -dr (north = decreasing row), right = +dc (east = increasing column).

- **Test for Suite 15 (loud step alerts snake)** - Had to manually open maze walls in test context since the procedural maze might not have an open north passage from the player start. The fix was to force `maze[pr][pc].walls[0] = false` and its reciprocal in the test. This is a standard pattern for maze-dependent tests.

---

## What Raised the Bar vs. Game 34

| Dimension | Dust Devil Dance (34) | Snake Canyon (35) |
|---|---|---|
| Core input | Draw paths on canvas | First-person turn/step navigation |
| Game genre | Generative music sandbox | Procedural horror/stealth maze |
| Level structure | Fixed canvas with fixed landmarks | Procedurally generated 11x7 maze (different every run) |
| Audio role | Background composition layer | Primary navigation instrument (panning = direction, volume = distance) |
| Threat | None (aesthetic game) | Rattlesnake chaser with AI state machine |
| Tension source | Approaching storm timer | Loud step = snake hears you = chase begins |
| First in series | Generative music, aesthetic win | Procedural level generation, audio-primary navigation |

---

## Action Items for Game 36

1. **Rodeo Queen is next** - Skill-chain combo game: barrel racing, roping, trick riding events in sequence. Each event uses a different gesture pattern. Chaining without errors builds a multiplier.
2. **Sub-game phasing** - First game with distinct sub-game phases (each rodeo event has its own mechanic) sharing a single crowd-energy meter. Design each phase so the transition feels earned, not abrupt.
3. **Gesture variety** - Barrel racing = timed tap sequence in pattern. Roping = circular swipe. Trick riding = hold-and-release rhythm. Each should feel distinct in the hand.
4. **Combo/streak structure** - The multiplier system must be visible and exciting. Consider a visible chain counter with audio feedback that escalates with the streak.
