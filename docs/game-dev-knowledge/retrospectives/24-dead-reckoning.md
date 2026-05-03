# Retrospective: Dead Reckoning (Game 24)

**Date:** 2026-05-03
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First celestial navigation mechanic in the series** — Previous games used discrete tap inputs, physics balance, turn-based grids, or card mechanics. Dead Reckoning introduces star bearing lines: tap a named star (POLARIS, VEGA, ALTAIR, ANTARES, DENEB, RIGEL), and a dashed bearing line is drawn across the terrain map at the correct compass angle. Two lines cross at your position.

- **bearingSegment geometry** — The core geometry function computes where a bearing line through the player's cell intersects the terrain map rectangle using parameterized line-plane clipping. Bearing 0° = vertical line (north star), 90° = horizontal (east star). The function is concise (~20 lines) and tested directly in Suite 12-13.

- **Three-phase state machine per round** — `starphase` → `locating` → `navigating` creates a clear cognitive rhythm: orient, confirm, move. Each phase has distinct UI: star zone + bearing labels / pulsing intersection marker / D-pad arrow buttons.

- **Cloud system that creates genuine urgency** — Clouds are ellipses that drift across the sky. Stars are checked for coverage by cloud bounding boxes each frame. Round 5 has 4 clouds at 0.55-0.72 speed, frequently obscuring one or both nav stars. Players must tap stars quickly before clouds pass over them. Once a bearing line is drawn, it persists as a dashed overlay even if the star is later covered.

- **Score system with diminishing returns** — First-try correct location: 100 pts. Each failed attempt reduces the award (100 → 75 → 50 → 25 → 20). Navigation efficiency bonus: +15 per remaining move. Wrong locate attempts apply -20 penalty. This creates tension around the locate step without being punishing.

- **Terrain hazard design** — Ravines (`'v'`) are impassable and cost 1 life. Rivers (`'r'`) cost 2 moves instead of 1. The terrain grid (5×4) is pre-designed per round with increasing complexity: Round 1 clear path, Round 5 requires navigating around two ravines and one river. All terrain visible during navigation phase — the puzzle is route planning, not fog-of-war.

- **Distractor markers in locate phase** — After bearing lines are drawn, the correct cell pulses with a radial gold glow. Three distractor cells are highlighted faintly. Players who read the bearing lines correctly will identify the intersection; players who ignore them may guess at a distractor.

- **50 tests pass** — Covers: title state, canvas dims, startGame resets, ROUNDS structure validation, NAMED_STARS count, cellCenter coords, bearingSegment geometry, tapStar mechanics (add bearing, no-duplicate, non-nav ignored, both-stars → locating), tapTerrain (correct/wrong/diminishing returns), movePlayer (N/S/E/W, boundary, decrement, ravine → gameover, ranch → roundover), round advance, gamewin after round 5, localStorage, FEEDBACK_ENDPOINT, pixel renders (HUD/sky/terrain/nav buttons/gameover/title), console errors.

- **Keyboard fallback** — Arrow keys and WASD work during navigation phase. Space/any key starts from title.

---

## What Caused Friction

- **Two test assertions referenced `window` from Node.js context** — Suite 10 had `assert(c.y === window.__test ? c.y : c.y, ...)` and Suite 33 had `assert(ml === window.__test ? ml : ml, ...)`. Both were dead code (ternary always evaluated to the same value) but threw `ReferenceError: window is not defined` in Node.js. Fixed by removing the redundant assertions.

---

## What Raised the Bar vs. Game 23

| Dimension | Devil's Backbone (23) | Dead Reckoning (24) |
|---|---|---|
| Core mechanic | Continuous physics balance | Celestial navigation puzzle |
| Spatial reasoning | None | Bearing line geometry + map reading |
| State phases per game | Playing → stageWin/gameLose | 3-phase per round (orient/locate/navigate) |
| Map system | None (linear road) | First terrain grid with hazard types |
| Navigation | Hold left/right to balance | D-pad + route planning around ravines/rivers |
| Multi-round structure | 5 stages (continuous) | 5 discrete rounds with reset |
| Environmental mechanic | Wind physics | Cloud front covering navigation stars |
| Cognitive load | Reactive (physics feedback) | Deliberate (spatial + memory) |
| Test count | 44 | 50 |

---

## Action Items for Game 25

1. **Fence Line is next** — Rebuild a storm-damaged fence before cattle scatter. Place posts and rails in sequence under environmental pressure.
2. **Construction/placement mechanic** — First in series. Consider tap-to-place on a grid, with wind gusts occasionally knocking unfinished sections.
3. **Time pressure from multiple threats** — Cattle wander toward gaps; wind increases gap rate; player must prioritize which gaps to fill.
4. **Visual polish opportunity** — Wood-grain textures on fence posts, cattle AI wandering toward gaps, animated wind effect.
