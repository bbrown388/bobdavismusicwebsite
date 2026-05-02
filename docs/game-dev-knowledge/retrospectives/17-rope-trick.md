# Retrospective: Rope Trick (Game 17)

**Date:** 2026-05-02
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First physics-arc projectile mechanic in the series** — A quadratic Bezier curve renders a live rope arc preview from the player's throwing hand to the calculated landing point. The arc is recomputed each frame as the aim cursor oscillates, giving players a real-time trajectory guide. The control point is positioned at the midpoint minus an arc height proportional to distance (`arcH = 55 + (playerY - targetY) * 0.35`), producing a natural parabolic shape for both near and far targets.

- **Wind drift as environmental variable — first in series** — `windX` ranges from -3 to +3 (never 0, always challenging). Wind is visually communicated via a compass indicator (N/S/E/W labels + colored arrow). The landing formula `aimX + windX * WIND_STRENGTH` means the arc preview already incorporates wind, so players see exactly where the rope will land. The skill is timing the oscillating cursor to compensate for wind bias.

- **Oscillating aim cursor with progressive speed** — Cursor speed (`aimSpeed`) increases across the 5 rounds: 1.2 → 1.6 → 2.0 → 2.5 → 3.0 rad/s. Paired with increasing target distances (ty: 300 → 268 → 240 → 215 → 192), this creates a clear skill escalation within a single play session.

- **Moving targets from round 2 onward** — `target.vx` governs sinusoidal horizontal oscillation (`sin(playingTime * speed) * 52`). Round 0 is static (teaching round), rounds 1-4 introduce progressively faster oscillation (28, -38, 50, -62 px/s). The direction alternates to prevent predictability.

- **Three scoring zones** — PERFECT (dist ≤ 18px, 300pts), GOOD (dist ≤ 44px, 150pts), MISS (0pts). The spinning dashed-ring target visually communicates these zones at all times, giving players immediate feedback about their landing accuracy after each throw.

- **Rope animation follows the actual arc** — The throw animation uses the same Bezier formula as the preview, drawing a partial rope (0..progress segments) with a glowing lasso-loop tip. This visually confirms the physical arc the player saw in the preview, making the wind compensation feel legible.

- **Musically coherent audio** — Throw: highpass-filtered decaying noise burst (whoosh). PERFECT hit: E minor pentatonic ascending phrase (165, 196, 247, 330 Hz, triangle oscillators, staggered 50ms). GOOD hit: two-note chord (220, 330 Hz). Miss: sawtooth buzz at 110 Hz. Win: ascending 5-note phrase. Lose: descending 3-note sawtooth phrase. All frequencies are intentional; no random pitches.

- **40 tests, all pass** — Covers: title state (1), canvas dimensions (2), startGame (3), score/round/misses/phase init (4-7), cursor oscillation (8), wind non-zero (9), setWindX (10), setAimX (11), perfect/good/miss throws (12-14), miss counter (15), getLastScore (16), score accumulation (17), round advancement (18), phase transitions throwing/result/aiming (19-21), post-MAX_ROUNDS state (22), win/lose conditions (23-24), forceWin/forceLose (25-26), wind shift effect (27), constant relations (28-30), win score > 0 (31), target position checks (32-33), all four screen pixel renders (34-37), feedback overlay hidden (38), state cycle (39), console error sweep (40).

- **Fixed mid-session: `THROW_DUR`/`RESULT_DUR` not exposed** — Initial test run had 8 failures because tests referenced `window.__test.THROW_DUR` which was undefined. Adding both constants to the test API fixed suites 17-24 (timing-dependent transitions). Lesson: always expose all timing constants in the test API.

- **Fixed mid-session: RAF loop overwrites `setAimX` between evaluates** — Suites 13 and 17 initially failed because the `requestAnimationFrame` loop ran `gameUpdate(dt)` which updated `aimX` between the `page.evaluate` that called `setAimX` and the subsequent evaluate that called `throwNow`. Fixed by combining `setAimX` and `throwNow` into a single synchronous `page.evaluate` call.

- **Fixed mid-session: `loadRound` resets wind** — Suite 17 scored 450 instead of 600 because `loadRound(1)` set `windX = windValues[1]` (random), offsetting the second throw from the aimed position. Fixed by calling `setWindX(0)` after `update()` in the test that spans multiple rounds.

---

## What Caused Friction

- **`THROW_DUR`/`RESULT_DUR` constant exposure** — Not a game bug, but a test API omission. Whenever timing-based phase transitions exist, the durations must be in `window.__test` so tests can advance past them with `update(dur + margin)`.

- **Two-evaluate RAF interleave** — Any test that calls `setAimX` in one `page.evaluate` and `throwNow` in a second must be aware that the RAF loop runs between calls. Mitigation: always chain `setAimX + throwNow` into a single synchronous evaluate.

---

## Bugs Caught Before Shipping

None — all 40 tests passed after the two API/test fixes above. No game logic bugs were found.

---

## Action Items for Game 18

1. **Dead Man's Hand is next in the queue** — First card game in the series: Texas Hold'em-style poker with 3 AI opponents, each with distinct bluffing personalities. Key new mechanic: AI behavioral models (tight, loose, bluffer) driving bet decisions and tell-display.

2. **AI tell system** — Each opponent should show a different visual "tell" (fidgeting animation, card-handling, eye contact) on a bluff vs. a strong hand. The tell should be probabilistic (not deterministic) to maintain challenge. Consider a `tell_strength` per opponent (0.6–0.9 probability of showing the correct tell).

3. **Card rendering** — Cards should be drawn with canvas, not images: rounded rects with suit symbols (♠♥♦♣). Use the brand palette: dark backgrounds, gold/white suits.

4. **Chip betting HUD** — Chip count, current bet, pot size displayed as pills at bottom of canvas. Minimum bet = 10, all-in mechanic for tension.

5. **Consider a slow-motion "rope tip" trail effect for future precision games** — A 3-4 frame position history drawn with fading alpha on the flying rope loop would emphasize trajectory more dramatically. Not needed now but useful for similar physics-arc games.

---

## What Raised the Bar vs. Game 16

| Dimension | Moonshine Run (16) | Rope Trick (17) |
|---|---|---|
| Core mechanic | Real-time multi-gauge management | Precision projectile timing |
| New input paradigm | Multi-button management | Tap-to-throw with oscillating cursor |
| Environmental variable | Wave escalation | Wind drift (first in series) |
| Physics visualization | Static still with gauges | Live parabolic arc preview (first in series) |
| Difficulty escalation | More revenuers per wave | Cursor speed + target distance + target oscillation across 5 rounds |
| Test count | 40 | 40 |
