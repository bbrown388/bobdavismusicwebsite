# Retrospective: Outlaw Auction (Game 47)

**Date:** 2026-05-12
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First hidden-information economic game in the series** - Cattle Auction (Game 33) showed visible lot grades; Outlaw Auction hides the bounty behind `???`. The player must infer value from rival behavior rather than reading it directly off the screen. This fundamentally changes the game from optimization (maximize value extraction) to inference (estimate hidden value from noisy signals).

- **Behavioral tell system is clean and teachable** - Five rivals with distinct archetypes (EAGER, PATIENT, STEADY, CAUTIOUS, BLUFFER). Each rival's bidding frequency and max-willing correlate to their accuracy rating. ROSA is the gold standard tell (accuracy 0.90, slow bids = genuinely high value). BILLY is the noise source (accuracy 0.35, bluffsLow=true). Players learn the archetypes over 6 rounds of repeated exposure. The "rival limits" reveal at lot close (showing each rival's maxWilling) is educational feedback that teaches players which tells to trust.

- **Bankroll management adds real economic stakes** - Player starts with $3000 and ends with more or less based on inference quality. Unlike Cattle Auction where the player was auctioneer (no financial stake), here the player is a buyer who can go negative. The bankroll display shows profit/loss in color (green/red) giving immediate financial feedback.

- **Player fold mechanic creates genuine dilemma** - Watching rivals settle at a price you believe is below the true bounty (and choosing not to bid) is a strategic decision. Folding too much leaves profit on the table; overbidding for a low-value outlaw tanks the bankroll. The BID/FOLD button pair is clean and readable.

- **Bounty reveal is an emotional payoff moment** - The progressive reveal animation (reveal bar slides in, bounty number appears, then net profit shown in green/red) creates a genuine reaction for each lot. Players who overbid feel it. Players who read tells correctly and bid at the right price see the green `+$XXX NET` and feel validated.

- **Cooldown-based auction close** - Instead of going-once/going-twice (Cattle Auction), the HAMMER bar ticks down from 3.8s after each bid. Any bid resets it. This creates natural tension: rivals might bid again (extending time) or go silent (player's chance to win cheap or walk away). The bar color shifts from gold to orange to red as time runs out, communicating urgency without explicit text.

- **36 tests, 0 failures on first run (after one setter fix)** - Only fix needed was adding `set lotClosed(v)` to the test API. The `lotClosed` getter existed but no setter, so tests that wrote `window.__oa.lotClosed = true` were silently creating a new JS property instead of setting the internal variable. Fix was one line.

---

## What Caused Friction

- **Idempotent doCloseLot needed careful state management** - `doCloseLot` must be guarded by `lotClosed` to prevent double-close (rival bid fires during the reveal animation, etc.). The guard (`if (lotClosed) return;`) pattern works cleanly and is tested in S19.

- **Rival "excite" values at lot start** - Initial excitement calculation: `excite = (maxWilling - startPrice) / (bounty - startPrice)`. When bounty is close to startPrice (low-value outlaws), the denominator is small and the formula can produce extreme values. The `Math.max(0.05, Math.min(0.98, ...))` clamp prevents visible artifacts but the formula isn't perfectly intuitive. A future game might normalize against the rival's budget instead.

- **COOLDOWN_INITIAL = 5.5s** - A longer initial silence period before rivals start bidding was added to give the player time to read the announcement screen before the auction begins in earnest. Without it, rivals would start bidding immediately and players would miss the transition from `announce` to `bidding`.

---

## What Raised the Bar vs. Game 46

| Dimension | Prairie Telegraph (46) | Outlaw Auction (47) |
|---|---|---|
| Core mechanic | Visual symbol decoding + relay | Hidden-value inference + bidding |
| Player role | Message relay station | Active economic buyer |
| Information model | All info visible, decode it | Key info hidden, infer it |
| New mechanic | Semaphore 26-letter alphabet | Hidden-value tell inference, bankroll management |
| Financial stakes | None (score only) | Real bankroll can go negative |
| Learning feedback | Score +200/+100 fast/slow | Rival maxWilling reveal teaches tells |
| Emotional payoff | Correct relay flash | Bounty reveal + net profit animation |
| Disruption mechanic | Wind gust scrambles arms | Bluffer (Billy) injects false signals |

---

## Action Items for Game 48

1. **Hangman's Bluff is next** - Interrogation deception game, player bluffs through a sheriff checkpoint. First player-side deception mechanic (vs. Wanted: Dead or Alive where player was investigator).
2. **Consistency tracking** - Sheriff remembers your previous answers; contradictions compound suspicion. Needs a "lie memory" system tracking which answers were true/false.
3. **Dialogue branching** - Multiple response choices per question, consequences compound. First branching-dialogue system in series.
4. **Suspicion meter** - Replace economic bankroll with a single visible suspicion gauge that tips between pass/fail at the end.
