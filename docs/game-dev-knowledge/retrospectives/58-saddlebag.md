# Retrospective: Game 58 -- Saddlebag

**Date:** 2026-05-18
**File:** `saddlebag.html`
**Tests:** 60 pass

---

## What Was Built

Spatial packing puzzle set before the wagon leaves. Each round presents a set of frontier gear items in Tetromino-style shapes (L, T, I, S, Z, J, O pieces) that must be fitted into a 6x8 saddlebag grid before a countdown timer expires. Player selects a piece from a tray on the left, rotates it (by tapping the selected item again or pressing ROTATE button), then taps the grid to place it. Pieces anchor with their top-left at the tapped cell, clamped to keep the piece in bounds. Placed items can be unplaced by tapping them on the grid. Five rounds with increasing item count and shorter timers.

**Item shapes with Western names:**
- I3 (3 cells): Rope Coil
- L3 (3 cells): Horseshoe
- S3/J3 (3 cells): Boot Spur / Spur
- I4 (4 cells): Rifle
- L4/J4 (4 cells): Lantern / Canteen
- T4 (4 cells): Tin Star ($180, most valuable)
- S4/Z4 (4 cells): Stirrups / Saddle Horn
- O4 (2x2 square): Bedroll ($200, densest value)

**Round progression:**
- Round 1: 4 small 3-cell shapes, 45s timer
- Round 2: 4 standard tetrominoes, 42s
- Round 3: 5 tetrominoes, 38s
- Round 4: 6 tetrominoes, 33s
- Round 5: 7 tetrominoes, 28s

**Scoring:**
- Placed item values (sum of gear gold values)
- Time bonus: floor(remaining seconds) × 5
- Pack bonus: +$300 for placing all items in a round
- Accumulated across 5 rounds

**Controls:**
- Tap item in tray → select it
- Tap selected item again OR tap ROTATE button → rotate 90° CW
- Tap grid → place selected item (clamped anchor)
- Tap occupied grid cell → unplace that item back to tray
- Touch + drag on grid → ghost preview follows finger; release to commit

---

## What Raised the Bar vs. Game 57

1. **First spatial rotation-and-placement mechanic in series:** All prior puzzle games used grid overlays, path drawing, or pattern matching. Saddlebag introduces a genuine Tetromino-style spatial reasoning challenge: player must visualize piece orientation, plan rotation, and find valid positions in a grid while managing value optimization trade-offs. No prior game required multi-step spatial transformation of a game object.

2. **First inventory optimization challenge:** The player isn't just playing fast or accurately — they must choose WHICH pieces to prioritize when time runs short. The $200 Bedroll (2×2 dense) often outvalues fitting in a $120 Rifle (4×1 long) that doesn't pack well. First economic optimization layer tied to spatial reasoning.

3. **First drag-to-preview ghost system:** The game implements a two-phase touch interaction: `touchstart` on grid with selected item shows a semi-transparent ghost preview that follows the finger, snapping to valid/invalid positions; `touchend` commits the placement. Prior games used tap-to-act without previewing the outcome. This is meaningfully more polished interaction design.

---

## Technical Implementation

**Grid state:** `grid[row][col]` = itemIdx (0-based) or null. 8 rows × 6 columns = 48 cells. Fixed across all rounds.

**Rotation:** `rotateCW(cells)` applies the standard Tetromino CW rotation: `[r,c] → [c, maxR-r]`, then normalize to origin. 4 rotations return to original shape (verified by test).

**Anchor clamping:** `getAnchor(cells, tapRow, tapCol)` computes `r0 = clamp(tapRow, 0, ROWS-1-maxDR)`, same for col. This ensures tapping near grid edge doesn't bounce back an error — piece is silently shifted to stay in bounds.

**Ghost preview system:**
- `touchstart` on grid with selected item → compute initial ghost, set `ghostOnGrid=true`
- `touchmove` → update ghost position via `updateGhost()`
- `touchend` with valid ghost → `commitGhost()` places the item
- Desktop hover: `mousemove` without drag also shows hover ghost via `updateGhost()`

**Item tray layout:** `getCardH()` = min(80, floor(470 / itemCount)). Scales dynamically: 4 items → 80px cards, 7 items → 67px cards. Shape preview cell size scales with card height.

**Audio design:**
- `playSelect()`: triangle wave 660→440Hz decay — soft pluck
- `playRotate()`: sine 320→640Hz fast up-sweep — "whoosh"
- `playPlace()`: bandpass noise burst + 120Hz resonant sine — satisfying "thunk"
- `playUnplace()`: triangle 440→260Hz decay — reversed pluck
- `playBeep(80Hz)`: periodic timer warning in last 10 seconds
- `playRoundEnd()`: C-major arpeggio (523/659/784/1047Hz)
- `playGameOver()`: similar ascending triad, slightly louder

**Canvas layout:**
- HUD strip: y=0..88 (title, round, live score, packed count, timer bar, departure text)
- Tray (left): x=4..152, y=90..558
- ROTATE button: x=4..152, y=566..602
- Grid (right): x=158..350, y=92..348 (6×32=192px wide, 8×32=256px tall)
- Saddlebag leather aesthetic: dark brown gradient, gold dotted stitching border, semi-transparent "SADDLEBAG" watermark

**State machine:**
```
'title' → startGame() → 'playing'
'playing' → endRound() → 'roundEnd'
'roundEnd' → nextRound() → 'playing' (rounds 1-4) or 'gameover' (round 5)
'gameover' → startGame() → 'playing'
```

**Test API (`window.__run`):** Exposes state, round, grid, items, selectedItem, timer, totalScore, roundScore, ghost, popups, best; COLS, ROWS, CS, GX, GY, ITEM_DEFS, ITEM_COLORS, ROUND_CONFIG; startGame, startRound, endRound, nextRound, rotateCW, canPlace, getAnchor, doPlace, doUnplace, cellBounds, handleTap, addPopup, update, getCardH, getGridCell, getTrayIdx.

---

## Test Architecture Notes

- 60 tests across 10 suites
- Rotation tests verify I4 horizontal → vertical, O4 stability, 4× identity property
- Placement tests cover: out-of-bounds right, out-of-bounds bottom, occupied cell, anchor clamping
- State machine tests drive 5 full rounds via `endRound()`/`nextRound()` calls
- Input tests tap calculated pixel coordinates: grid cell (r,c) = (GX + c*CS + CS/2, GY + r*CS + CS/2)
- Pack bonus test places all round-1 items in sequence (stacked rows) and verifies +300

---

## Action Items for Game 59

- Drought Rider (narrative survival) is next per queue
- The ghost preview pattern (touchstart/touchmove/touchend state machine) is reusable for any drag-to-place mechanic
- Item color palette from Saddlebag (ITEM_COLORS) works well for distinguishing 7+ simultaneous game objects
- The `getCardH()` scaling tray pattern can be reused for any variable-length vertical list in the HUD
- Consider carrying the "pack bonus for 100% completion" concept into future resource-management games
