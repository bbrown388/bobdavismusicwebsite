# Retrospective: Barbed Wire (Game 32)

**Date:** 2026-05-05
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First tower-defense structure in the series** - All 31 prior games used action, rhythm, physics, stealth, or puzzle mechanics. Barbed Wire is the first game where the player builds static defenses before and during combat. The wire network persists across the wave, taking and absorbing damage, requiring maintenance decisions mid-wave.

- **Wire/graph edge mechanic** - Posts are nodes; wire segments are edges. `areAdjacent()` enforces that only neighboring posts can connect. `MAX_CONN=2` per post creates a real constraint: interior posts in a column chain use both slots for vertical barriers, forcing players to choose between extending a line or adding a horizontal brace. The strategic space is small enough to be legible, deep enough to matter.

- **Adjacency enforced inside `createWire`** - An early test caught that `createWire` didn't validate adjacency itself -- only `handleTap` did. Added `if (!areAdjacent(pA, pB)) return;` as an invariant inside the function so tests calling `createWire` directly can rely on it. This is the right design: data-layer functions should enforce their own invariants.

- **ptSegDist for universal wire-rustler collision** - Using the point-to-segment distance formula means any wire orientation (horizontal, vertical, diagonal if future modes add it) automatically catches rustlers. No special-casing per wire type. This paid off in test Suite 41-43 which verified contact with vertical wires works without adjustment.

- **Wave escalation is smooth** - 5 waves with count 5/6/8/10/12 and increasing speed/HP means each wave is noticeably harder without being a sudden spike. The 2.4s spawn interval in wave 1 creates natural pauses between rustlers so the player can learn wire placement; by wave 5 at 1.5s, rustlers are nearly continuous.

- **50 tests pass** - Full coverage: canvas dims, constants, post grid (30 posts), adjacency rules in all directions, wire creation/prevention/repair, distance math, startGame resets (all 6 state vars), rustler spawn/movement/slowing, wire and rustler HP drain, score increment, cattle loss, all state transitions (playing/wave_result/gameover/win), FEEDBACK_ENDPOINT, localStorage key, canvas tap, pixel color, console error sweep.

---

## What Caused Friction

- **Missing adjacency guard in `createWire`** - Suite 23 caught that `createWire(pA, pB)` with non-adjacent posts still created a wire because the check lived only in the tap handler, not the function itself. Fixed by adding `if (!areAdjacent(pA, pB)) return;` as the first line. One-line fix, clean invariant.

---

## What Raised the Bar vs. Game 31

| Dimension | Pony Express (31) | Barbed Wire (32) |
|---|---|---|
| Genre | Action-rhythm hybrid | Strategic tower defense |
| Player role | Reactive (tap to beat) | Proactive (build before enemy arrives) |
| Persistent state | Beat scroll, speed/sync | Wire network survives between updates |
| Spatial reasoning | None (1D timing) | 2D post grid, connection topology |
| Wave design | Escalating BPM sections | Distinct rustler count/speed/HP per wave |
| Graph mechanic | None | Posts as nodes, wires as edges, MAX_CONN constraint |

---

## Action Items for Game 33

1. **Cattle Auction is next** - Economic bidding simulation: player is auctioneer, six buyers with distinct wealth/desire levels bid in real time.
2. **First economic simulation** - No prior game uses a bidding or market mechanic. Raise the bar on reading multiple simultaneous behavioral signals.
3. **Buyer AI** - Each buyer has budget, desire (0-1), and a bluff probability. Desire drops as price rises. Beyond budget = drops out. Bluff occasionally bids above desire to push others out.
4. **Auctioneer timing** - Player taps to call "GOING ONCE / GOING TWICE / SOLD" at peak price. Waiting too long risks bidders losing interest; calling too early leaves money on the table.
