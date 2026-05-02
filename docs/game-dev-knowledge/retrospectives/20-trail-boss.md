# Retrospective: Trail Boss (Game 20)

**Date:** 2026-05-02
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First top-down perspective in series** — All prior games used side-scroll, first-person, or static views. Trail Boss renders the wagon from directly above: a rectangular body with 4 spoke wheels, two horse silhouettes in front, canvas top arc overhead. The background terrain tiles scroll upward as the wagon advances, creating convincing forward movement without any 3D math.

- **First multi-resource management system** — Three independent gauges drain simultaneously at different base rates and biome-specific multipliers:
  - **WATER** (0.007/s base): doubles in Desert, halves in River
  - **FOOD** (0.0055/s base): doubles in Mountains, eases in Forest
  - **AXLE** (0.004/s base): 1.6× in Mountains, doubles in River
  Watching three low gauges simultaneously creates real tension late in a run.

- **5 biomes with distinct visuals** — Each biome has a unique ground color, trail color, and terrain decorations rendered via `drawDecor()` using a `pseudoRand(seed)` deterministic pattern (sin-based, no state). Plains have grass tufts; Desert has single/double-arm cacti; Mountains have boulder ellipses with highlights; Forest has tree circles + trunks; River has reeds and water ripples. The transition between biomes is instant but visible from the shift in ground tone.

- **Three distinct event types** — Events pause progress advancement and give the player a timed decision window:
  - **AMBUSH** (3.5s): tap 7 times to drive off bandits — success grants +50 bonus, failure costs 25% food. Two animated bandit silhouettes flank the event panel, swaying with a sin wave keyed to the timer.
  - **SUPPLY CACHE** (3.0s): tap once to claim a crate — always restores +25% of the lowest resource, +30 bonus. A canvas-drawn crate with cross-strap detail and gold star appears center panel.
  - **RIVER CROSSING** (4.0s): tap LEFT (ford, -20% axle) or RIGHT (bridge, -15% food). No fail state — choice is strategic, not pass/fail. Timer expiry defaults to ford.

- **Event panel design** — A semi-opaque dark panel slides in at the canvas bottom (H-228 to H-20). A depleting timer bar above the panel shifts from gold to red below 40% remaining. Each event type has a distinct color: red for AMBUSH, green for SUPPLY, blue for RIVER.

- **Wagon bobble animation** — `wagonBobble` accumulates delta-time; `Math.sin(wagonBobble * 7) * 2` creates a gentle 2px vertical oscillation suggesting road travel. Pauses during events because `wagonBobble` still ticks but the visual is smooth.

- **Pseudo-random terrain via `pseudoRand(seed)`** — All terrain decoration positions use `Math.sin(seed + 1) * 43758.5453 - floor(...)`. Same seed always yields the same layout, so terrain is consistent across frames without any stored array. Rows offset by `scrollY * 0.84` for parallax-style depth.

- **Journey progress bar** — A thin gold strip below the resource bars shows total journey progress from 0 to BIOME_DUR×5. Visual confirmation of forward motion even when events pause the `progress` counter.

- **40 tests, all pass first run** — No bugs needed fixing before shipping. Test coverage: initial state, canvas dims, startGame resets, biome constants, drain rates, tickTime effects on progress and each resource, all three lose conditions (water/food/axle), deathResource label, event spawning and resolution, all three event types (ambush 7-tap, supply restore, river left/right), bonus accumulation, popup spawning, win on full progress, biome index advancement, nextEventIn decrement, HUD gold pixel scan, FEEDBACK_ENDPOINT, full state cycle, resource clamp at 0, console error sweep.

---

## What Caused Friction

- **roundRect guard for width=0** — When a resource gauge drains to exactly 0, the fill width would be 0. Added `if (w <= 0 || h <= 0) return;` at the top of `roundRect()` to avoid degenerate path operations. Without this, `ctx.moveTo(x + rr, y)` with `rr = Math.min(r, 0/2, ...)` produces `rr = 0` and technically works, but the explicit guard is cleaner.

- **Supply event expiry behavior** — When the supply event timer runs out before the player taps, the crate simply disappears (no penalty, no gain). This is gentler than failing ambush (food penalty) and suits the "reward only" design of supply events. Handled by setting `activeEvent = null` directly rather than calling `resolveEvent()` with a false success flag that would still try to restore a resource.

---

## Bugs Caught Before Shipping

None — all 40 tests passed on first run.

---

## Action Items for Game 21

1. **Wanted: Dead or Alive is next** — First-person bounty hunting. Track a fugitive through a procedurally arranged frontier town using clues (witnesses, footprints, noise events).
2. **Investigation mechanic** — Accumulate clues from witnesses (tap to interview NPC) and environmental cues (shoe print, dropped hat). Track a "confidence" meter until it's high enough to make an accusation.
3. **Procedural town layout** — Arrange ~8-10 NPC positions and environmental clue spots semi-randomly each run. Same tile/position grid but shuffled inhabitants.
4. **First-person perspective** — Draw the scene as a simplified first-person view: a horizon line, street receding into distance, NPC silhouettes at different depths.
5. **False leads** — Include 2-3 innocents who look suspicious (matching partial features) to prevent trivially easy play.

---

## What Raised the Bar vs. Game 19

| Dimension | Canyon Crossfire (19) | Trail Boss (20) |
|---|---|---|
| Core mechanic | Real-time cover shooter | Top-down resource management escort |
| Perspective | Side-view 2.5D | Top-down wagon view |
| Resource system | Lives (single counter) | Three independent draining gauges |
| Event system | None | Three distinct event types with timed decisions |
| Environment variety | Single canyon | Five biomes with distinct visuals and multipliers |
| New mechanic type | First shooter | First management sim, first multi-resource system |
| Test count | 36 | 40 |
