# Retrospective: Snake Oil (Game 13)

**Date:** 2026-04-28
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First matching/inventory puzzle in the series** -- all prior 12 games use spatial/timing/memory mechanics. Snake Oil introduces an ingredient-combo lookup mechanic: the player must identify which two of 9 ingredients cure each customer's ailment. This is a different cognitive skill from anything prior.

- **NPC dialogue-driven mechanic** -- each customer arrives with a spoken clue ("Got bit by a rattler!", "Can't stand up straight!") that maps to a remedy. Early ailments are obvious (Snake Bite/Fever/Bad Back); later ones (Low Spirit, Cough) require learning the recipe guide shown on the title screen. The dialogue gives the game genuine personality within the Bob Davis brand voice.

- **Sliding ingredient tray** -- 9 ingredients displayed 4 at a time with scroll arrows. Scroll bounds are enforced (cannot go below 0 or above INGREDIENTS.length - 4). This creates a spatial memory challenge: players learn where their needed ingredients live in the tray and develop muscle memory for the scroll.

- **Timer pressure with visual feedback** -- each customer has a timer bar that shifts gold -> orange -> red as time runs out. The bar is drawn under the customer silhouette so the urgency is always in the player's peripheral vision while reading the clue.

- **Remedy guide on title screen** -- the full 6-ailment recipe list is shown on the title screen before play starts. Players can study it before their first run, then refer back after each game over. This keeps the mechanic fair while rewarding memory.

- **Level escalation** -- `randomAilmentIdx()` draws from an expanding pool as level increases: levels 1-1 offer 3 ailments, level 2+ adds more obscure ones. Level advances every 5 served customers.

- **Time bonus scoring** -- correct mixes earn 10 + up to 10 bonus points based on fraction of timer remaining. Rewarding fast serves incentivizes learning the recipe list rather than guessing.

- **Dr. Davis medicine wagon backdrop** -- detailed wagon drawing with arch canvas top, "DR. DAVIS / MIRACLE CURES & REMEDIES / Est. 1883" sign, decorative bottles, and spoked wheels. The wagon establishes the frontier medicine show setting immediately.

- **Customer walk-in/walk-out animation** -- customers slide in from the left when spawning and exit right (on correct serve) or left (timer expired, unhappy) after interaction. Reaction states change the silhouette color: dark green on happy, dark red on sad. Small expression arcs (smile/frown) reinforce the reaction.

- **Speech bubble system** -- robust word-wrap implementation: measures text width, draws a cream-colored bubble with a pointed tail, wraps to two lines if text exceeds bubble width. Tail correctly points down toward the customer's head.

- **tickFrames test helper (action item from Game 12 retro)** -- exposes `window.__test.tickFrames(n)` which calls `update(1/60)` n times synchronously inside page.evaluate(). Suites 17, 18, and 25 use this instead of `waitForTimeout`, making timer-dependent tests fast and deterministic. This was the top action item from Stampede.

- **30 test suites, all pass** -- covers: title (1), canvas dimensions (2), startGame reset (3), customer spawn (4), ailment data (5), selection (6), deselect (7), max-2 cap (8), scroll right (9), scroll left (10), left bound (11), right bound (12), correct mix score (13), customer departure (14), wrong mix mistakes (15), wrong mix no score (16), tickFrames timer (17), timer expiry (18), 3-mistake game over (19), endGame (20), dead screen (21), localStorage (22), new record (23), feedback overlay (24), tickFrames sync (25), mix button guard (26), served counter (27), time bonus (28), ingredient list (29), console error sweep (30).

---

## What Caused Friction

- **Customer entering guard in update()** -- the early `return` when `customer.entering` is true means particles and popups do not update during the walk-in animation. This is acceptable (walk-in is short, ~14 frames) but could cause popup text to appear frozen in future games that overlap entry with other events.

- **tickFrames and entering guard** -- `tickFrames` calls `update(1/60)` but `setCustomerReady()` must be called first in tests to clear `entering: true`, otherwise the timer does not deplete in test scenarios. Suite 17 and 18 both call `setCustomerReady()` before tickFrames -- this is correct but non-obvious.

---

## Bugs Caught Before Shipping

- None -- first run was clean. The stateless recipe lookup (no hidden state, just set membership) and the simple linear update loop made correctness easy to verify.

---

## Action Items for Game 14

1. **Combo streak counter** -- track consecutive correct mixes without a miss. Display streak multiplier (x1.5 at 3-streak, x2 at 5-streak). Adds depth to timing-based scoring without changing core mechanic.

2. **Customer impatient animation** -- when timer < 25%, give the customer a subtle "tap foot" animation (oscillate y position ±2px). Currently the only urgency signal is the color of the timer bar.

3. **Walking SFX** -- a subtle rhythmic footstep sound during the walk-in animation. Currently silent during entry.

4. **Second customer slot** -- planned for higher levels; not implemented in Game 13. Game 14 could add a simultaneous second customer queue slot for harder difficulty.

5. **Update returning to entering guard** -- refactor so particles/popups update even during entering, by moving the early return to only skip timer decrement rather than the entire update body.

---

## What Raised the Bar vs. Game 12

| Dimension | Stampede (12) | Snake Oil (13) |
|---|---|---|
| Mechanic type | Real-time dodge (reaction) | Matching/inventory puzzle (knowledge) |
| NPC interaction | None | 6 distinct characters with spoken clues |
| UI complexity | 3 HUD elements | Tray + mix button + timer bar + score + level + mistakes + speech bubble |
| Cognitive demand | Spatial (lane/depth reading) | Semantic (ailment-to-combo lookup) |
| Escalation | Speed increases | Ailment pool expands, timer shortens |
| Test coverage | 23 suites | 30 suites |
| Test determinism | Time-dependent (waitForTimeout) | tickFrames synchronous helper |
