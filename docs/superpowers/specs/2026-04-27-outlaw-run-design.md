# Outlaw Run — Game 05 Design Spec

**Date:** 2026-04-27
**For:** Bob Davis game library (bobdavismusicwebsite)

---

## Goal

A top-down escape game where the player draws a route across a scrolling landscape for a horse-and-rider outlaw to follow, collecting supply caches to keep moving while evading a sheriff who obeys the same terrain rules.

---

## Architecture

Single HTML file (`outlaw-run.html`). All game logic, audio, and rendering in one self-contained file. Canvas 360×640, CSS-scaled to fill viewport. State machine drives all behavior. Playwright test file (`test-outlaw-run.js`) ships alongside the game.

**Tech stack:** Vanilla JS, HTML5 Canvas 2D, Web Audio API, Playwright (tests only).

---

## State Machine

```
title → playing → win
                → lose
win   → title
lose  → title
```

`startGame()` resets all state variables. No intermediate states.

---

## Core Mechanic — Path Drawing

The player drags a finger (or mouse) across the canvas to draw a route. The route is stored as an array of `{x, y}` points sampled every 8px of drag distance. A dashed golden line renders the drawn path.

The rider advances along drawn path segments at a constant speed (120 px/s along the path). The camera scrolls so the rider stays in the lower third of the screen.

Drawing costs Provisions at a rate of **1 unit per 12px drawn**. Provisions start at 100. When Provisions hit 0, drawing is disabled and the rider halts after finishing the current drawn segment. If halted for 4 seconds the sheriff catches up — lose condition.

The player can draw ahead of the rider at any time (no minimum distance). The path ahead of the rider is visible; segments behind the rider fade out after the rider passes through them.

---

## Map Structure

Total map height: 1920px (3× canvas height). The map scrolls vertically — `cameraY` tracks how many pixels the world has scrolled. World coordinates: Y=0 at hideout (top), Y=1920 at start (bottom). Rider starts at world Y=1680.

### Terrain Zones (world Y, top=0)

| Zone | World Y range | Description |
|---|---|---|
| Hideout | 0–120 | Cabin + lantern, win threshold at Y=100 |
| Final run | 120–380 | Open ochre flats, no obstacles |
| Fence maze | 380–680 | Ranch fencing with 3 gap openings |
| Open flats 2 | 680–820 | Breather; supply cache here |
| River | 820–1020 | Winding river body; 3 ford crossings |
| Rock canyon | 1020–1380 | Boulder clusters forming corridors |
| Open flats 1 | 1380–1680 | Starting zone; first supply cache here |

### Obstacle Types

**Rocks:** Circular impassable zones, radius 20–40px. Rider or sheriff entering a rock zone = instant fail/block.

**River:** Impassable except at 3 ford crossing points (marked with shallow-water icons, each 40px wide). Both rider and sheriff must use fords to cross. Deep water collision = lose condition for rider; sheriff reroutes.

**Fences:** Horizontal line segments with 3 gaps (each 50px wide). Must pass through a gap; hitting fence = block/fail.

### Supply Caches

6 caches total, distributed across zones:
- 2 in Open flats 1 (start zone)
- 1 in Rock canyon
- 1 on the river bank before a ford
- 1 in Open flats 2
- 1 in Fence maze

Each cache restores **35 Provisions** (capped at 100). Cache is collected when the drawn path passes within 20px of its center. Visual: small icon (canteen, saddlebag, bedroll, ammo box — alternating). Collected caches show a brief popup and disappear.

---

## Rider

- Silhouette of horse + rider, ~28px wide × 22px tall
- Moves at 120 px/s along drawn path segments
- Smoothly interpolates between path points
- Idle animation: slight bob when halted
- Dust particle trail while moving
- Collision radius: 14px

---

## Sheriff

- Spawns at world position (W + 60, 1600) — right edge, near start — 5 seconds after game starts
- Same terrain rules as rider: cannot cross rocks, deep river, or fences (must use fords and gaps)
- Base speed: 80 px/s (faster than rider on straight lines, but navigation around obstacles creates delays)
- Navigation: waypoint-based
  - Maintains a list of all navigable waypoints: ford centers, fence gap centers
  - Each frame: if direct line to rider is clear of obstacles, move directly
  - If blocked: compute shortest waypoint sequence to rider using greedy nearest-waypoint selection
  - Recalculates route every 500ms
- Catch radius: 20px from rider center = lose condition
- Visual: red-tinted silhouette, slightly larger than rider (authority figure)
- Sheriff proximity indicator in HUD: star badge top-right, pulses red as distance drops below 300px

---

## Provisions Mechanic

- Meter: 0–100, starts at 100
- Drawing costs 1 unit per 12px of path drawn
- Pickup restores 35, capped at 100
- At 0: drawing disabled, rider finishes current segment then halts
- Halted for 4s: lose condition ("Stranded!")
- HUD: amber bar bottom-left, depletes left to right

