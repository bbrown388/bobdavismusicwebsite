# Game 04: Gone Fishin'

**File:** `gone-fishin.html`
**Date built:** 2026-04-26
**Mechanic:** Cast → wait → bite window → reel tension → catch or break

---

## Concept

A single-screen fishing game. Player holds to charge cast power, releases to launch lure. Lure sinks to targeted depth. Fish approach and bite in a time window. Player taps to set hook, then holds reel button while managing fight tension. Catch = points; tension breaks line.

---

## Technical Notes

- **Bezier fishing line:** `midY = (tipY + lureY)/2 + droop` where `droop = lerp(5, 60, reelProgress/100)` — taut when reeling, drooping otherwise
- **Fish behavior:** 4 states (idle → attracted → biting → spooked); `bold` trait per species controls scatter radius
- **Depth targeting:** Player clicks canvas Y to set `lure.targetY`; cast distance (X) set by hold duration
- **Input:** Unified `onPointerDown`/`onPointerMove`/`onPointerUp` with hold-duration detection

## Audio

G–C–D–G chord progression, BPM 90, triangle oscillator + lowpass 900Hz. Bass notes gain 0.28, upper notes 0.14.

## Key Bugs Fixed Post-Ship

- `tension` undefined in `drawLine` during reeling — replaced with `reelProgress / 100` (same semantic meaning, actually defined)
- Bite window too short (600ms → 2500ms)
- `touchcancel` not handled → `castHeld` could stay true

## Test File

`test-gone-fishin.js` — 8 suites, 36 assertions

## Retrospective

See [retrospectives/02-gone-fishin.md](../retrospectives/02-gone-fishin.md)
