# Retrospective: Tumbleweed Pinball (Game 30)

**Date:** 2026-05-05
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First physics simulation engine in the series** - Every prior game used discrete state (grid positions, fixed paths, or explicit velocity rules). Tumbleweed Pinball is the first game with a continuous-integration physics engine: gravity (900 px/s²), drag coefficient (0.9993 per frame), velocity cap (960 px/s), circle-circle collision with restitution, and circle-AABB collision for targets. The ball's trajectory emerges from real physics, not animation scripting.

- **Segment collision with `closestOnSeg`** - The `resolveSegment(ax, ay, bx, by, e)` function computes the closest point on a line segment to the ball center using scalar projection, separates the ball from the surface using the outward normal, and reflects velocity using the standard `v -= (1+e)*dot*n` formula. This handles walls, guide walls, corner kickers, and flippers with one function. The flipper kick (`ball.vy -= 370 if active`) adds a consistent upward impulse on top of the reflection, giving the player reliable launch power.

- **Chain multiplier scoring** - The `chain` variable doubles on each bumper hit (max 8x) and resets after CHAIN_TIMEOUT=2.0s without a bumper hit. A chain-4 hit scores 400 points instead of 100, giving the player a meaningful incentive to route the ball through the bumper cluster repeatedly. The chain indicator appears in the HUD only when chain > 1.

- **Flipper geometry** - Left flipper pivot (95, 548), right pivot (265, 548), each 80px long. Rest angles: 28° and 152° (symmetric). Active angles: -32° and 212° (symmetric). The flipper rotates at 14 rad/s, reaching full angle in ~40ms — fast enough to feel responsive but visible to the player. The drain post at (180, 564) between the flippers deflects center-falling balls, making center drain a skill check rather than luck.

- **WANTED poster bonus mechanic** - Three rectangular target strips on the left side (y=315, 345, 375). Each hit marks the target amber and scores 200. Hitting all three within any order sequence triggers a 2000-point "WANTED!" bonus and resets all targets. This creates a meta-objective alongside bumper score-farming. The `allHit0` check (captured before the target loop) prevents double-triggering in the same frame.

- **50 tests pass** - Full coverage: state machine, canvas dims, startGame resets (score/balls/chain), ball spawn position, bumper count/radius, target count, gravity acceleration, all 4 wall bounces, bumper hit scoring/chain, chain cap/reset, target hit score/flash/bonus, ball drain/ballDead/gameover cycle, flipper angle rotation (both directions), flipper angle clamping, closestOnSeg midpoint and endpoint clamping, resolveSegment separation and reflection, flipperEndpoints geometry, active flipper kick, drain post deflection, bumper flash decay, chain score multiplier, target flash persistence, popup creation, localStorage save/load, FEEDBACK_ENDPOINT, pixel renders (title gold, HUD gold, gameover dark), bumper positions in play area, flipper constant validity, guide wall geometry, drain post position, console error sweep, full state cycle.

---

## What Caused Friction

- **Ball-in-bumper overlap on spawn** - Suite 11 (gravity test) placed the ball at (180, 200) which overlaps bumper #4 at (180, 218) — distance 18px < BALL_R+BUMPER_R=33. The bumper ejected the ball at -280 px/s upward, making vy decrease instead of increase from gravity. Fixed by placing the test ball at (280, 450), far below all bumpers.

- **resolveSegment direction semantics** - Suite 30 placed the ball ABOVE a wall moving upward (vy=-100, already moving away from the surface). The dot product check `if (dot < 0)` correctly skips reflection when the ball is moving away. The test was wrong — fixed by placing the ball BELOW the wall moving upward, so the ball is actually moving toward the surface.

- **Bonus reset clears `hit` flags** - Suite 36 pre-marked targets [1] and [2] as hit, so hitting target [0] triggered the 2000-point bonus and immediately reset all three `hit` flags. The test checked `TARGETS[0].hit === true` at end-of-frame, which was false due to the reset. Fixed by checking `flash > 0` (set to 0.4 on hit, NOT cleared by the bonus reset) and `score >= 200`.

---

## What Raised the Bar vs. Game 29

| Dimension | Jail Break (29) | Tumbleweed Pinball (30) |
|---|---|---|
| Physics model | Discrete turn-based grid | Continuous integration (gravity, drag, velocity, restitution) |
| Collision system | Tile-based adjacency + ray-cast | Circle-circle, circle-AABB, circle-segment |
| Simultaneous objects | 1 player + 4 guards | 5 bumpers + 3 targets + flipper segments + guide walls (all active every frame) |
| Player input | D-pad buttons (discrete) | Left/right tap (continuous hold state, dual simultaneous input) |
| Scoring depth | Move efficiency per level | Chain multiplier (1x-8x) + poster bonus (2000) |
| Audio | Spatial click/thump on events | Physics-responsive sounds (bump intensity scales with speed) |

---

## Action Items for Game 31

1. **Pony Express is next** - Rhythm-based horse riding: tap in sync with hoofbeat patterns to maintain gallop speed across 5 terrain sections.
2. **Beat grid timing** - First pure rhythm mechanic since Honky Tonk (Game 3), but built around physical action (horse gait) rather than music notes. Use a BPM-aligned timer for beat windows.
3. **Procedural beat patterns** - Each terrain section has a distinct hoofbeat pattern (trot, canter, gallop) with increasing complexity. The pattern is procedurally generated from a seed so it can be consistent across replays.
4. **Visual gait feedback** - Horse legs animate to show which gait is expected vs. what the player is achieving. A "sync meter" shows how on-beat the player is.
