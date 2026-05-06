# Retrospective: Dust Road Derby (Game 38)

**Date:** 2026-05-06
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First racing game in the series** - Parametric oval track using `t` (0-1) as the track parameter. Each car has a `t` value and `lane` (-1 to +1) giving full positional freedom. `carXY(t, lane)` computes screen position from the ellipse equation plus outward normal perpendicular offset.

- **Clean rubber-band AI** - AI speed = `BASE_SPEED * clamp(1 + gap * 0.35, 0.72, 1.42)` where gap = playerProgress - aiProgress. When player is ahead, AIs accelerate; when player is behind, they ease off. The 0.72-1.42 clamp prevents absurd speed swings while keeping races competitive throughout all 5 laps.

- **Slipstream mechanic works correctly** - `isInSlipstream()` checks Euclidean distance < 78px AND progress(AI) > progress(player). When both conditions hold, player gets 18% speed cap boost plus blue wind-line visual effect. Players learn to draft intentionally.

- **Track geometry is solid** - Outward normal computed as CW rotation of the unit tangent: `(nx=dy, ny=-dx)`. Verified geometrically: at t=0 (top of oval, tangent points right), outward normal points upward (-y in canvas), which is correct. At t=0.25 (right side), outward normal points right (+x), correct. Tests confirmed heading and lane offset directions.

- **Countdown sequence with audio beeps** - 3-2-1-GO! sequence tracked by `now - countdownStart`, with distinct beep per phase change via `lastCdPhase` guard. No drift, no missed beeps.

- **50 tests all pass on first run** - Tests cover canvas dims, all constants, track geometry math, car factory, startGame initialization, progress/position ranking, slipstream detection, lap counting, dust structure, AI lane bounds, rubber-band clamp, state transitions, and console error sweep.

- **Parametric approach eliminates collision complexity** - Each car has only `t` and `lane`, making lap detection trivial (`t >= 1 → t -= 1; laps++`) and position ranking simple (sort by `laps + t` descending).

---

## What Caused Friction

- **`ctx.fill('evenodd')` for track donut** - Drawing the track surface as an outer-minus-inner ellipse requires specifying `'evenodd'` as the fill rule to `ctx.fill()`. Without it, the second ellipse (inner, drawn anticlockwise) fills instead of cutting a hole. Pattern: draw outer path clockwise, inner path anticlockwise, call `fill('evenodd')`.

- **Heading angle math requires care** - The car sprite nose is at negative y (top of the canvas), so `ctx.rotate(heading + Math.PI/2)` correctly aligns it. At t=0 heading=0 (pointing right), adding π/2 rotates the nose to point right. Test S23/S24 validated the heading values at t=0 and t=0.25.

- **PowerShell JSON quoting** - PowerShell strips double-quotes from inline JSON strings. Work-around: write JSON to `autonomous/_status-patch.json` and pass the file path to `update-status.js` instead of an inline string argument.

---

## What Raised the Bar vs. Game 37

| Dimension | Tumbledown Town (37) | Dust Road Derby (38) |
|---|---|---|
| Core mechanic | Static Verlet physics puzzle | First real-time racing with competing AI |
| AI type | None (physics engine only) | 3 rubber-band rivals with weave behavior |
| Real-time competition | None | Lap-by-lap position ranking, 1st-4th |
| Player agency | Single-tap spatial precision | Continuous steering + drafting strategy |
| Track structure | 5 discrete puzzle levels | Continuous 5-lap oval with dynamic state |
| Audio | None | Engine (sawtooth, speed-responsive), lap chimes, fanfare, countdown beeps |
| New mechanic | Verlet constraint physics | Slipstream draft boost (first in series) |
| Tests | 50 | 50 |

---

## Action Items for Game 39

1. **Last Rope Standing is next** - Grappling hook survival: swing between fence posts as floodwaters rise. Tap to latch, pendulum-swing, release to fly.
2. **Pendulum-swing physics** - Rope = constraint between anchor (fixed) and car (moving). At each frame: apply gravity, then project car onto circle of radius = rope length. Swing speed builds from gravitational potential energy.
3. **Anchor latching logic** - When player taps, find nearest fence post within latch radius. Clamp rope length to distance. Render rope as a line from anchor to player.
4. **Rising water threat** - Water level increases linearly over time. If player y > water_y, die. Player must keep swinging upward to survive.
5. **Release mechanic** - When player taps again (while on rope), release: player becomes a projectile with current velocity. Must reach next anchor before falling into water.
6. **No rubber-band AI needed** - This is a solo survival game, no competitors.
