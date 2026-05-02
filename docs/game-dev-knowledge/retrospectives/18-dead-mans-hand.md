# Retrospective: Dead Man's Hand (Game 18)

**Date:** 2026-05-02
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First card game in the series** — Full Texas Hold'em hand evaluation implemented from scratch: eval5 (5-card evaluation), best7 (best-5-from-7 via 21 combinations), and cmpScore (lexicographic comparison). Handles all 9 hand ranks including the A-2-3-4-5 "wheel" straight edge case where the high card is 5, not Ace.

- **Three distinct AI personalities with behavioral models** — Each AI opponent has a named style that governs both betting behavior and bluff rate:
  - **Snake Pete** (tight-aggressive): folds weak hands (strength < 0.28), bluffs 20%, tell accuracy 80%
  - **Diamondback** (loose-aggressive): calls almost anything, raises often (str > 0.42), bluffs 60%, tell accuracy 65%
  - **Preacher Jack** (calling station): calls frequently, rarely raises, traps with strong hands, bluffs 35%, tell accuracy 75%

- **Probabilistic tell system — first "read the opponent" mechanic in series** — Each AI generates a `tell` signal (`nervous`, `confident`, `neutral`) after deciding its action. The signal is correct with probability `tellStr` (0.65–0.80). A bluffing AI with high tell accuracy shows "NERVOUS"; a bluffing AI with low tell accuracy may show "CONFIDENT" or "NEUTRAL". Players learn which AIs have reliable tells over the 5-hand series. Visual tell: pulsing red dot + "NERVOUS" label or steady green dot + "STEADY" label.

- **First multi-opponent AI game in series** — Three opponents act sequentially after each player action. The action queue (`aiQ`) processes them with a 0.65s delay each, creating convincing "thinking" rhythm. Each AI's fold/call/raise is animated with a colored label above their cards (red=FOLD, gold=RAISE, green=CHECK/CALL).

- **Canvas card rendering** — Cards drawn entirely in canvas: rounded rectangles with rank (2-A) top-left, suit symbol (♠♥♦♣) top-left below rank, and large centered suit symbol. Face-up: cream `#F5F0E0` background, dark navy for spades/clubs, red for hearts/diamonds. Face-down: dark purple `#1a0d35` with gold border and inner pattern.

- **Silhouette AI portraits** — Each of the 3 opponents has a distinct canvas-drawn silhouette: Snake Pete (narrow crown), Diamondback (bandana), Preacher Jack (tall crown + white collar). All use brand color palette.

- **Pre-flop blind system** — Player posts SB=10 automatically, AI[0] posts BB=20. The `currentBet` is initialized to BB=20 so the player's CALL on pre-flop is only 10 chips. The "BET/RAISE" button shows the correct label depending on whether `callAmt` is 0 (BET $40) or > 0 (RAISE $X).

- **Community card progression** — Board reveals in standard Hold'em stages: 3 on flop, +1 on turn, +1 on river. Player can see their hand label (Pair, Two Pair, etc.) live once 3 or more community cards are showing, helping strategy.

- **Chip busting and AI elimination** — AIs with 0 chips at end of a hand get `busted = true` and are skipped for future hands (rendered at 28% opacity with "BUSTED" label). Game ends immediately if all AIs bust out (player wins) or player reaches 0 (player loses). Also ends after MAX_HANDS=5 regardless.

- **44 tests, all pass** — Covers: title state (1), canvas dims (2), startGame (3), chip init (4), AI count (5), name uniqueness (6), bluff rate differences (7), hole card dealing (8-9), community starts empty (10), eval5 all 9 ranks (11-19), best7 from 7 (20), cmpScore (21), preFlopStrength (22), tight AI folds weak hand (23), tell validity (24), playerAct fold (25), call pot increase (26), raise currentBet increase (27), flop 3 cards (28), turn 4 cards (29), river 5 cards (30), showdown trigger (31), showdown resolution (32), pot distribution (33), hand counter (34), bust to game_over (35), MAX_HANDS constant (36), wheel straight (37), render checks (38-40), feedback overlay (41), state cycle (42), blind constants (43), console error sweep (44).

- **Fixed mid-session: flushAIs() loop exit** — Initial implementation exited the while loop when `aiQ.length === 0` before calling `processAI()` to trigger `advanceBettingRound()`. Fixed by removing the `aiQ.length > 0` check from the while condition, allowing one extra call which finds the empty queue and advances the round.

- **Fixed mid-session: `popups` undefined on title screen** — The RAF loop called `update()` → `updatePopups()` → `popups.filter()` before `startGame()` initialized `popups`. Fixed by initializing `popups = []` at variable declaration.

---

## What Caused Friction

- **flushAIs() loop condition** — The off-by-one where the loop needs N+1 iterations (N AIs + 1 to flush the empty queue) was not obvious. Pattern to remember: any "process queue" test helper needs one extra call after the queue drains to trigger the post-queue logic.

- **Pre-flop call amount** — Player posts SB=10 but BB is 20, so pre-flop CALL = `currentBet - player.bet = 20 - 10 = 10`. Correct but slightly non-obvious; worth keeping in mind for tests that check chip counts after calling.

---

## Bugs Caught Before Shipping

None — all 44 tests passed after the two fixes above. No game logic bugs in card evaluation, AI decisions, or chip accounting.

---

## Action Items for Game 19

1. **Canyon Crossfire is next** — Side-scrolling cover shooter. First shooter mechanic in series.
2. **Cover system** — Player peeks left/right from behind a boulder. Track peek exposure time; getting shot ends the peek.
3. **AI reload patterns** — Each outlaw has a different reload duration (1.5–3.5s). Staggered so there's usually a window to fire.
4. **Return fire timing** — Outlaws fire in reaction to player peek. Need a "reaction time" variable per AI (0.3–0.8s) so it feels fair.
5. **Ballistic projectile** — The shot/bullet should be a visible line or dot traveling across the screen, not instant-hit.

---

## What Raised the Bar vs. Game 17

| Dimension | Rope Trick (17) | Dead Man's Hand (18) |
|---|---|---|
| Core mechanic | Single-player precision throw | Multi-player card game with AI opponents |
| AI system | No AI opponents | 3 opponents with distinct behavioral models |
| New mechanic type | Physics timing | First card game, first hand evaluation engine |
| Opponent reading | Wind indicator | Probabilistic tell system (first "read opponent") |
| State complexity | Single phase (aiming/throwing) | Full betting round state machine (pre-flop/flop/turn/river/showdown) |
| Code complexity | Physics arc math | Hand evaluator (eval5 + best7 + cmpScore), AI decision trees |
| Test count | 40 | 44 |
