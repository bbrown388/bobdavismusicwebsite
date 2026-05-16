# Retrospective: Game 55 -- Cattle Baron

**Date:** 2026-05-16
**File:** `cattle-baron.html`
**Tests:** 78 pass

---

## What Was Built

Turn-based ranch strategy. A 4x4 grid of land parcels represents the frontier. The player starts owning the entire bottom row (4 parcels), and expands upward by buying adjacent parcels. Each round, 2 threats are revealed upfront -- drought, rustlers, wildfire, flash flood, or clear skies -- and the player has 2 actions to respond: GRAZE cattle to earn income, BUY adjacent land, DEFEND a parcel against raiders, or REPAIR damaged land. After actions, threats resolve, income is collected, and the next round begins. 10 rounds total; final score is gold plus a territory bonus.

**Controls:** Tap an action button to enter that mode, then tap a parcel to apply it. Tapping a parcel without a mode shows its status. END TURN button resolves threats and advances.

**Parcel states:**
- Empty (dark): not owned; shows price, highlights if adjacent to owned land
- Owned (medium brown): owned, not grazed
- Grazed (golden, 1-3 dots): earns $120 / $200 / $260 per round
- Defended (teal inner border): immune to rustlers this round
- Damaged (dark red): earns nothing until repaired

**Threat mechanics:**
- `drought_mild`: overgrazed (grazeTurns >= 2) parcels each have 50% chance of damage if undefended
- `drought_heavy`: grazed parcels 40%, overgrazed 85% chance
- `rustlers`: picks one undefended grazed parcel, reduces grazeTurns by 1, steals $100
- `rustlers_gang`: up to 2 raids, $150 each
- `wildfire`: random column, 60% chance each grazed undefended parcel in that column burns
- `flash_flood`: bottom two rows, 20% damage chance
- `peaceful` / `good_grazing`: no damage; good_grazing adds $50 per active grazed parcel
- Round 10 always draws good_grazing + peaceful (reward round)

**Scoring:** `gold + owned_count * 50 + active_grazed_count * 100`

---

## What Raised the Bar vs. Game 54

1. **First territory-expansion strategy in series**: All prior strategy games (Trail Blaze, Outlaw Auction, Cattle Auction) managed resources or paths. Cattle Baron introduces spatial land ownership -- the grid IS the strategy surface. Which column to buy into, which parcels to prioritize for grazing vs. defense, how to expand adjacency chains -- these are decisions absent from any prior game.

2. **First multi-round economic arc with compounding returns**: Earlier economic games (Outlaw Auction, Hangman's Bluff economic layer) resolve in a single session. Cattle Baron spans 10 rounds where early investments compound -- a grazed parcel that avoids two drought rounds pays dividends; a parcel bought in round 2 that reaches grazeTurns=3 by round 8 accumulates $260 x 6 rounds = $1560 in returns from a $160 purchase. This multi-turn payoff horizon is new to the series.

3. **First risk-layered resource management with compounding hazard**: Overgrazing (grazeTurns >= 2) earns more but escalates drought probability to 85%. The decision to push a parcel from 1 to 2 grazeTurns is always a risk/reward calculation that changes based on current round, upcoming threats, and whether the player can afford to defend. No prior game asked the player to manage a risk accumulation variable in their resource decisions.

---

## Technical Implementation

**Grid math:**
```
COLS=4, ROWS=4, CELL=65, GAP=5
GRID_W = 4*65 + 3*5 = 275
GX = (360-275)/2 = 42 (rounded)
GY = 132
GRID_H = 275
Grid bottom = 407
```

**Layout stack:**
- Header (gold, title, round): y=0-40
- Income preview + actions remaining: y=22-40
- Threat pills: y=48-72
- Mode indicator: y=86
- Row labels (FAR/MID/NEAR/HOME): left of grid
- Grid: y=132-407
- Action buttons (4x, each 81x42): y=421-463
- END TURN: y=471-509
- Round log (last 3 entries): y=521+

**Action button computation:**
```
BTN_W=81, BTN_GAP=5
totalBtnW = 4*81 + 3*5 = 339
startX = (360-339)/2 = 10 (rounded)
```

**Threat drawing:** `drawThreats()` always produces exactly 2 entries in `threats[]`. Round 10 always draws `good_grazing` + `peaceful`. Earlier rounds draw one guaranteed hazard, then a second that is peaceful with probability `max(0.15, 0.55 - round * 0.04)` -- so by round 8 there's only a 23% chance of a peaceful second threat.

**isAdjacent():** Simple orthogonal neighbor check -- a parcel is purchasable only if at least one of its 4 neighbors is owned. This creates the "frontier expansion" feel without any pathfinding.

**isValidForMode():** Highlights valid targets with a gold border so players always know what can be tapped. Repairs only valid if damaged, defend only if not already defended and gold >= cost.

**endTurn() flow:**
1. Clear roundLog
2. `resolveThreat()` for each of the 2 threats
3. Clear all defenses (defended = false)
4. Collect income via `calcIncome()`
5. Clamp gold to 0
6. `round++`
7. Reset actionsLeft, mode
8. If round > 10: `finishGame()`, else `drawThreats()`

**Test API (`window.__baron`):** Full getters/setters for state, round, gold, score, actionsLeft, mode, threats, parcels. Exposed: `startGame`, `makeParcels`, `drawThreats`, `isAdjacent`, `calcIncome`, `applyAction`, `endTurn`, `resolveThreat`, `finishGame`, `addPopup`, `onTap`.

---

## Bugs Fixed This Session

None -- first run was clean.

---

## Test Architecture Notes

- 78 tests across 13 suites
- Threat tests use repeated trials (10-30 iterations) for probabilistic mechanics (drought, rustlers) to verify outcomes occur at least once
- Defended parcel tests verify immunity with 15-20 trial loops -- none should ever be damaged/hit
- `resolveThreat()` tested for all 8 threat types including `good_grazing` gold-add verification
- Full 10-round peaceful simulation confirms no console errors
- All-threat-types sweep tests all THREAT_POOL entries without error

---

## Action Items for Game 56

- Continue with Dead Eye (wind-drift shooting gallery) per queue
- The `isAdjacent()` pattern (orthogonal neighbor check for spatial expansion) is reusable for any grid-based territory system
- The "reveal threats before actions" design creates genuine planning -- keep this pattern for any turn-based game with randomized hazards
- The threat probability that increases with round number (`max(floor, base - round * step)`) is clean and reusable for any escalation system
- The `window.__baron`-style test API with getters/setters covering all game state proved effective -- 78 tests in first run, 0 failures
