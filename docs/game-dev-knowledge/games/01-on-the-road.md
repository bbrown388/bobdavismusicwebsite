# Game 1: On the Road

**File:** `on-the-road.html` | **Lines:** ~704 | **Committed:** 2026-04-24 (SHA: 515feff)

## Concept
Illustrated 3-lane endless runner. Player drives a red tour van down a perspective road, dodging obstacles and collecting guitar picks. Gets faster each round.

## Mechanic
- Swipe left/right (mobile) or arrow keys (desktop) to change lanes
- Tumbleweed and road-sign obstacles to avoid
- Guitar pick collectibles for points
- 3 lives; 2-second invincibility window after hit (van flashes)
- Speed increases every 500 ft

## Technical Highlights

### Progress-based coordinate system
All objects use a `progress` value (p=0 at horizon, p=1 at player position) to determine screen position AND scale. Everything in the scene derives from this single axis.

```javascript
function pToY(p)         { return HORIZON_Y + (H - HORIZON_Y) * p; }
function pToX(p, lane)   { return HORIZON_X + (LANE_X[lane] - HORIZON_X) * p; }
function pToScale(p)     { return 0.15 + 0.85 * p; } // perspective scale
```

### Key constants
```javascript
W=360, H=640, HORIZON_Y=390, HORIZON_X=180
LANE_X=[90,180,270], VAN_PROGRESS=0.78, HIT_WINDOW=0.09
```

### Road trapezoid
- Top edge: (118,390)-(242,390) — exactly at HORIZON_Y
- Bottom edge: full width at bottom of canvas
- Mountain polygon base vertices must all use exactly y=HORIZON_Y to avoid gaps

### Collision detection
```javascript
function hitTest(objProgress, objLane, playerLane) {
  return Math.abs(objProgress - VAN_PROGRESS) < HIT_WINDOW && objLane === playerLane;
}
```

### Invincibility pattern
```javascript
// After hit: set invincibleUntil = now + 2000
// In drawVan: if invincible, alternate opacity based on Math.floor(now/150) % 2
```

## What Worked Well
- Single-axis progress system made everything feel consistent and easy to reason about
- Illustrated van with canvas paths felt premium for a simple shape collection
- Speed escalation kept tension building naturally

## What Could Be Improved
- No particle effects (dust from wheels would add a lot)
- No background parallax — mountains are static
- No sound at all (even procedural)
- Characters are static shapes, not animated

## Spec file
`docs/superpowers/specs/2026-04-24-on-the-road-design.md`