---

## Win / Lose Conditions

**Win:** Rider's world Y ≤ 100 (enters hideout zone). Triggers:
- Dust burst particle effect
- Cabin lantern flare (glow radius animates out)
- Music victory swell
- Score calculated, best score updated

**Lose — 3 causes:**
1. Rider hits rock or fence (path blocked, sheriff catches up within 4s)
2. Rider enters deep river water
3. Sheriff catch radius reached

Lose triggers: flash overlay, "CAUGHT!" or "STRANDED!" text, show score.

---

## Scoring

`score = Math.round(provisionsRemaining * 10 + bonusDistance)`

Where `bonusDistance` = 0–500 based on how quickly the rider reached the hideout relative to a par time of 60 seconds.

Best score stored as `localStorage.getItem('outlaw_run_best')`.

---

## Audio

**Background loop:** Pre-composed country progression, G–C–D–G, triangle oscillator, lowpass 900Hz. Same boom-chick gain pattern as Gone Fishin' (bass notes 0.28, upper 0.14). BPM 95.

**SFX:**
- `playGallop()`: low-pass filtered noise burst, rhythmic, triggered every 300ms while rider moves
- `playPickup()`: short ascending two-note chime (G4→B4), triangle oscillator
- `playDraw()`: very soft scratch noise while drawing (gain 0.03, barely audible)
- `playWin()`: ascending arpeggio G4–B4–D5–G5 over 0.4s
- `playLose()`: descending two-note drop, minor interval

---

## HUD

| Element | Position | Notes |
|---|---|---|
| Provisions bar | Bottom-left, `(12, H-28)`, 140×16px | Amber fill, pill shape |
| "PROVISIONS" label | Above bar | 10px sans-serif |
| Distance bar | Top-center, `(W/2-60, 10)`, 120×12px | Gold fill, shows % to hideout |
| Sheriff badge | Top-right `(W-44, 10)` | Star shape, pulses red when near |
| Hint text | Bottom-center | "Draw to ride" on start |

---

## Visual Design

**Palette:**
- Terrain: `#C8A04A` (ochre), `#8B6914` (dry earth)
- Rocks: `#3a2a1a` (dark brown)
- River: `#2a4a6a` (deep blue-green), `#4a8aaa` (ford shallow)
- Fences: `#5a3a1a` (wood brown)
- Rider: `#1a0520` (dark silhouette)
- Sheriff: `#6a1010` (red-tinted silhouette)
- Path trail: `#FFD700` dashed, 2px wide, 8px dash / 6px gap
- Hideout: `#3a2510` cabin, `#FFE066` lantern glow
- Sky strip at top (visible when near hideout): deep dusk purple `#1a0d35`

**Particles:** Dust trail behind rider — small tan circles, 2px radius, fade over 400ms.

**Coordinate system:** World Y=0 is the hideout (top of map), Y=1920 is the start (bottom). All game objects stored in world coordinates. Camera offset: `cameraOffset = Math.round(H * 0.75 - rider.worldY)`, clamped so world never scrolls past Y=0 or Y=1920. Applied as `ctx.translate(0, cameraOffset)` before all world-space draws. Input events (touch/mouse) convert screen→world via `worldY = screenY - cameraOffset`.

**Map rendering:** The visible window is a 360×640 slice of the 360×1920 world. `ctx.translate(0, cameraOffset)` applied once per frame before all world-space draws.

---

## Test Plan (Playwright — `test-outlaw-run.js`)

Suites to ship with the game:

1. **Title screen** — state='title', tap starts game
2. **Draw path → rider follows** — simulate drag, assert rider.worldY decreases over time
3. **Provisions decrease while drawing** — draw 120px, assert provisions dropped by ~10
4. **Supply cache pickup** — draw path through cache position, assert provisions increase
5. **River collision** — draw into deep water (non-ford), assert state='lose'
6. **Win condition** — teleport rider near hideout via JS, assert state becomes 'win'
7. **Score and best score** — win run, assert score>0 and localStorage updated
8. **Sheriff spawns and moves** — wait 6s, assert sheriff position has moved from spawn
9. **Console error sweep** — zero JS errors across full session
10. **HUD pixel check** — provisions bar area has non-black pixels during play

---

## Lessons Applied from Gone Fishin'

- All variables referenced in `draw*` functions must be defined at module scope (the `tension` lesson)
- `loop()` wrapped in try/catch, but test suite explicitly asserts zero console errors to catch silent failures
- Unified pointer input: single `onPointerDown`/`onPointerUp` with hold-duration detection (not needed here — draw is pure drag, no tap/hold ambiguity)
- `ctx.save()`/`ctx.restore()` wraps every `draw*` function
- `ctx.filter` reset after `ctx.restore()`, not inside
- All state variables reset in `startGame()`
- `startBeat()` cancels/resets masterGain before scheduling
- Test file ships alongside game from commit 1
