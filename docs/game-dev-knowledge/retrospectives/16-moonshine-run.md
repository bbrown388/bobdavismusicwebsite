# Retrospective: Moonshine Run (Game 16)

**Date:** 2026-05-02
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First stealth mechanic in the series** — Revenue agents carry lanterns that sweep a triangular cone of light across the scene. Detection is not binary; it accumulates over `DETECT_THRESHOLD` (0.75s) of continuous cone overlap, giving the player time to react. This creates tension rather than instant death.

- **Visibility as a game resource** — The HIDE button is the series' first mechanic where a player action deliberately degrades their information state. Pressing HIDE douses the still fire (heat -30), minimizing glow and blocking detection, but gauge bars dim to 28% opacity — readable only by memory and guesswork for 3 seconds. The pressure to re-manage blind is the core skill expression.

- **Three-gauge simultaneous management** — Heat, Pressure, and Proof are independent variables with different drift rates (2.8, 2.2, and derived from heat/100 * 6.5/s). This is the first game in the series where the player manages three concurrent resources. Batch completion acts as both a reward gate and a resupply trigger (revenuers respawn faster each batch).

- **Glow radius as detection threat** — The still's radial gradient scales with `heat/100 * 52 + 14px`. Revenuer detection requires `heat > 25`, so a player who keeps heat low both reduces drift and shrinks the glow. This creates a natural tradeoff: high heat = fast proof accumulation + larger detection target.

- **Animated fire flames on the still** — Two overlapping quadratic Bezier flame shapes use dual-frequency sine modulation (`t * 9.2` and `t * 11.5 + 1.3`), giving organic flicker. The still body is a copper pot with ellipse layers, coil arm, and drip spout — more characterful than any prior game prop.

- **Musically coherent audio** — Still bubbling: bandpass-filtered looping noise, gain proportional to heat. VENT press: highpass-filtered envelope noise (hiss). Batch complete: E minor pentatonic ascending phrase (165, 196, 220, 247, 294 Hz, triangle oscillators). Bust: tritone dissonance (165 + 233 Hz, sawtooth). Win: harmonious ascending sequence (196, 247, 294, 392 Hz). All notes are intentionally chosen; no random pitches.

- **Stability streak** — `steadyTimer` increments while both heat and pressure are below their safe upper bounds. After 2.5 seconds, "STEADY Xs" appears in the HUD top-right. Streak seconds contribute 5pts per second to batch completion bonus. Directly implements the action item from the Game 15 retro.

- **Screen flash on every player action** — Green flash on COOL, orange on VENT, gold on MASH, dark on HIDE, red on bust. Directly implements the Game 15 retro action item.

- **Wave escalation** — After each batch, `Math.min(3, batches + 1)` revenuers spawn with speed scaling (`42 + batches * 9` px/s base). By the third batch the player faces 3 simultaneous sweepers at high speed.

- **40 tests, all pass** — Covers: title state (1), canvas dimensions (2), playing state (3), gauge init (4-6), heat/pressure drift (7-8), proof accumulation (9-10), tapCool (11), tapVent (12), tapMash (13), tapHide (14-16), hide duration + cooldown (17-18), critical gauge lose conditions (19-20), batch complete (21), 3 batches win (22), cone detection (23-24), full detection costs life (25), 3 detections lose (26), cone geometry false cases (27-28), forceWin/forceLose (29-30), win score > 0 (31), steady timer (32-33), pixel renders for all 4 screens (34-37), feedback overlay (38), state cycle (39), console error sweep (40).

---

## What Caused Friction

- **Suite 4 initial gauge drift** — The RAF loop begins before the test's `page.evaluate` reads values back. Heat had drifted to 50.046 by the time the assertion ran. Fixed by checking `h >= 50 && h <= 51.5` rather than exact equality — a pattern from prior game tests.

---

## Bugs Caught Before Shipping

- **Steady timer double-assignment** — The `update()` function had two competing lines for `steadyTimer`: one incrementing when both gauges were in safe range, and a second redundant assignment that checked only the upper bound. The duplicate was removed; the single assignment (`steadyTimer = (heat < HEAT_SAFE[1] && pressure < PRESSURE_SAFE[1]) ? steadyTimer + dt : 0`) is correct and verified by suites 32-33.

- **showPopup declared twice** — The game file initially had `showPopup` defined as both a named function and an inline lambda. Consolidated into a single module-level `addPopup` function; `window.__test` references the same function via closure.

---

## Action Items for Game 17

1. **Rope physics arc visualization** — Rope Trick will need a real-time arc preview on tap-hold before release. Consider a parabolic Bezier curve updated every frame while the player holds.

2. **Wind drift on projectile** — Rope Trick spec calls for wind-drift as an environmental variable. Use a constant `windX` acceleration on the rope arc, with a small compass indicator as used in Prairie Fire.

3. **Detection cone angle indicator** — Moonshine Run's cone is a static triangle. For future stealth games, consider drawing the cone as an arc/sector rather than a triangle so the geometry matches more intuitive circular coverage.

4. **Streak bonus display at batch time** — The steady streak bonus is added silently into the score. A popup like "+42 STREAK BONUS" at batch completion would make the system more legible.

---

## What Raised the Bar vs. Game 15

| Dimension | Prairie Fire (15) | Moonshine Run (16) |
|---|---|---|
| Core mechanic | Strategy/placement (cellular automaton) | Real-time juggling (3-gauge simultaneous management) |
| Player information control | Full (always visible) | Conditional (gauges dim when hiding) |
| Stealth system | None | First in series: cone detection, detectProg timer |
| Resource count | 2 (firebreaks + water) | 3 (heat, pressure, proof) + 1 meta-resource (hide charges) |
| Escalation | Wind shifts | Wave escalation: 1 - 2 - 3 revenuers, speed scaling |
| Audio variety | 3 sound types | 5 distinct sounds (bubble, hiss, batch tune, bust, win) |
| Prop detail | Grid cells | Detailed copper still: body, dome, coil, fire, glow |
| Test count | 35 | 40 |
