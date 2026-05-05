# Retrospective: Pony Express (Game 31)

**Date:** 2026-05-05
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First action-rhythm hybrid in the series** - Honky Tonk (Game 3) was a pure rhythm game built around musical note tapping. Pony Express is the first game where rhythm drives a physical simulation: the horse's speed, leg animation, and terrain scroll rate all respond to how well the player stays on beat. Miss beats and the horse visibly slows; chain perfects and it surges into a gallop. Rhythm and action are causally linked.

- **BPM-aligned subdivision timer** - The beat engine uses a 16th-note subdivision grid: `beatInterval = 60 / (bpm * 4)`. Each tick fires a subdivision counter that checks against a pattern array of indices (0..15). This means patterns are expressed as simple integer lists (e.g., `[0, 4, 8, 12]` for a trot) and the timing math stays exact regardless of frame rate. No drift accumulation.

- **Proximity-gated hit scoring** - Beat circles scroll left at `speed * RAIL_SPEED_BASE` px/s. When the player taps, the distance from the nearest unhit beat to `HIT_X` is divided by current rail speed to get a time error in seconds. PERFECT: < 70ms, GOOD: < 160ms. This means timing accuracy scales correctly regardless of rail speed -- the windows feel consistent even as the horse speeds up.

- **Escalating section design** - Five sections with distinct gait identities:
  - TROT (72 BPM, 4 beats): Simple downbeat, teaches the mechanic
  - CANTER (90 BPM, 6 beats): Three-beat feel, adds syncopation
  - GALLOP (110 BPM, 8 beats): Eighth-note grid, dense but regular
  - SPRINT (130 BPM, 9 beats): Irregular syncopation, first true challenge
  - FINALE (150 BPM, 11 beats): Near-continuous with gaps that require restraint

- **Speed-sync feedback loop** - `speed` (0.4..1.5) and `sync` (0..1) are separate values. `speed` controls both horse velocity and how fast beats scroll. `sync` drives the meter label (ON FIRE / STEADY / LOSING IT). A player who stays perfect maintains high speed, which makes beats arrive faster, which demands better timing -- a natural difficulty escalation that's player-driven, not timer-driven.

- **50 tests pass** - Full coverage: state machine, canvas dims, startGame resets (score/streak/sync/speed/sectionIdx), SECTIONS structure, BPM escalation, pattern range validation, HIT_X position, timing windows, BARS_PER_SECTION, beat spawn/scroll/speed-proportionality, perfect/good/early-miss/beat-miss scoring and side effects, speed/sync caps and floors, streak multiplier, bestStreak tracking, sectionScores per-section, barCount, sectionProgress, section advance, beatInterval formula, initSection clears beats, win after 5 sections, totalScore on win, canvas tap starts game, FEEDBACK_ENDPOINT, localStorage key, sync decay, beat miss handling, pixel render gold, console error sweep.

---

## What Caused Friction

- **Suite 48 pixel coordinate** - The initial pixel check at (180, 210) expected the "PONY" title text to be gold, but text anti-aliasing and sub-pixel rendering in Chromium mean the exact center pixel may not be a pure gold sample. Fixed by sampling the button area at (180, 448) which is a solid `#FFE066` fill rectangle -- much more reliable.

---

## What Raised the Bar vs. Game 30

| Dimension | Tumbleweed Pinball (30) | Pony Express (31) |
|---|---|---|
| Genre | Physics simulation | Action-rhythm hybrid |
| Player input | Dual-region hold state | Tap timing precision |
| Difficulty curve | Implicit (ball physics) | Explicit (5 escalating BPM sections) |
| Audio role | Reactive (sounds on events) | Structural (beat cue grid drives gameplay) |
| Progression | Score via chain/bonus | Speed feedback loop + 5-section arc |
| Pattern system | None | Procedural 16th-note grid with 5 distinct gaits |

---

## Action Items for Game 32

1. **Barbed Wire is next** - Strategic wire-laying tower defense: stretch barbed wire between fence posts to slow and redirect rustlers heading for the herd.
2. **First tower-defense structure** - No prior game in the series uses defensive placement as the core mechanic. Raise the bar on strategic depth.
3. **Wire/graph edge mechanic** - Posts are nodes; wire segments are edges. Players tap two adjacent posts to connect them. Wire capacity per post limits branching.
4. **Wave escalation** - 5 waves of rustlers with increasing speed and number. Some rustlers cut wire over time, requiring repair.
