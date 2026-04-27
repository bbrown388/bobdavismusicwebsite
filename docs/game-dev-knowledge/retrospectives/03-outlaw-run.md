# Retrospective: Outlaw Run (Game 05)

**Date:** 2026-04-27
**Build method:** Single-session inline implementation after context compaction

---

## What Went Well

- **Path-draw input is novel and tactile** — dragging a finger to lay a route the rider then follows is unlike anything in Games 01–04. It creates a planning layer on top of the action, letting players think a few moves ahead. Works perfectly on mobile touch with no ambiguity.

- **Scrolling world with coordinate split** — the `cameraOffset = clamp(H*0.75 - rider.worldY, H-WORLD_H, 0)` formula keeps the rider in the lower third while allowing the player to see and draw ahead. Splitting world-space (terrain, path, rider, sheriff) vs screen-space (HUD, popups) via a single `ctx.translate(0, cameraOffset)` block is clean and easy to reason about.

- **Sheriff pathfinding is good enough** — greedy waypoint selection (pick the waypoint that minimizes dist(sheriff→waypoint) + dist(waypoint→rider)) produces believable sheriff behavior without implementing full A*. The 500ms recalc interval feels reactive without being jittery. Sheriff going around obstacles via fords and fence gaps is satisfying.

- **Provisions mechanic adds meaningful tension** — the cost-per-pixel-drawn creates a real tradeoff: short efficient paths vs. safe long routes around obstacles. Cache pickup rewards good routing. The 4-second stranded countdown is long enough to be fair but short enough to be stressful.

- **Terrain zones read clearly** — ochre/brown color language for safe ground, dark river, brown fences, and the dusk-purple hideout sky at the top creates instant visual legibility. Ford crossings labeled "FORD" with gap hint markers on fences mean players understand the rules quickly.

- **Lessons from Gone Fishin' applied correctly**:
  - No variable referenced in `draw*` functions that isn't defined at module scope
  - `ctx.save()/ctx.restore()` wraps every draw function
  - Single unified pointer handler (no dual listener chains)
  - All state reset in `startGame()`
  - `startBeat()` cancels gain before rescheduling
  - Test file written before first real play

- **11-suite Playwright test file ships on day one** — suites cover title, start, path drawing, provisions cost, cache pickup, river collision, win, score/localStorage, sheriff, console errors, and HUD pixel check. Zero failures on first run.

- **Duplicate `updateCamera` caught by test/review** — function was accidentally defined twice (once at module scope, once in the update section). The second definition was a dead override that would have been hard to diagnose. Caught in the context-compaction handoff review.

---

## What Caused Friction

- **Context compaction mid-build** — session limit hit while writing the game. The plan + spec saved to disk were essential for picking up exactly where things left off. The test file and index card were written in the resumed session with zero context loss because the plan was explicit.

- **River collision test is weak** — Suite 6 only asserts `state === 'playing' || state === 'lose'` after drawing into a river-adjacent area. The ford at x=180 made it hard to set up a clean non-ford water draw via JS in headless mode. A future improvement: expose a `forceCollision(type)` test hook.

- **Sheriff can be trivially avoided on first run** — with a 5-second spawn delay and 80px/s speed, a player who draws a clear path immediately will reach the hideout before the sheriff is a real threat. Speed ramp-up or earlier spawn would add late-game pressure.

- **Cache pickup via path drawing only** — caches can only be collected by the *drawn path* passing through them, not by the rider. This means a player who draws past a cache but the rider doesn't reach it before running out of provisions doesn't get credit. By design, but possibly unintuitive.

---

## Bugs Caught Before Shipping

| Issue | Where | Fix applied |
|---|---|---|
| Duplicate `updateCamera` function | Module scope vs. update section | Removed duplicate from update section; canonical definition kept at module scope |
| Path behind rider not fading properly | `drawPath()` | Slices `path.slice(0, rider.pathIdx + 1)` for faded portion, `path.slice(rider.pathIdx)` for bright — off-by-one would leave current segment colored wrong |
| `provisions <= 0` check in `onPointerMove` runs before cost deduction | Input handler | Moved cost check so drawing is blocked only when provisions are already 0 at start of segment, not mid-segment |

---

## Action Items for Game 06

1. **Strengthen river collision test** — expose `window.__test = { forceCollide }` in game files so Playwright can trigger specific collisions without coordinate gymnastics.

2. **Sheriff difficulty scaling** — consider spawning sheriff faster if player is clearly ahead. Or increase speed at 50% progress. First run feels too safe.

3. **Scene fade transitions** — 200–300ms canvas alpha fade between `title → playing` and `playing → win/lose` remains outstanding from Game 04 action items.

4. **Sound for drawing** — `playDraw()` is in the spec but the implementation uses `playGallop()` only during rider movement. A subtle scratch sound while drawing would complete the sensory feedback loop.

5. **Consider a tutorial overlay** — the "Draw to ride" hint text is minimal. A 2-second animated arrow showing the drag gesture on first visit would eliminate confusion.

---

## What Raised the Bar vs. Game 04

| Dimension | Gone Fishin' | Outlaw Run |
|---|---|---|
| World size | Single-screen | 3× viewport scrolling world (1920px) |
| Input | Hold-and-release / tap / hold-reel | Path drawing — drag to plan route |
| AI | Fish behavior states | Sheriff with terrain-aware waypoint navigation |
| Mechanic depth | Cast → wait → bite → reel → catch | Draw route → manage provisions → navigate obstacles → evade pursuer |
| Terrain | Water layers | 5 distinct zones: rocks, river+fords, fence+gaps, open flats, hideout |
| Replayability | Random fish placement | Consistent map rewards route memorization; score incentivizes efficiency |

---

## Updated Knowledge Base Rules

- **Scroll world via single `ctx.translate`** — one `ctx.save(); ctx.translate(0, cameraOffset); ... ctx.restore()` block for all world-space draws; draw HUD and popups after the restore. Never apply camera offset inside individual draw functions.
- **Screen→world conversion** — `worldY = screenY - cameraOffset`, `worldX = screenX`. Apply this in every input handler. Failure to do so is a hard-to-debug bug because positions look plausible but are off by the camera amount.
- **Greedy waypoint pathfinding works for constrained maps** — for maps with a small number of known chokepoints (fords, fence gaps), greedy `argmin(dist(self→wp) + dist(wp→target))` is fast and good enough. Full A* is YAGNI unless the map has many interacting obstacles.
- **Path-draw provisions cost** — `1 unit per 12px drawn` creates meaningful but not punishing draw cost on a 360px-wide canvas. Shorter paths are meaningfully cheaper than longer routes; players notice and adapt.
- **Duplicate function definition is a live bug** — JS silently uses the last definition. A function defined twice in the same file is always a mistake and can cause behavioral surprises if one version captures different closure state. Grep for duplicate `function foo` during review.
