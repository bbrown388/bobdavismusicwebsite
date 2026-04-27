# Game 05: Outlaw Run

**File:** `outlaw-run.html`
**Date built:** 2026-04-27
**Mechanic:** Path drawing — drag finger to lay route for outlaw rider; evade sheriff; reach hideout

---

## Concept

Top-down escape game set on a 1920×360px scrolling map. Player draws a finger route on the canvas; a horse-and-rider silhouette follows the path at 120px/s. A sheriff pursuer spawns after 5 seconds and navigates toward the player using waypoint pathfinding. Player must navigate through 5 terrain zones to reach the hideout at worldY=100.

---

## World Structure

| Zone | worldY range | Obstacle |
|---|---|---|
| Hideout | 0–120 | Win zone |
| Final run | 120–380 | Open |
| Fence maze | 380–680 | 2 fence rows, gap-only passage |
| Open flats 2 | 680–820 | Supply cache |
| River | 820–1020 | Impassable except 3 fords |
| Rock canyon | 1020–1380 | Boulder clusters |
| Open flats 1 | 1380–1680 | Start; 2 caches |

---

## Technical Notes

- **Camera:** `cameraOffset = clamp(H*0.75 - rider.worldY, H-WORLD_H, 0)`. Applied as `ctx.translate(0, cameraOffset)` over all world-space draws. HUD and popups drawn after `ctx.restore()`.
- **Screen→world:** `worldY = screenY - cameraOffset`
- **Path drawing:** Sampled every 8px of drag distance; stored as `[{x,y}]` world-space. Rider interpolates along segments with constant speed.
- **Provisions:** Start 100; cost 1/12 per px drawn; gain 35 per cache; halt 4s at 0 = lose
- **Sheriff:** Greedy waypoint nav (ford centers + fence gap centers); recalcs every 500ms; same terrain rules as rider
- **Collision:** rocks (circular, radius 20–40), river (Y 820–1020, not a ford), fences (Y ±8 margin, not in gap)

## Audio

G–C–D–G progression at BPM 95, triangle oscillator + lowpass 900Hz. Gallop SFX every 300ms while moving. Pickup, win, lose SFX.

## Key Constants

```js
RIDER_SPEED = 120   // px/s along path
SHERIFF_SPEED = 80  // px/s
SHERIFF_DELAY = 5000  // ms before sheriff spawns
PROVISIONS_START = 100
PROVISIONS_COST = 1/12  // per px drawn
PROVISIONS_GAIN = 35    // per cache
HALT_TIMEOUT = 4        // seconds before stranded lose
CATCH_RADIUS = 20       // sheriff proximity
CACHE_RADIUS = 20       // pickup radius
PATH_SAMPLE = 8         // min px between path points
WIN_Y = 100             // worldY threshold for win
```

## Test File

`test-outlaw-run.js` — 11 suites, all passing on day one

## Retrospective

See [retrospectives/03-outlaw-run.md](../retrospectives/03-outlaw-run.md)
