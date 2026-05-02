# Bob Davis Games â€” Knowledge Base

Single source of truth for every game built, every technique proven, and every lesson learned. Read this at the start of each new game session.

---

## Games Built

| # | Title | File | Mechanic | Added |
|---|-------|------|----------|-------|
| 1 | On the Road | `on-the-road.html` | 3-lane endless runner | 2026-04-24 |
| 2 | Lasso Loop | `lasso-loop.html` | Precision timing / lasso throw | 2026-04-24 |
| 3 | Honky Tonk | `honky-tonk.html` | Rhythm / Web Audio / Particles | 2026-04-26 |
| 4 | Gone Fishin' | `gone-fishin.html` | Cast â†’ wait â†’ bite â†’ reel | 2026-04-26 |
| 5 | Outlaw Run | `outlaw-run.html` | Path drawing / scrolling world / pursuer AI | 2026-04-27 |
| 6 | Cattle Drive | `cattle-drive.html` | Multi-entity herding sim / flocking AI / wolf predators | 2026-04-27 |
| 7 | Tin Star Showdown | `tin-star-showdown.html` | Quick-draw duel / reaction timing / best-of-3 / AI difficulty scaling | 2026-04-27 |
| 8 | Dust Devil | `dust-devil.html` | 2-axis physics tumbleweed / tap-to-gust / canyon gap navigation | 2026-04-27 |
| 9 | Wanted Poster | `wanted-poster.html` | Memory/deduction — study poster, identify outlaw in saloon crowd | 2026-04-27 |
| 10 | Gold Rush | `gold-rush.html` | Lantern-lit cave mining / BFS pathfinding / triple resource management | 2026-04-27 |
| 11 | Boot Hill Bluff | `boot-hill-bluff.html` | Turn-based bluffing duel / AI tell system / narrative choices / chip betting | 2026-04-28 |
| 12 | Stampede | `stampede.html` | First-person perspective / 3-lane buffalo dodge / signal herd mechanic / dynamic hoofbeat audio | 2026-04-28 |
| 13 | Snake Oil | `snake-oil.html` | Matching/inventory puzzle / NPC dialogue-driven / ingredient-combo lookup / sliding tray + timer pressure | 2026-04-28 |
| 14 | Midnight Rodeo | `midnight-rodeo.html` | Directional response / bull telegraph + tap-match / crowd-energy multiplier / shrinking window difficulty | 2026-04-29 |
| 15 | Prairie Fire | `prairie-fire.html` | Cellular automaton wildfire / 18x26 grid / wind-direction spread / firebreak + water resource placement / environmental destruction | 2026-04-30 |
| 16 | Moonshine Run | `moonshine-run.html` | Stealth + 3-gauge resource management / heat-pressure-proof still / revenuer lantern cone detection / HIDE mechanic dims own gauges / wave escalation | 2026-05-02 |
| 17 | Rope Trick | `rope-trick.html` | Precision lasso throw / oscillating aim cursor / parabolic Bezier arc preview / wind-drift environmental variable / progressive target oscillation | 2026-05-02 |
| 18 | Dead Man's Hand | `dead-mans-hand.html` | Texas Hold'em card game / full hand evaluator (eval5+best7) / 3 AI opponents with distinct styles / probabilistic bluffing tell system / chip betting | 2026-05-02 |
| 19 | Canyon Crossfire | `canyon-crossfire.html` | Cover-based shooter / peek-and-fire / 3 outlaws with staggered reload cycles / visible ballistic projectiles / real-time exposure risk | 2026-05-02 |
| 20 | Trail Boss | `trail-boss.html` | Top-down wagon escort / 3 simultaneous draining resources / 5 biomes with distinct multipliers / ambush+supply+river event system | 2026-05-02 |

**Uniqueness rule:** Each new game must be a completely different concept from every prior game. No reskins, sequels, or variants unless user explicitly requests one.

---

## Quick Reference

- [Game 1: On the Road](games/01-on-the-road.md) â€” runner, perspective, van, road
- [Game 2: Lasso Loop](games/02-lasso-loop.md) â€” timing, lasso, night sky, items
- [Game 10: Gold Rush](games/10-gold-rush.md) — cave mining, lantern darkness, BFS nav, resource management
- [Game 3: Honky Tonk](games/03-honky-tonk.md) â€” rhythm, Web Audio, crowd, spotlights, particles
- [Game 4: Gone Fishin'](games/04-gone-fishin.md) â€” cast/reel, bezier line, fish AI, hold detection
- [Game 5: Outlaw Run](games/05-outlaw-run.md) â€” path drawing, scrolling world, sheriff waypoint nav
- [Retrospective: Honky Tonk](retrospectives/01-honky-tonk.md) â€” session lessons, action items for Game 04
- [Retrospective: Gone Fishin'](retrospectives/02-gone-fishin.md) â€” session lessons, action items for Game 05
- [Retrospective: Outlaw Run](retrospectives/03-outlaw-run.md) â€” session lessons, action items for Game 06
- [Retrospective: Cattle Drive](retrospectives/04-cattle-drive.md) â€” session lessons, action items for Game 07
- [Retrospective: Tin Star Showdown](retrospectives/05-tin-star-showdown.md) â€” session lessons, action items for Game 08
- [Retrospective: Dust Devil](retrospectives/06-dust-devil.md) â€” session lessons, action items for Game 09
- [Retrospective: Gold Rush](retrospectives/08-gold-rush.md) — session lessons, action items for Game 11
- [Retrospective: Boot Hill Bluff](retrospectives/09-boot-hill-bluff.md) — session lessons, action items for Game 12
- [Retrospective: Stampede](retrospectives/10-stampede.md) — session lessons, action items for Game 13
- [Retrospective: Snake Oil](retrospectives/13-snake-oil.md) — session lessons, action items for Game 14
- [Retrospective: Midnight Rodeo](retrospectives/14-midnight-rodeo.md) — session lessons, action items for Game 15
- [Retrospective: Prairie Fire](retrospectives/15-prairie-fire.md) — session lessons, action items for Game 16
- [Retrospective: Moonshine Run](retrospectives/16-moonshine-run.md) — session lessons, action items for Game 17
- [Retrospective: Rope Trick](retrospectives/17-rope-trick.md) — session lessons, action items for Game 18
- [Retrospective: Dead Man's Hand](retrospectives/18-dead-mans-hand.md) — session lessons, action items for Game 19
- [Retrospective: Canyon Crossfire](retrospectives/19-canyon-crossfire.md) — session lessons, action items for Game 20
- [Retrospective: Trail Boss](retrospectives/20-trail-boss.md) — session lessons, action items for Game 21
- [Canvas techniques](techniques/canvas.md) â€” setup, scaling, gradients, glow, silhouettes
- [Game loop patterns](techniques/game-loop.md) â€” state machine, dt, spawning, cooldowns
- [Visual design system](techniques/visual-design.md) â€” color palette, art style, HUD conventions
- [Brand guidelines](brand.md) â€” Bob Davis identity, tone, aesthetic for all games

---

## Progression Standard

Each game must be measurably more impressive than the last in at least two of: visual fidelity, mechanical depth, audio, narrative, performance, or technical complexity. Document what raised the bar in each game's notes file.
