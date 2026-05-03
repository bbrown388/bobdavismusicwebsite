# Retrospective: River Run (Game 27)

**Date:** 2026-05-03
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First velocity/inertia model in the series** - All prior games used position snap or lerp. River Run uses `raftVX` (lateral velocity) with continuous steer acceleration and exponential decay (`Math.exp(-2.8 * dt)`). Tapping applies an 85px/s nudge; holding left/right applies 380px/s² acceleration. This makes the raft feel like it has mass: you pre-steer, it builds speed, then decays. Wall bounces preserve 35% of velocity (elastic, not dead-stop).

- **Predictive current swirl indicators** - Current zones spawn at y=-90 and scroll into view ahead of the raft. Each has a rotating arc animation with a directional arrow (left/right). The player sees the zone approaching and can pre-steer before it applies force at RAFT_Y. This is the game's "reading" skill — analogous to Dust Storm's timing window but prospective rather than reactive. The arrow color intensifies as the zone nears the raft as an urgency cue.

- **Dual obstacle types with distinct movement patterns** - Boulders (r=13-31) are stationary in the lane; logs (65×13 rectangles) drift laterally and bounce off river walls. The log drift means you can't simply memorize their spawn position — you have to track them as they move. Two different collision models: circle-vs-circle for boulders, circle-vs-AABB for logs.

- **Speed-as-resource via brake mechanic** - Holding the bottom 20% of screen halves effective river speed (0.58 factor). Score accrues slower when braking, but round-clear bonuses reward restraint: less than 3s of braking = +80pts, less than 8s = +40pts. This creates a genuine risk/reward tradeoff: braking is safe but expensive; running fast scores more but tightens reaction windows.

- **Water visual system** - 32 animated flow lines with sinusoidal x-oscillation scroll down the river giving it a sense of flowing surface. Edge highlights pulsate with scrollY to simulate white water near the canyon walls. Boulder foam uses a radial gradient with animated alpha that pulses on `foamT`. All these work together to make the river feel alive without any particle system.

- **Audio is speed-responsive** - Rushing water uses bandpass-filtered white noise with frequency and gain linked to current speed (320 + speed×0.55 Hz, 0.16 + speed×0.00012 gain). When braking, frequency drops to ~200Hz and volume cuts — the river goes quieter and deeper. This is the most responsive audio-to-gameplay link in the series so far.

- **42 tests pass** - State machine (title/playing/roundclear/gameover/gamewin), canvas dims, startGame resets (score/lives/round/dist/raftX/raftVX), ROUNDS structure and escalation, RIVER_L/RIVER_R/RAFT_Y constants, spawn/scroll for boulders and logs, steer acceleration, wall clamping, collision/lives/invincible/hitFlash, distTraveled/score accumulation, braking flag, current zones, flow lines, round clear trigger, gamewin trigger, FEEDBACK_ENDPOINT, localStorage, pixel renders (title gold, HUD score, gameover red, river blue, progress bar), momentum decay test, console error sweep.

---

## What Caused Friction

- **Wall clamping logic** - Initial implementation added `raftVX * dt` before clamping, then re-added it inside the else branch, causing double-application. Fixed by restructuring: check the projected position, clamp with bounce if needed, otherwise apply normally. One pass through.

---

## What Raised the Bar vs. Game 26

| Dimension | Dust Storm (26) | River Run (27) |
|---|---|---|
| Steering model | Position snap to 3 discrete lanes | Velocity/inertia, continuous lateral movement |
| Prediction mechanic | Fog hides obstacles (reactive) | Current swirls show future push (prospective) |
| Obstacle drift | Stationary boulders + drifting tumbleweeds | Stationary boulders + laterally-bouncing logs |
| Input model | Tap left/right for lane swap | Hold for steering acceleration + brake zone |
| Speed management | No brake | Brake zone: speed 58%, score tradeoff, bonus reward |
| Audio-speed coupling | Wind drone, fixed parameters | Bandpass freq + gain scale continuously with speed |
| Water visual | N/A (desert setting) | Flow lines, edge highlights, boulder foam pulses |

---

## Action Items for Game 28

1. **Brand Iron is next** - Path-tracing mechanic: drag brand iron along a template, manage iron heat.
2. **Drag input** - First game to use continuous drag rather than tap/hold. Needs `pointermove` tracking, delta-to-path matching.
3. **Heat gauge dual-pressure** - Too cool = faint mark, too hot = burn. Both failure modes active at once. Consider a two-threshold bar with a sweet zone in the middle.
4. **Path matching** - Compare player's drawn path to template using nearest-point distance, accumulate accuracy score. Simpler than exact curve matching.
5. **Audio** - Sizzle on contact (filtered noise with sharp attack), higher pitch when overheating, silent gaps when too cool.
