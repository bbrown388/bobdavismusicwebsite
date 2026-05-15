# Retrospective: Game 54 -- Smoke Signal

**Date:** 2026-05-15
**File:** `smoke-signal.html`
**Tests:** 68 pass

---

## What Was Built

Pattern-generation puzzle set on the frontier at dusk. A distant tribe on a mesa sends a sequence of smoke signals -- short quick puffs and large slow clouds. The player watches the sequence from their campfire below, then reproduces it signal by signal by holding and releasing a blanket over their own fire. Hold duration below the round's threshold generates a PUFF; hold at or above generates a CLOUD.

**Controls:** Tap and hold anywhere on the canvas (or Space key on desktop) to start a signal. Release to send. The hold-duration gauge shows a ring filling around the campfire base -- it turns orange to indicate you've crossed into CLOUD territory. The "Hold to Signal" zone at the bottom of the canvas gives contextual hints on the next required type.

**Signal types:** Only two -- PUFF (small cluster, fast fade, soft D4 tone) and CLOUD (large billow, slow fade, deeper A3 tone). The distinction is purely hold duration.

**Hold threshold:** Varies by round: 700 / 650 / 600 / 550 / 500ms. Round 1 is generous; Round 5 requires precision under 0.5s. Threshold is displayed implicitly through the gauge arc and "Long hold = Cloud" hint text.

**Wind mechanic:** A wind timer counts down per round (11s down to 6.5s). When it fires, a 2.2s wind burst sweeps particle streaks across the screen, blows all smoke objects sideways, and plays a filtered noise whoosh. This adds visual disruption and urgency. It does not affect hold classification -- timing is always computed from real duration. The wind direction indicator (arrow + countdown arc) is always visible.

**Scoring:** +100 per correct signal, +500 for a perfect sequence. No bonus for imperfect sequences. Lives: 3 across the full game -- each wrong signal costs one. Reaching 0 lives ends the game immediately.

**5 Rounds:** Seq 3/4/4/5/5 signals, escalating thresholds and faster winds. Watch phase shows each signal with the mesa fire and animated smoke. "YOUR TURN" phase message bridges watch to replay.

---

## What Raised the Bar vs. Game 53

1. **First dual-input pattern generation mechanic in series**: All prior pattern/sequence games (Wire Tap 40, Prairie Telegraph 46) involved classification -- the player identified or selected signals. Smoke Signal makes the player physically generate each signal through hold timing. The output is not selected from a list; it emerges from physical action. This is a fundamentally different loop: performance, not recognition.

2. **First environmental interference mechanic tied to pacing, not scoring**: Wind bursts in prior games (Prairie Telegraph, Coyote Call) affected gameplay mechanics or added challenge. In Smoke Signal, wind is a pure urgency and visual pressure mechanic -- it does not change the rules, but it creates a "window is closing" sense during the watch phase and visual chaos that raises stress. The wind countdown arc shows exactly how much time remains until disruption. This is the first time a recurring environmental hazard is used purely as psychological pacing.

3. **First cross-distance communication framing**: The game's visual and narrative frame -- a player at one fire communicating with a tribe at a distant mesa -- is new to the series. It creates a spatial relationship between the player's campfire and the mesa above, with smoke puffs rising from both. This gives the watch/replay loop a natural motivation and visual symmetry absent in prior mechanic-first games.

---

## Technical Implementation

**State machine:** title -> watching -> replayPending -> replaying -> (next round or win/gameover)

**Hold classification:**
```
classifyHold(durationMs):
  cfg = ROUNDS[round - 1]
  return durationMs >= cfg.threshold ? 'cloud' : 'puff'
```
No snapping, no forgiveness window -- pure threshold.

**Hold gauge:**
```
pct = min(elapsed / cfg.threshold, 1.45) // allow slight overshoot display
endAngle = -PI/2 + pct * 2*PI
arcColor = elapsed >= threshold ? '#FF9F43' : '#FFE066' (orange when cloud, gold otherwise)
```

