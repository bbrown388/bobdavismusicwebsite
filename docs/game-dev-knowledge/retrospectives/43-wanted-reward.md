# Retrospective: Wanted: Reward (Game 43)

**Date:** 2026-05-09
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First visual search mechanic in the series** - All prior games used reaction timing, memory, physics, or audio. Wanted: Reward is the first where the primary challenge is spatial scan: the player scrolls a crowd looking for a silhouette that matches all clue traits. The wanted poster stays visible while scanning, making this a comparison task rather than a memory test (contrast with Game 9 Wanted Poster which hid the poster).

- **Multi-trait composite matching** - The trait system (hat × build × item × face = 4×2×3×3 = 72 combinations) generates reliable visual uniqueness. The `generateDecoy` function guarantees every decoy differs on at least one clued trait, making the fugitive always uniquely identifiable. Tested in 20 consecutive trial runs (S5).

- **Economic payout mechanic** - The 25% penalty per wrong ID creates a clear economic tension: act quickly but risk penalty, or scroll more carefully. The round reward displayed in real-time tracks the diminishing payout, giving the player immediate feedback on how each wrong tap costs them.

- **Silhouette trait rendering** - Four traits are visually distinct at 60px-wide slot scale:
  - Hat: cowboy (wide brim + gold band), tophat (tall narrow), cap (semi-circle + forward brim), none
  - Build: slim (15px body) vs. stout (24px body) - almost 2× width ratio
  - Item: rifle (long thin barrel extending above shoulder) vs. sack (rounded bulge at hip) vs. none
  - Face: beard (dark arc at chin) vs. scar (red diagonal line through face) vs. none

- **Scroll arrows + dot indicators** - Left/right arrows pulse only when content is off-screen. Dot indicators below the crowd show figure count and which are visible. Both appear/disappear contextually.

- **Portrait on poster** - Drawing the actual fugitive at scale=1.0 inside the poster's portrait box (with clip) gives the player a direct visual reference. The same drawing function renders the poster portrait and the crowd figures, so the comparison is 1:1.

- **35 tests all pass first run** - No logic failures. Test scope issues that affected prior games (constants referenced outside evaluate()) were avoided by using `window._wr` exclusively.

---

## What Caused Friction

- **Scale of the portrait figure** - At scale=1.0, the 98px-tall figure fits the 104px portrait box only barely. Hat tips sometimes clip the top edge. A future improvement would be to draw the portrait at scale=0.92 to give 5px headroom above the tallest hat.

- **Decoy generation with tight clue constraints** - With 4 clue keys and all-same traits, `generateDecoy` could theoretically run many iterations. The 200-attempt loop + fallback handles this gracefully, but the fallback only changes one key. This could produce decoys that look very similar to the fugitive on the non-clued traits (which is actually good for gameplay realism, but worth noting).

---

## What Raised the Bar vs. Game 42

| Dimension | Coyote Call (42) | Wanted: Reward (43) |
|---|---|---|
| Core mechanic | Real-time pitch matching (audio) | Visual scan + composite matching |
| Primary input | Drag to set frequency | Drag to scroll, tap to select |
| Challenge type | Motor precision (hit frequency band) | Perceptual discrimination (identify figure) |
| Game structure | 5 rounds with fixed targets | 5 rounds with increasing crowd/decoy difficulty |
| New mechanic | Analog pitch-drag | Multi-trait visual search, economic payout |
| New visual | Oscilloscope dual-waveform | Crowd silhouette with 4-trait variation |
| Clue count | N/A | 2 clues (R1) → 4 clues (R5) |

---

## Action Items for Game 44

1. **Trail Blaze is next** - Wilderness pathfinding: draw a trail through procedurally generated terrain, optimize for supply cost. First player-drawn route mechanic in series.
2. **Terrain cost system** - Different terrain types (mountain, river, forest, desert) with travel-cost multipliers. Consider using A* to show the "optimal path" as comparison after each round.
3. **Supply drain** - Tiles crossed drain supplies; reaching the destination before supply runout wins the round.
4. **Route threats** - Per-round random events: flood zones, rockslides, rival wagon trains that block certain paths.
