# Retrospective: Coyote Call (Game 42)

**Date:** 2026-05-07
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First real-time analog pitch-matching mechanic in the series** - All 41 prior games used tap/click or discrete digital input. Coyote Call is the first where the primary input is a continuous drag that produces a live audio frequency. The player hears their own pitch while trying to match the target - a genuinely new mechanic category.

- **Oscilloscope dual-waveform display** - Drawing two scrolling sine waves (target in amber, player in gold) that overlap when frequencies match is both technically clean and visually distinctive. The `scrollPhase = scrollT * 2 * Math.PI` base keeps both waves locked to the same time axis, so identical frequencies produce perfectly overlapping waveforms. This is the first oscilloscope-style visual in the series.

- **Coyote howl synthesis** - Using an OscillatorNode with a frequency ramp (0.8x → 1.3x → 0.75x over 1.1s) plus vibrato (6Hz LFO feeding the main oscillator frequency) creates a convincing animal-howl shape. No sample files needed - fully synthesized from Web Audio primitives.

- **Tolerance band on the slide-whistle** - Showing the amber tolerance band and orange target line on the whistle tube gives the player a spatial reference: "I need my ring to be inside that band." This makes the game learnable without text instructions.

- **HOWL_INTERVAL repeat timer** - Replaying the target howl every 3.8s means a new player can always hear the reference again. Combined with the 1.2s intro grace period (no scare accumulation while the howl plays), the mechanic is forgiving enough to learn.

- **Guard in lockMarker() and triggerFlee()** - Both functions check `state === 'playing'` before doing anything. This prevents double-calling if the trust timer fires twice in rapid succession (dt edge cases at high frame rates).

- **26 tests all pass first run (after 3 minor fixes)** - Test failures were exclusively due to scope issues: page-side constants (`WH_Y`, `WH_X`, `ROUNDS`) referenced in test file scope instead of `page.evaluate()`. No game logic bugs.

- **Trust/scare dual-meter design** - The trust bar fills when on target (rewarding accuracy) and drains slowly when idle (penalizing release). The scare bar accumulates when far off and resets per 1.4s burst, aggregated into `scareTotal`. This creates a forgiving system: brief accidental misses don't kill the round immediately.

---

## What Caused Friction

- **Test constant scope issue** - Suites 21, 25, 26 failed initially because they referenced `WH_Y`, `WH_X`, `WH_W`, `ROUNDS` in test file scope instead of inside `page.evaluate()`. Fix: move comparisons into `page.evaluate()` callbacks or read constants via evaluate before using them.

- **Round transition during `update()` with `isDragging`** - When `lockMarker()` sets `state = 'round_win'`, the `update()` function should no longer call `updatePlay()`. Since state is checked at the top of `update()`, and `lockMarker()` sets `isDragging = false` before changing state, the logic is safe. But it required careful ordering.

---

## What Raised the Bar vs. Game 41

| Dimension | Gold Panner (41) | Coyote Call (42) |
|---|---|---|
| Core mechanic | Physics density separation | Real-time pitch matching |
| Primary input | Drag for tilt angle (discrete positions) | Drag for continuous frequency (200-1200Hz) |
| Audio role | Ambient creek + event feedback | Player's own tone IS the input device |
| Visualization | Pan particles | Oscilloscope dual-waveform |
| New mechanic | Fluid particle simulation | Analog pitch-matching, oscilloscope rendering |
| New audio | Particle synthesis (splash, clink) | Coyote howl synthesis (LFO vibrato), lock chime |
| Coyote count | N/A | 1-5 coyotes across 5 rounds, animate on approach |

---

## Action Items for Game 43

1. **Wanted: Reward is next** - Bounty hunter economics: wanted poster with fugitive traits, scan scrolling crowd for the match. First visual search mechanic (spatial scan vs. memory test). First multi-trait composite matching.
2. **Crowd silhouette rendering** - Build a crowd of silhouetted figures using random offsets, different heights, and feature variation (hat style, body width). The player scans for the matching combination.
3. **Payout mechanic** - Score based on accuracy: correct ID earns full reward, wrong IDs reduce payout. Round payout shown as $ amount.
4. **Decoy density escalation** - Rounds 2+ add more similar-looking decoys (same hat, different build etc.) increasing search complexity.
