# Retrospective: Prairie Fire (Game 15)

**Date:** 2026-04-30
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First cellular automaton in the series** — Fire spread via stochastic neighbor rules (8-directional, probability weighted by wind direction and strength) creates genuinely emergent behavior. Every game plays out differently: fire snakes around stone outcrops, creates isolated burning pockets, and can backfire through gaps the player left.

- **Wind physics system** — Wind is represented as a direction (0-7 = N/NE/E/SE/S/SW/W/NW) and strength (0.5-1.0). Spread probability for each neighbor direction is base + WIND_BOOST[offset] * strength, where offset is the angular distance from windDir. Tailwind cells get up to +0.48 boost; headwind cells get -0.08 penalty. Wind shifts every 14-22 seconds with a random delta of -1, +1, or +2 steps, announced by a popup and audio cue.

- **Resource economy creates real decisions** — 14 firebreaks and 4 water buckets is tight enough that players cannot cover everything. A firebreak line across the full width needs 18 cells but the player only has 14. This forces diagonal placement, gap-based placement, or gambling on fire path. Water is precious: placed on a BURNING cell it extinguishes a 3x3 radius, placed on GRASS it creates a persistent barrier that extinguishes adjacent burning cells each fire tick.

- **Animated fire cells** — Each BURNING cell has a pre-generated random phase offset stored in a `Float32Array(COLS*ROWS)`. Flame animation uses `0.65 + 0.35 * sin(t*9 + phase)` for flicker. Orange core (`rgba(255, 90*fl, 0, 0.95)`), bright tip, and smoke overlay create a convincing animated fire effect without particles.

- **Wind compass HUD** — Live compass at bottom-right shows wind direction as an arrow and text label (N/NE/E/SE/S/SW/W/NW). Arrow rotates to match windDir * (360/8) degrees. This is the first direction-vector HUD element in the series, previewed as an action item from the Game 14 retro.

- **Grass survival meter** — HUD shows a progress bar of % grass remaining, updated each RAF frame via countCells(). Gives the player a live sense of how much of the prairie is being consumed, creating urgency without a fixed timer.

- **Crackle audio modulated by fire intensity** — Bandpass-filtered noise with gain proportional to countCells(BURNING) * 0.005. As the fire grows, the crackle gets louder. As firebreaks contain it, the crackle fades. Mirrors the Game 14 crowd audio pattern (ambient audio driven by game state variable).

- **Stone outcrops as natural obstacles** — Pre-placed stone cells at fixed positions create natural firebreak corridors and chokepoints. Stone cells are never grass, never burn, never change. Players who notice them can route firebreaks through stone gaps efficiently.

- **35 tests, all pass** — Covers: title state (1), canvas dimensions (2), playing state (3), grass count (4), homestead placement (5), fire starts at top (6), wind range (7), wind starts south (8), fire spreads (9), fire blocked by firebreak (10), fire blocked by water (11), burning -> burned lifecycle (12), resource init (13-14), firebreak placement (15), water placement (16), stone placement guard (17), forceWin (18), forceLose (19), score=0 before end (20), win > lose score (21), tool toggle (22), water extinguishes (23), setWindDir (24), homestead never ignites on init (25), grid dimensions (26-27), resource floor (28), title render (29), playing render (30), win screen (31), lose screen (32), feedback overlay (33), state cycle (34), console sweep (35).

---

## What Caused Friction

- **Pixel check test failures (suites 29, 32)** — Checking `getImageData(W/2, y, 1, 1)` for text content fails when the center pixel lands in a gap between characters due to font metric variation in headless Chromium. Fixed by scanning a full row (`getImageData(0, y, W, 1)`) and taking the max pixel brightness across the row. The fire glow at y=310 on the title screen is always bright regardless of animation phase; the score text at y=330 is always present after forceLose.

- **Wind compass transparent color bug** — `ctx.fillStyle = '#12090200'` used an 8-digit hex with alpha=0, making the compass background invisible. Similarly `ctx.strokeStyle = '#50382008'`. Caught during review, fixed before tests ran.

---

## Bugs Caught Before Shipping

- **endGame called from fireTick returned before phase check** — `fireTick()` calls `endGame(false)` when fire reaches homestead, setting state to 'lose'. The outer `update()` checks `if (gameDone) ...` after `fireTick()` returns, correctly playing the lose sound. No infinite loop risk because `update()` guards `if (state !== 'playing' || gameDone) return` on each frame.

- **burnTimer not initialized on setCell** — The test helper `setCell(r, c, BURNING)` needed to also set `burnTimer[gI(r,c)] = BURN_TICKS` so that isolated burning cells in tests would survive long enough to test spread. Without this, the burning cell would immediately expire on the first fireTick (burnTimer=0).

---

## Action Items for Game 16

1. **Persistent streak counter** — Still not implemented after Game 13 and 14 action items. Moonshine Run's multi-gauge management lends itself to a "stability streak" concept: maintaining all three stills in the green zone for N consecutive seconds.

2. **Animated wind indicator** — Prairie Fire's compass arrow is static per frame. For Moonshine Run's lantern-sweep mechanic, consider animating the sweep arc in real time (rotating angle shown live).

3. **Green/red border flash on correct/wrong action** — Prairie Fire has popup text ("DOUSED!") but no screen flash. Moonshine Run, being faster-paced, should add a brief border flash to confirm risky actions.

4. **Pre-computed fire path visualization** — Prairie Fire would benefit from showing where the fire is likely to reach in 3-5 ticks given current wind. This is a significant feature but would make the strategy layer much richer.

---

## What Raised the Bar vs. Game 14

| Dimension | Midnight Rodeo (14) | Prairie Fire (15) |
|---|---|---|
| Core mechanic | Reaction timing (directional tap) | Strategy/placement (resource allocation) |
| Game world model | State machine (4 phases) | Cellular automaton (18x26 grid, 468 cells) |
| Environmental simulation | None | Wind physics, fire spread, burn lifecycle |
| Player agency | Reactive (respond to bull) | Proactive (plan ahead, place defenses) |
| Visual complexity | Single scene, 2 animated entities | 468 animated cells, per-cell phase offsets |
| Audio | Crowd noise by energy | Crackle by fire cell count |
| Test count | 31 | 35 |
| Resource system | None | 14 firebreaks + 4 water, tactical scarcity |
