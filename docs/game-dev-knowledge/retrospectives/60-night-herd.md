# Retrospective: Game 60 — Night Herd

**Built:** 2026-05-19  
**File:** `night-herd.html`  
**Tests:** 50 pass  
**Mechanic:** Isometric stealth defense / dynamic-light Dijkstra pathfinding / dual-threat placement puzzle

---

## What This Game Did

First isometric perspective game in the series. Player guards a resting cattle herd on a 9x9 grid from a prowling mountain lion. Tap the grid to place firebrands (torches) — the lion re-routes around them using Dijkstra weighted by proximity to active firebrands. But place a brand too close to a cow and the cattle scatter, costing score. 5 rounds with escalating lion count (1→3), fewer brand charges (7→5), shorter burn times (18s→9s), and faster lion move intervals (0.9s→0.65s).

---

## Techniques Proven

### Isometric Grid Projection
```javascript
function isoToScreen(r, c) {
  return { x: CX + (c - r) * (TW / 2), y: CY + (c + r) * (TH / 2) };
}
function screenToIso(sx, sy) {
  const a = (sx - CX) * 2 / TW;
  const b = (sy - CY) * 2 / TH;
  return { r: (b - a) / 2, c: (b + a) / 2 };
}
```
CX=180, CY=148, TW=40, TH=20. screenToIso floats are rounded after tap to select the nearest cell.

### Painter's Algorithm Depth Sort
Draw entities in ascending (r+c) order so nearer tiles always draw over farther ones. Run once per frame on the combined [cows, lions, brands, player selection] array sorted by entity.r + entity.c.

### Dijkstra with Light-Cost Weighting
Each cell has a base move cost of 1.0. For each active firebrand, add a penalty of `BRAND_PENALTY * (1 - bd / BRAND_REPEL_RADIUS)` when `bd < BRAND_REPEL_RADIUS` (3.5 cells). Multiple brands stack. The lion recomputes its full path every move interval. Path is stored as a linked chain in `prev[r][c]`.

### Seeded Deterministic RNG for Tests
```javascript
function _rng() {
  _rngSeed = ((_rngSeed * 1664525 + 1013904223) | 0) >>> 0;
  return _rngSeed / 0xFFFFFFFF;
}
```
`window.__run.resetSeed(n)` allows tests to reproduce cattle placement exactly and make deterministic assertions about scatter behavior.

---

## Critical Bug: Float32Array Precision in Dijkstra

**Symptom:** `computeLionPath` returned an empty path whenever a firebrand was active. With no brands the path worked fine.

**Root cause:** The `dist` array was initialized as `Float32Array` rows:
```javascript
const dist = Array.from({ length: GRID }, () => new Float32Array(GRID).fill(INF));
```
When a fractional Dijkstra cost (e.g., `1.0 + 10.71 = 11.71`) was stored in a Float32 cell, its float64 representation from the priority queue did not equal the stored float32-rounded value. The stale-entry guard `if (d > dist[r][c]) continue` evaluated `true` for valid entries, so neighbors were never relaxed and `prev` chains broke.

**Fix:** Use regular `Array` (float64) for `dist`:
```javascript
const dist = Array.from({ length: GRID }, () => new Array(GRID).fill(INF));
```
Rule: **Never use typed arrays for Dijkstra distance tables when fractional costs are involved.**

---

## Test Suite Notes (50 tests)

- `isoToScreen` / `screenToIso` round-trip tests must avoid `window` references in Node.js — call the exposed `window.__run` functions directly.
- Scatter score test: seeded cattle may cluster within SCATTER_DIST so one brand placement can scatter multiple cows. Assert `score === -100 * scatterCount` where `scatterCount` is read back via `window.__run.getScatterCount()` rather than assuming exactly 1.
- Brand-near-path test: after fixing Float32, verify path still reaches target (len > 0, last cell = [4,4]) instead of `withBrand.length >= noBrand.length` (both are length 8).

---

## Round Config Summary

| Round | Lions | Brands | Burn Time | Move Interval |
|-------|-------|--------|-----------|---------------|
| 1     | 1     | 7      | 18s       | 0.90s         |
| 2     | 1     | 6      | 15s       | 0.80s         |
| 3     | 2     | 6      | 13s       | 0.75s         |
| 4     | 2     | 5      | 11s       | 0.70s         |
| 5     | 3     | 5      | 9s        | 0.65s         |

---

## What Raised the Bar

- First isometric perspective renderer in series
- First Dijkstra pathfinding where cost field is dynamic (changes every frame as brands burn)
- First dual-threat placement puzzle: every brand placement simultaneously helps (repels predator) and risks hurting (scatters cattle)

---

## Action Items for Game 61 (Snake Eyes)

- Liar's Dice hidden-information model: each player has a private dice pool; bids reference combined totals neither player can see directly
- Sheriff AI personality modes need distinct bid distribution models (not just speed variation)
- Probability display: show rough "likelihood bid is valid" like Drought Rider's risk display — keep informed decisions accessible
- Bounty-reveal animation at round end should mirror Outlaw Auction's satisfying reveal arc
