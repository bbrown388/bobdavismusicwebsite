# Retrospective: Gallows Road (Game 22)

**Date:** 2026-05-03
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First pure puzzle mechanic in series** — All 21 prior games used real-time action, resource management, deduction, or card mechanics. Gallows Road introduces static turn-based planning: player moves one grid step per input, guards move every GUARD_INTERVAL player moves. This is the deepest strategic planning depth in the series.

- **First multi-level game** — 5 escalating levels, each with its own grid layout, guard patrol(s), crate placement(s), key/door arrangement. State resets fully per level via `startLevel()`. Progress tracked by `levelIndex`. First game with `levelWin` state and inter-level screen.

- **Grid-based architecture** — CELL=34px, COLS=9, ROWS=11. Grid rendered from a 2D `tiles[row][col]` array. Each cell drawn independently (wall, floor, crate, key, door, exit). Player and guards are separate entities overlaid on top. `deepCopyTiles()` clones the initial level for each `startLevel()` call, preserving original layout.

- **Guard patrol system** — Guards defined as `{col, row, wA, wB, dc, dr}`. Each guard moves toward its current target (wA or wB) one step per GUARD_INTERVAL player moves. When reaching a waypoint, direction flips. When blocked by a crate, wall, or door, direction also flips. Crates permanently narrow a guard's effective range: if a crate occupies a cell on the guard's patrol path, the guard bounces at the cell before it — never crossing.

- **Crate push mechanic** — Player attempts to move into a crate cell. If the cell behind the crate (in push direction) is FLOOR (not WALL, CRATE, DOOR, or EXIT), the crate slides one step. Crates cannot be pushed into the EXIT tile (caught early in testing — initial code omitted EXIT from the block list, allowing crates to overwrite the exit tile).

- **WAIT mechanic** — Fifth button in D-pad center. Increments moves and advances guard tick without moving player. Essential for turn-based puzzle play where the player needs to wait for a guard to move into a safe position before acting.

- **37 tests, all pass** — Tests cover: title state, canvas dimensions, startGame reset, player position, floor movement, wall blocking, crate detection, crate push, crate-into-wall blocking, crate-into-exit blocking, guard count, guard movement interval, guard patrol range, crate blocking guard, WAIT mechanic, key/door/exit constants, grid dimensions, HUD rendering, D-pad rendering, localStorage, feedback endpoint, and console error sweep.

---

## What Caused Friction

- **Crate push into EXIT** — Initial code only blocked pushes into WALL, CRATE, DOOR. EXIT was not in the list, so pushing a crate to the last floor row would overwrite the exit tile. Fixed by adding `tileAt(nc2,nr2) === EXIT` to the push-blocking condition. Caught immediately in test suite 12.

- **`window.__test.TILE.X` in Node.js assert** — 7 tests failed with `window is not defined` because assert() comparisons like `t === window.__test.TILE.CRATE` were evaluated on the Node.js side, not in the browser. Fixed by replacing with hardcoded constants (CRATE=2, FLOOR=0, etc.) in all assert() calls.

---

## Action Items for Game 23

1. **Devil's Backbone is next** — Carry a volatile dynamite load through a mountain pass on a tilting wagon. Tap left/right to counterbalance wind and rough terrain. First balance/tilt physics mechanic in the series with escalating tilt amplitude.
2. **Balance mechanic** — A tilt/lean value (range -1 to +1) driven by wind gusts and terrain bumps. Player taps left or right to nudge balance back toward center. If balance exceeds threshold, game over.
3. **Physics feel** — Use acceleration/damping for balance momentum so it feels weighted, not snappy.
4. **Visual feedback** — Wagon visibly tilts. Load shifts. Warning indicators near limits.

---

## What Raised the Bar vs. Game 21

| Dimension | Wanted: Dead or Alive (21) | Gallows Road (22) |
|---|---|---|
| Core mechanic | Investigation / deduction | Turn-based grid puzzle |
| Cognitive demand | Evidence synthesis | Spatial planning + timing |
| Multi-session depth | Single investigation | 5 escalating levels |
| Input model | Tap NPCs / locations | D-pad directional grid movement |
| New mechanic type | First investigation game | First pure puzzle game |
| Level structure | Single run | Multi-level progression with score per level |
| Test count | 47 | 37 |
