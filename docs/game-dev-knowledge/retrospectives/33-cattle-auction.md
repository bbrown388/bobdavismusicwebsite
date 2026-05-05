# Retrospective: Cattle Auction (Game 33)

**Date:** 2026-05-05
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First economic simulation in the series** - All 32 prior games used action, physics, rhythm, stealth, puzzle, or narrative mechanics. Cattle Auction is the first where scoring is purely economic: the player accumulates revenue by managing timing across 8 sequential lots. There is no combat, no health bar, no spatial navigation.

- **Auctioneer timing mechanic is genuinely tense** - The core loop (watch buyers bid, decide when to call) creates real pressure. Calling early leaves money uncaptured; waiting too long drains the heat bar to zero and forces a no-sale. The two-stage call (going once → going twice → sold, each 2.8s) gives buyers exactly enough time to rescue a lot if they're still active, which keeps the player guessing whether to wait.

- **6 buyers with distinct behavioral signatures** - Each buyer has a budget, a base desire, and a personality that affects both bid frequency and bluff probability:
  - `steady`: regular intervals, reliable
  - `cautious`: slow, conservative — only bids when strongly motivated
  - `bluffer`: fast, sometimes bids 30% above their desire threshold to push others out
  - `patient`: very slow, waits for others to exhaust before swooping
  - `selective` (Doc): only aggressive on Grade A lots; nearly invisible on C
  - `eager` (Billy): fast, bids on everything, low budget so drops out early

- **Desire-per-grade mechanic creates lot-to-lot variety** - Grade A lots trigger aggressive multi-buyer bidding wars; Grade C lots are quiet, with only `eager` and `steady` participating. The distribution (3A, 3B, 2C shuffled) means no two auctions feel the same.

- **Heat bar creates urgency without a hard clock** - Rather than a countdown timer, the `INTEREST` bar decays at 1.4%/s, replenished 9% per bid. This means lively auctions sustain themselves naturally; dead lots burn out fast. A dead lot failing to a no-sale feels earned, not arbitrary.

- **SOLD/NO SALE result screens are punchy** - The brief 2.2s overlay with gavel sound + chord arpeggiation on a sold lot vs. descending sawtooth on no-sale gives each lot a distinct emotional beat.

- **75 tests across 25 suites all pass** - Coverage includes canvas dims, all constants, BUYER_DEFS structure, BID_INTERVALS ordering, initLots/initBuyers/startGame resets, desireForGrade personality scaling, placeBid side effects (price, lastBidderIdx, heat boost, callStage reset), buyer dropout, advanceCall state machine, heat decay/clamp/no_sale trigger, lotResults accumulation, localStorage key, FEEDBACK_ENDPOINT, click handler, pixel color, console error sweep, roundRect polyfill.

---

## What Caused Friction

- **Heat starts at 100, so placeBid boost isn't visible in a naive test** - `Math.min(100, 100 + 9) = 100`. Fixed by setting `heat = 80` in the test before calling `placeBid`.

- **Buyer timers fire during heat-decay test** - `setLotDesires()` sets `bidNextAt = 0.5 + random*2.5`, so some buyers would fire within the 1.0s tick used to test heat decay, boosting heat above the starting value and making the test appear to fail. Fixed by freezing `bidNextAt = 999` on all buyers before the tick.

- **Both issues were test construction bugs, not game logic bugs** - The game mechanics were correct from the first write.

---

## What Raised the Bar vs. Game 32

| Dimension | Barbed Wire (32) | Cattle Auction (33) |
|---|---|---|
| Genre | Strategic tower defense | Economic simulation |
| Player role | Build defenses, hold the line | Read behavioral patterns, time a call |
| Core input | Tap to place wire segments | Tap to advance auctioneer call |
| Simultaneous signals | 1 wave of enemies | 6 buyers with distinct personalities and states |
| Scoring | Cattle saved (binary per wave) | Continuous revenue accumulation across 8 lots |
| Emergent tension | Rustlers breaking wires mid-wave | Heat bar vs. active bidder count |
| New mechanic category | Graph/edge construction | First economic/bidding simulation in series |

---

## Action Items for Game 34

1. **Dust Devil Dance is next** - Generative music sandbox: player draws paths for dust devils; each plays a melodic loop; overlapping paths create harmonics.
2. **First aesthetic win condition in the series** - No score, no lives, no enemies. Player composes before a storm timer expires.
3. **Web Audio is the deepest it's been since Honky Tonk** - Each dust devil needs an oscillator with frequency/timbre shaped by path geometry and landmark proximity.
4. **Loop recording mechanic** - Each dust devil loops its path. The composition layer builds up as more devils are placed.