**Smoke object:**
Each puff is an array of blobs (4 for puff, 7 for cloud) with individual offsets and growth rates. Life decays at 0.31/s (puff) or 0.19/s (cloud). Blobs grow toward maxR at rate 0.75/s multiplier. Wind burst adds +0.32px/frame horizontal offset in windDir.

**Watch phase timing:**
```
watchTimer -= dt * 1000
if watchTimer <= 0:
  if watchIdx < targetSeq.length:
    emit smoke, play sound, advance watchIdx
    watchTimer = cfg.watchGap + (cloud ? 500 : 280)
  else:
    state = 'replayPending', transition to beginReplay after 1350ms
```

**Audio stack:**
- PUFF watch signal: sine 294Hz (D4), 0.38s
- CLOUD watch signal: sine 220Hz (A3), 0.72s
- Blanket down: highpass noise burst (>1500Hz), 0.12s, 0.12 gain
- Blanket up: bandpass noise (1200Hz), 0.18s + signal sound delayed 120ms
- Correct match: triangle 523Hz + 659Hz (C5+E5), 0.25s/0.2s
- Wrong match: sawtooth 180Hz, 0.42s
- Wind burst: low-pass noise sweep (600Hz cutoff), full burst duration
- Round clear: triangle 392+523+659Hz arpeggio (G4+C5+E5), 110ms apart
- Win: 523+659+784+1047Hz ascending arpeggio
- Game over: sine 330+294+220Hz descending

**Initialization fix:** All particle arrays and wind state must be initialized at declaration (not just in startGame) to prevent loop errors before first tap.

```javascript
let smokeObjs = [], flameParticles = [], windParticles = [], popups = [];
let state = 'title', windBurst = false, windBurstTimer = 0, windDir = 1;
```
This is the pattern for all future games that run a requestAnimationFrame loop before startGame is called.

**Test API (`window.__smoke`):** Full getters/setters for all state variables. Key exposed functions: `classifyHold`, `beginWatch`, `beginReplay`, `startHold`, `endHold`, `evaluateFullSequence`, `startRound`, `generateSequence`, `emitWatchSmoke`, `addPopup`.

---

## Bugs Fixed This Session

- **flameParticles is not iterable on load**: The `update()` function ran in the animation loop before `startGame()` was called, accessing uninitialized `flameParticles`. Fixed by initializing all arrays at declaration level (`let flameParticles = []`) rather than inside `startGame()`.
- **title screen state undefined**: `state` was declared with `let state` but not initialized. Fixed by `let state = 'title'`.
- **Best score test**: Initial test used correct-signal path (puff targeting puff) so no lives were lost. Fixed by using cloud target with puff hold (guaranteed wrong, lives drain to 0).

---

## Test Architecture Notes

- 68 tests across 13 suites
- Round config: escalation tests verify seqLen non-decreasing, threshold decreasing, windInterval decreasing
- Hold classification: direct calls to classifyHold() with controlled durations + round set to 1 or 5
- State transitions: beginWatch, beginReplay, evaluateFullSequence each tested directly
- Wind: windTimer set to 1ms and single update() tick used to verify burst trigger
- Score evaluation: perfect (+500) vs. imperfect (no bonus) tested by setting playerSeq directly
- Best score: lives set to 1, wrong-signal hold causes gameover and saveScore()
- Console error sweep: full game cycle run by setting state+sequences directly per round

---

## Action Items for Game 55

- Continue with Cattle Baron (turn-based territory strategy) per queue
- The "initialize arrays at declaration level" pattern is now mandatory -- do not declare particle arrays as `let arr;` without initializing to `[]`
- The hold-duration mechanic (threshold-based signal type) is reusable for any hold-and-release game
- The dual-location visual design (player fire lower-left, distant source upper-right) creates natural watch/replay spatial separation -- good for any call-and-response game
- The roundResultTimer overlay (show message while preparing next round) is clean and reusable
