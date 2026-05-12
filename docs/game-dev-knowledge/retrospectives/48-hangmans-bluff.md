# Retrospective: Hangman's Bluff (Game 48)

**Date:** 2026-05-12
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First player-as-deceiver mechanic in the series** - Every prior "deception" game (Wanted: Dead or Alive, Wanted Poster, Boot Hill Bluff) had the player detecting deception by others. Hangman's Bluff inverts this: the player IS the outlaw, choosing which lies to tell and which truths to reveal strategically. This is a genuinely new relationship with the player.

- **Lie memory / consistency system landed cleanly** - Q6's `matchesTrade` check implements the "sheriff remembers your earlier answers" mechanic. The system tags each answer with a storyMemory key/value, and Q6 checks whether the player's claimed outfit is consistent with their stated trade. The contradiction fires a 25-point bonus on top of the base delta, which is large enough to be felt without being punishing on its own.

- **Three-stage structure creates natural arc** - Stage 1 (Initial Screening) is neutral and establishes the player's story. Stage 2 (Closer Inspection) probes harder, introducing the Redrock robbery question and the consistency check. Stage 3 (Direct Questioning) confronts the player with the wanted poster directly. The stage transition `stage_intro` overlays between each section give the interrogation a theatrical rhythm.

- **Suspicion meter with dual thresholds is readable** - The horizontal bar changes color (green → yellow → red), has a dashed marker at 80% (instant arrest line) and another at 60% (pass threshold). Players can see exactly where they stand and what they need to avoid. The gold "pass line" at 60% gives a clear target.

- **Sheriff portrait expressions work well** - Five expression states (neutral, curious, suspicious, angry, pleased) with distinct visual features: eye shape (round vs. narrowed ellipses), eye color (gold/amber/red), eyebrow tilt for suspicious/angry, background glow for high-tension states, and badge gleam. The `leanX` offset subtly tilts the sheriff forward for stage 3 questions.

- **Dynamic Q6 question text** - The `[trade]` placeholder gets replaced at render time with the human-readable trade label from `storyMemory.trade`. Players see "You mentioned you're a ranch hand" or "You mentioned you're a horse trader" depending on their stage 1 choice. Small touch but adds significant coherence.

- **37 tests, 0 failures** - Clean first run. Test suite covers: state transitions, suspicion math, storyMemory tagging, Q6 consistency checking for all 4 trade paths, stage boundary triggers, calcScore, full walkthrough, config constants, and no-console-errors sweep.

---

## What Caused Friction

- **`update-status.js` JSON argument quoting** - PowerShell escaping for inline JSON is unreliable. The file-path argument (`autonomous/.status-patch.json`) is the correct path and avoids all quoting issues. Always use this pattern for status checkpoints.

- **Q3 has 3 answers, others have 4** - The button layout handles variable counts gracefully (iterates `answers.length`), but the slight visual difference between a 3-button and 4-button question could confuse players briefly. All 3-answer questions could be expanded in a future revision, but it's minor.

- **No visual for the "thinking pause" during reaction** - After the player chooses, the reaction timer runs but the screen is mostly static (sheriff portrait + reaction text box). A brief "sheriff processing" animation (e.g., slow blink, hand stroking chin) would add polish. Not a bug, but worth noting for a future polish pass.

---

## What Raised the Bar vs. Game 47

| Dimension | Outlaw Auction (47) | Hangman's Bluff (48) |
|---|---|---|
| Core mechanic | Hidden-value inference + bidding | Player deception + consistency tracking |
| Player role | Buyer (economic) | Fugitive (narrative) |
| Information model | Rivals' max-willing hidden | Player's own prior answers tracked |
| New mechanic | Hidden-value tells, bankroll | Lie memory, branching consequence |
| Fail condition | Bankroll negative | Suspicion ≥ 80% (instant arrest) |
| Character depth | 5 rival archetypes | Sheriff with 5 expression states |
| Narrative arc | 6 independent lots | 3 escalating interrogation stages |
| First-in-series | Hidden-info economic | Player-side deception, dialogue branching |

---

## Action Items for Game 49

1. **Lariat Spin is next** - Physics-based rope spinning. Tap rhythmically to build angular momentum; release at the precise angle to catch a moving target.
2. **Rotational physics** - First true rotational simulation in series (vs. constraint-based pendulum in Last Rope Standing). `omega` (angular velocity), `tension` (centripetal force), drift and collapse physics.
3. **Momentum accumulation + precision release** - Two distinct phases: spin-up and release. The skill is in knowing when you have enough momentum and picking the right release angle.
4. **First skill-toy mechanic** - Distinct from throwing (Lasso Loop, Rope Trick) because the primary activity is maintaining spin, not aiming.
