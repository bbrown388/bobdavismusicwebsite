# Retrospective: Tin Star Showdown (Game 07)

**Date:** 2026-04-27
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **Reaction timing is genuinely novel in this series** — all 6 prior games involved real-time control (move, aim, herd). Tin Star Showdown introduces anticipatory waiting: the game asks the player to *not act* for 1.4–3.6 seconds, then act as fast as possible. This "suppress then release" tension pattern is psychologically distinct from anything in Games 01–06 and creates immediate replayability.

- **Best-of-3 round structure raises the bar on narrative depth** — for the first time, there's a meta-game above single rounds. Each match has a story arc (set down, tied, down to the wire). No prior game had multiple sub-games within a single session.

- **AI difficulty that scales per match** — the AI reaction window narrows from ~500–900ms on first match to ~180–400ms after several matches. This creates a meaningful difficulty ladder without ever feeling random. Players who return get a genuine progression challenge.

- **The flinch mechanic adds real tension** — tapping during the READY phase loses the round. This forces the player to suppress the impulse to tap, which is cognitively harder than just "tap fast." The constraint transforms a simple reaction test into something requiring self-control. Tested cleanly via `triggerFlinch()` hook.

- **Muzzle flash + spark lines look crisp** — the `createRadialGradient` flash with 6 radial spark lines at the point of impact (chest level) communicates "you were hit" clearly in a single frame, before the fall animation plays. The two-stage feedback (flash → fall) mirrors how film westerns telegraph a hit.

- **Fall animation via foot-pivot rotation** — `ctx.rotate(-facing * fallAngle)` around the foot position (translate origin) gives a visually satisfying tip-over. The `-facing * fallAngle` correctly sends the loser away from their opponent in both orientations. No separate animation state needed.

- **`window.__test` hooks comprehensive** — `triggerDraw`, `triggerPlayerWin`, `triggerAiWin`, `triggerFlinch`, `forceMatchOver`, `unlockResult`, `resetBest`. All 13 test suites pass without any real-time AI waiting. Hooks make tests deterministic and fast.

- **Fade transition on all state changes** — `fadeAlpha = 0.35` on every `startIntro()` call, plus on `over` and `title` returns. Consistent with the pattern established in Game 06.

---

## What Caused Friction

- **HUD pixel test calibration** — initial test checked at `(W/4, 28)` = `(90, 28)`, which is the left edge of the pill. The pill fill is `rgba(0,0,0,0.6)` over a very dark sky (~#050208), giving pixel values near (3,1,4) = undetectable. Fixed by scanning a 70×16 region (y=20–36, x=100–170) for pixels with R>150, G>100. Actual gold text pixels are at y≈23 (cap height above the y=33 baseline). Always calibrate pixel tests before writing them — run a diagnostic scan first.

- **Over-state tap hit the Share button** — `navigator.share` is undefined in Playwright headless, but the hit-test `return` fires unconditionally even when `if (navigator.share)` is false. The test was clicking at `(W/2, H/2)` which landed in the Share button zone at y=302–332. Fixed by clicking at `(W/2, H*0.24 + 48)` = `(180, 202)`, safely above all button zones. Rule: **test taps must be explicit about which zone they target**.

- **Stray code after Edit** — one Edit call introduced an orphaned `await teardown(); }` block outside an async function. Syntax errors like this are caught immediately by Node's SyntaxError, but they interrupt the test run. Always verify test files parse before running.

---

## Bugs Caught Before Shipping

| Issue | Where | Fix applied |
|---|---|---|
| HUD pixel check at wrong y coordinate | suite 12 | Scan y=20–36 instead of y=33 (baseline vs cap height) |
| Over-state tap landing in Share hit-zone | suite 13 | Click at y=H*0.24+48 to clear all button hit-tests |
| Orphaned code block after Edit | test file | Removed stray `await teardown(); }` at line 300 |

---

## Action Items for Game 08

1. **Reaction time display on title screen** — currently only shows best react after a match is played. Could show it earlier if `localStorage` has a value.

2. **AI "tell" animation** — a subtle pre-draw tell (outlaw's hand moves slightly toward holster during the last 300ms of READY) would reward attentive players without being unfair. Add a `readyProgress` field to `window.__test` so suites can test the visual.

3. **Sound for the READY phase** — the `playReadyTick` calls a low sine tone but it's very quiet. A proper heartbeat-style low drum (short noise burst at 55Hz envelope) would ratchet tension better.

4. **Share button in non-'over' state** — currently Share is only available on the match-over screen. A persistent small icon would let players share mid-run reaction times.

5. **Test over-state button zones explicitly** — every future game's test suite should include a dedicated test for each hit-zone button on the game-over/over screen, using coordinates derived from the actual drawing constants (not W/2, H/2).

6. **HUD pixel calibration rule** — when writing pixel tests, run a diagnostic scan first (`getImageData` over the region, log all hits) before hardcoding coordinates. Add this as a standard step in test file authoring.

---

## What Raised the Bar vs. Game 06

| Dimension | Cattle Drive | Tin Star Showdown |
|---|---|---|
| Core tension mechanic | Real-time crowd management | Anticipatory timing (suppress → release) — new to the series |
| Meta-game structure | Single session to win/lose | Best-of-3 rounds within a match; match count tracks progression |
| AI behavior | 2 AI types (flocking prey + chasing predator) | 1 AI with dynamic difficulty per match (reaction window narrows each match) |
| Psychological dimension | Spatial strategy | Self-control under time pressure + reaction speed |
| Reaction time feedback | None | Personal best in ms, localStorage, per-round display |
| Input model | Continuous tap anywhere | Deliberate single-fire with a penalty for early input |

---

## Updated Knowledge Base Rules

- **Pixel tests require calibration before writing** — run a diagnostic `getImageData` scan to find actual rendered pixel coordinates, then write the test. Do not guess from draw coordinates; baseline ≠ cap height.
- **Hit-zone taps must avoid button areas** — when testing "play again" or other fallthrough taps, calculate the y range of all buttons drawn on that screen and click above/below them.
- **`return` runs after `if (navigator.share)` even when false** — all Formspree/share buttons that do `if (navigator.share) ...; return;` will swallow taps in headless. Use explicit coordinates outside those zones in tests.
- **The flinch mechanic is proven** — "tap early = lose" creates psychological tension that reacts-only games don't have. Viable for future timing games.
- **Fall animation with `ctx.rotate(-facing * angle)` at foot-translate** — standard pattern now. Player (facing=1) falls left (counter-clockwise); AI (facing=-1) falls right (clockwise). Both look correct.
