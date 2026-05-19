# Retrospective: Game 59 -- Drought Rider

**Date:** 2026-05-18
**File:** `drought-rider.html`
**Tests:** 40 pass

---

## What Was Built

A narrative branching survival game set across a 7-day desert crossing from the Texas badlands to Tucson. Each day presents weather conditions and three choices with visible risk/reward probabilities. A hidden `heatExposure` variable (0-100) accumulates based on weather type and choice aggressiveness, reducing success probabilities as it grows. Players see text hints ("Heat rises off the flats," "The sun feels like a brand") but never the raw number -- they must read environmental cues to manage invisible risk.

**Resources:**
- WATER: starts at 70, drains with each choice, 0 = dead
- HORSE: starts at 100, drains on difficult terrain, 0 = fail
- HEAT EXPOSURE: hidden, accumulates from hot weather/aggressive choices, reduces all goodProb values up to -28%

**Day structure (7 fixed days):**
1. Into the Badlands (HOT, +10 heat/day)
2. The White Salt Flats (SCORCHING, +20 heat/day)
3. Distant Smoke (MILD, +4 heat/day)
4. The Rocky Pass (HOT, +10 heat/day)
5. The Dry Riverbed (HOT, +12 heat/day)
6. Abandoned Ranch (MILD, +5 heat/day)
7. The Final Stretch (OVERCAST, -3 heat/day)

**Each day has 3 choices:**
- A risky/fast choice: low resource cost OR high if bad, high heat mod
- A balanced choice: medium cost, medium heat
- A safe/slow choice: lowest cost, sometimes negative heat mod

**Probability display:** Each choice shows "XX% safe / YY% trouble" bars, dynamically adjusted by the current heat exposure level. Player can see their odds shift as they make hotter choices across days.

**Scoring:** 1000 (completion) + water*5 + horse*5 + goodChoices*80

---

## What Raised the Bar vs. Game 58

1. **First purely narrative-driven survival game in series:** All prior games require reflex, spatial reasoning, or pattern matching. Drought Rider has zero timing mechanics -- every round is a deliberate choice between weighted options. The game is entirely about risk management and decision-making under uncertainty.

2. **First hidden compounding state variable across multi-day arc:** `heatExposure` is the first game variable that: (a) the player never sees as a number, (b) compounds across all 7 days, (c) affects success probabilities on all future choices. Prior games had hidden AI state or procedural generation, but never a player-facing hidden stat that degrades their odds over time.

3. **First risk-probability display for player decisions:** Every choice shows exact adjusted probabilities (e.g., "82% safe — 18% trouble") that update in real time based on heatExposure. This lets players reason explicitly about risk tradeoffs rather than guessing. No prior game showed outcome probabilities.

---

## Technical Implementation

**State machine:**
```
title → startGame() → day_start
day_start (1.8s auto-advance) → choice
choice (tap button) → makeChoice() → outcome
outcome (animT ≥ 1.0, tap) → advanceFromOutcome() → day_start | win | lose
win/lose → startGame() → day_start
```

**calcProb():** `Math.max(0.04, baseProb - Math.min(0.28, heatExposure / 310))`
- Heat penalty scales linearly: 0 heat = no penalty, 86.8 heat = max -28%
- Even at maximum heat, minimum outcome probability is 4% (bad outcomes always possible)

**Weather system:** 4 types (MILD/HOT/SCORCHING/OVERCAST) each with a `heatBase` applied every day regardless of choice. OVERCAST reduces heat. SCORCHING accelerates heat most aggressively.

**Day 2 (Salt Flats, SCORCHING)** is the critical decision point: "Cross Now" applies heatBase(20) + heatDelta(16) = +36 heat in one turn. A player who pushes through all hot days accumulates ~70-80 heat by Day 5, shifting from 76% safe to ~51% safe on all choices.

**Probability bars in UI:** Rendered as two-tone bar (green = safe fraction, dark red = trouble fraction) with text labels, updated dynamically from `calcProb(ch.goodProb)` each frame.

**Heat hints:** 5 progressive text strings shown in top-right HUD that escalate without showing numbers:
- 0: "The air is still."
- 20: "Heat rises off the flats."
- 40: "Sweat stings your eyes."
- 60: "The sun feels like a brand."
- 80: "Heat stroke territory."

**Visual design:**
- Desert horizon with 3-layer mesa silhouettes
- Rider + horse silhouette with animated leg cycling and body bob
- Day-specific sky gradient (SCORCHING = deep orange-red, OVERCAST = cool blue-gray)
- Sun radial gradient with heat-haze glow on SCORCHING days
- Heat shimmer overlay (faint orange band at horizon) that intensifies with heatExposure above 30
- Choice card at bottom with probability bar per choice
- Outcome card animates resource bar transitions

**Audio (all synthesized, no samples):**
- `playDecision()`: soft triangle 330→220Hz on tap
- `playGood()`: C major arpeggio (C4/E4/G4)
- `playBad()`: diminished interval (A3+Eb4 falling)
- `playWin()`: G major ascending arpeggio (G4/B4/D5/G5)
- `playLose()`: sawtooth 110→55Hz slow fade

---

## Test Architecture

40 tests across 10 suites:
- Suite 1: DOM/canvas (4 tests)
- Suite 2: startGame initialization (6 tests)
- Suite 3: DAYS data structure validation (5 tests)
- Suite 4: calcProb behavior (4 tests)
- Suite 5: makeChoice state changes (6 tests)
- Suite 6: advanceFromOutcome transitions (3 tests)
- Suite 7: getHeatHint behavior (4 tests)
- Suite 8: Weather data validation (3 tests)
- Suite 9: Day 7 end conditions (2 tests)
- Suite 10: Console errors + feedback overlay (2 tests)

Key test pattern: drive game logic via `window.__run.makeChoice(idx)` + `window.__run.advanceFromOutcome()` with `animT = 2.0` to bypass tap gate.

---

## Action Items for Game 60

- Night Herd (isometric stealth defense) is next per queue
- The probability display pattern (goodProb adjusted by hidden state, shown as bar + percentage) is reusable for any hidden-information game
- The WEATHER type → heatBase system generalizes well: any environmental modifier table could drive a similar hidden accumulator
- Consider a "reveal hidden stats at game end" screen in future narrative games -- showing what heatExposure reached could be satisfying post-game context
- The `getHeatHint()` pattern (threshold table of text strings, return highest matched) is a clean pattern for any hidden meter
