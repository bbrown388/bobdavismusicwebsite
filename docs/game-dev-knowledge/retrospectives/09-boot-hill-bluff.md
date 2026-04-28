# Retrospective: Boot Hill Bluff (Game 11)

**Date:** 2026-04-28
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First turn-based game in the series** — all prior 10 games are real-time. Boot Hill Bluff is entirely driven by discrete player decisions with no time pressure on moves. The pacing shift (deal -> AI think -> player acts -> resolve) creates a completely different feel from every prior game.

- **AI bluffing system with two-dimensional behavior** — the AI has two personality profiles (Rattlesnake Roy at 35% bluff rate, Dead-Eye Dutch at 55%). Each hand the AI independently decides to bluff or play honest, then selects a tell that either matches its hand (honest) or contradicts it (bluffing). The player cannot know which they're seeing, creating genuine read-and-decide moments.

- **Four named tells with contextual hints** — hat tip, finger drum, whiskey sip, collar tug each have a name and a hint line. Confident tells (0, 2) and nervous tells (1, 3) give the player a framework for reading, but bluffing inverts the expected meaning. Over multiple hands the player can profile the AI's actual bluff frequency.

- **Narrative choice system (first in series)** — between hands 2 and 4 the game pauses for a narrative choice screen with three options: "Buy a round" (costs 15 chips, forces honest tell next hand), "Stare 'em down" (free, shows a second tell), "Check the mirror" (free, 50/50 chance to peek at AI's card). These choices add resource management outside the betting mechanic.

- **Chip conservation maintained** — pot is zeroed on every resolution path (player fold, AI fold after raise, showdown distribution). One test caught a chip-conservation bug on the first run; fixed in under 5 minutes.

- **18 test suites, all pass** — suites cover: title (1), start/antes (2), card range (3), round counter (4), phase progression (5), fold (6), call (7), raise (8), chip conservation (9), bluff flag (10), tell range (11), narrative trigger (12), narrative structure (13), chip depletion (14), AI profile (15), localStorage (16), console error sweep (17), tap-to-start (18).

- **Ambient saloon loop** — a four-note walking bass line (C2/D2/E2/Eb2) plays at ~0.45 BPM with sparse harmonic fills. Starts when the game begins, stops at game over. First game in the series with a continuous ambient track rather than only reactive SFX.

- **Distinct SFX palette** — deal (triangle arpeggio), chip (square burst), fold (sawtooth drop), reveal (triangle cascade), win hand (sine chord), lose hand (sawtooth descent), win game (ascending triangle), lose game (descending sawtooth), narrative cue (two-note triangle call). No two events share the same oscillator type and register.

---

## What Caused Friction

- **Chip conservation bug on first run** — `doShowdown()` distributed the pot but did not zero `pot`. The conservation check (`playerChips + aiChips + pot === 200`) caught it immediately. Fix: add `pot = 0` after every distribution site (fold, AI-fold-on-raise, showdown).

- **Suite 12 timing dependency** — the narrative-phase test had to wait for the result->advance timer to fire, which meant three sequential 2100ms waits inside the test. Passed reliably but is slow; future tests for multi-round state changes should inject state directly rather than waiting on timers.

---

## Bugs Caught Before Shipping

- Chip conservation: pot not zeroed after distribution in `doShowdown()`, fold path, and AI-fold-on-raise path. Caught by suite 9, fixed before commit.

---

## Action Items for Game 12

1. **Inject state in tests instead of waiting on timers** — for multi-round sequences, expose a `skipToRound(n)` test helper that fast-forwards state without real time delays. Suite 12-14 were slow because they relied on 2+ second waits per round.

2. **Tell animation persistence** — the tell animations use `Date.now()` modulo for looping. A subtle "tell lock" frame (freeze the tell animation at its most expressive point when the player enters player_turn) would make the tell easier to read.

3. **Chip breakdown on game over** — show a per-round breakdown (won/lost each hand) on the game over screen. Currently only shows final chip count and profit/loss.

4. **Dead-Eye Dutch second portrait** — both AI opponents share the same silhouette. Give Dutch a different hat (top hat) or coat color to visually differentiate who the player is facing.

---

## What Raised the Bar vs. Game 10

| Dimension | Gold Rush | Boot Hill Bluff |
|---|---|---|
| Mechanic type | Real-time resource/spatial navigation | Turn-based decision: bet, call, raise, fold |
| AI system | BFS pathfinding (player-controlled) | Bluffing AI with personality profiles and variable bluff frequency |
| Player agency | Movement + mining choices | Read tells, manage chips, make narrative choices |
| Narrative system | None | Narrative choice breaks between rounds (first in series) |
| Pacing | Continuous real-time tension | Discrete round structure with deliberate decision windows |
| Audio | Reactive SFX only | Ambient continuous loop + reactive SFX |
| Test coverage | 16 suites | 18 suites |
