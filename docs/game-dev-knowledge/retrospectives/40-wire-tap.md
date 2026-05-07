# Retrospective: Wire Tap (Game 40)

**Date:** 2026-05-07
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First temporal pattern-decoding mechanic in the series** - The core mechanic - distinguishing short tones (dot) from long tones (dash) by listening - is genuinely novel. All 39 prior games react to visual threats or spatial challenges; Wire Tap is the first where the player's ears do the primary work.

- **Pre-scheduled Web Audio timeline is the right approach** - Build a full event timeline (`buildTimeline(word)` → array of `{startT, endT, winEnd, isDash, li, ei, idx}`), schedule all oscillator nodes at `ac.currentTime + 0.4` in one pass, then use `Date.now() - pbStart` as the elapsed clock to determine which element is active. This avoids the drift that would accumulate from chaining `setTimeout` calls.

- **INPUT_GRACE window (480ms) makes mobile timing forgiving** - After each tone ends, the player has an additional 480ms to classify it. Total window for a dot is 220+480=700ms; for a dash it's 660+480=1140ms. Players can tap while listening or immediately after, whichever feels natural.

- **Two-phase round structure: decode then map** - After the last element's window closes, a 700ms `decoding` pause transitions to the map screen. This gives the player a breath between the cognitive load of decoding and the spatial task of location identification. The pause also covers any late decodeLetter() calls for unresolved letters.

- **51 tests pass on first run** - Timeline, Morse table, ROUNDS, LOCATIONS, startGame, inputs initialization, monotonic ordering, overlap checks - all passed without any fixes needed.

- **Element indicator strip** - A row of colored dot/dash pips below each letter box shows the player's classification history in real time. Correct = gold, wrong = red, missed = dark red, currently playing = bright yellow. This gives instant visual feedback without interrupting the audio.

- **Three-round escalation**: BANK (11 elements, moderate) → MINE (7 elements, easiest) → FORD (13 elements, hardest). This is not the optimal difficulty curve (easiest round second is unusual), but it gives MINE as a confidence boost mid-game before the hardest word.

---

## What Caused Friction

- **MINE in the middle breaks difficulty progression** - MINE (7 elements) is actually easier than BANK (11 elements). The intended feel is ramp-up challenge, but the natural word ordering by locationIdx placed MINE second. For future decoding games, order rounds by element count for smooth difficulty ramp: shortest word first.

- **No audio cue between letters** - There is a 700ms silence between letters (ELEM_GAP 220 + LETTER_GAP 550 = 770ms). Players may not realize a new letter has started after a letter gap, especially for single-element letters like E (.) or T (-). A subtle audio click at letter boundaries would help.

- **Map location positions need verification** - Locations are positioned relative to MAP_Y (y+130 on canvas), which keeps them within the 460px-tall map box. However, RANCH at loc.y=338 puts it at canvas y=468, close to the bottom of the map box (y=586). Visually fine but future designs should keep loc.y < 350 for safety.

---

## What Raised the Bar vs. Game 39

| Dimension | Last Rope Standing (39) | Wire Tap (40) |
|---|---|---|
| Core mechanic | Pendulum grapple physics, tap-to-latch | Audio pattern-decoding, real-time classification |
| Primary input | Spatial: aim at nearest post | Temporal: short vs. long tone duration |
| Cognitive domain | Spatial/motor (where to latch) | Auditory/temporal (is this short or long?) |
| Game structure | Survival (score by height) | 3-round decode + map identification |
| New mechanic | Constraint pendulum physics | Pre-scheduled Web Audio timeline, Morse decode loop |
| Audio role | Feedback cue (latch sound, splash) | Primary game mechanic (tone IS the input) |
| Tests | 50 | 51 |

---

## Action Items for Game 41

1. **Gold Panner is next** - Fluid simulation / particle stratification mechanic. Tilt pan to slosh water, separate gold from gravel by density.
2. **Try requestAnimationFrame-driven fluid** - Use a particle system where each particle has a density and responds to a tilt angle. Higher density = sinks faster. Frame-by-frame update of velocity and position.
3. **Left/right drag = tilt angle** - Canvas is 360px wide. Drag delta maps to tilt angle (-45° to +45°). Water surface tilts accordingly; particles accelerate toward the low end.
4. **Difficulty ramp** - Round 1: few particles, wide tolerance. Round 3: fool's gold particles that visually resemble real gold but have same density.
5. **Maintain difficulty ordering** - Shortest/simplest round first for smooth ramp; don't repeat MINE-in-middle mistake.
