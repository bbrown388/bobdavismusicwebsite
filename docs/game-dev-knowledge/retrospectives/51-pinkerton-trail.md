# Retrospective: Game 51 -- Pinkerton Trail

**Date:** 2026-05-14
**File:** `pinkerton-trail.html`
**Tests:** 47 pass

---

## What Was Built

Stealth pursuit game. Player is a Pinkerton detective tailing a suspect through a scrolling frontier town. Follow close enough to collect scattered evidence without being spotted. The suspect periodically glances back -- a warning pulse fires first, then a vision cone sweeps backward. Hide behind cover objects (barrels, wagons, crates) to avoid detection. Suspicion meter drains when hidden or out of cone; fills when visible during glance. Reach the destination with enough evidence to complete each of five escalating rounds.

**Mechanics introduced:**
- Stealth pursuit (follower model, not escapee): player maintains optimal distance behind NPC
- Vision cone look-back: suspect's field of view sweeps behind them at timed intervals with a warning phase before the cone fully activates
- Dynamic suspicion meter: fills when visible during glance, drains when hiding or phase is walking
- Proximity detection: being too close to suspect raises suspicion even when not glancing (suspect hears footsteps)
- Cover system: HIDE button appears when within range of barrel/wagon/crates; player goes semi-transparent
- Evidence collection: envelope items auto-collected on proximity while moving
- Lost-trail fail: falling more than 420px behind the suspect triggers fail if evidence not yet gathered
- Destination-arrival win/fail: suspect reaching safe house triggers win or fail based on evidence collected

---

## What Raised the Bar vs. Game 50

1. **First pursuit-based stealth**: Every prior stealth game (Jail Break, Moonshine Run, Gallows Road) has the player as the escapee holding ground or avoiding a patrol. Pinkerton Trail flips the model -- player must actively follow the NPC while staying hidden. Creates a tension between being close (to collect evidence) and being safe (to avoid detection). New skill axis.
2. **First dynamic NPC awareness system**: Suspect transitions through phases (walking -> warning -> glancing -> resuming) with probabilistic glance intervals and durations. Warning phase gives player a brief window to hide before the cone activates. This is more sophisticated than simple on/off detection cones in prior games.
3. **First scrolling world with parallax layers**: 2350px world, three-layer parallax (sky/stars, far buildings at 0.38x, near silhouette at 0.65x). All prior side-scrollers used simpler backgrounds. Seven cover objects and multiple evidence items distributed across the world map.

---

## Technical Implementation

**State machine:** title -> round_intro (1.6s) -> playing -> (roundResult overlay 2.6s) -> round_intro or gameover

**World layout:**
- `DEST_X = 2350` world pixels total
- 7 cover objects: barrel/wagon/crates types, spaced across first 2000px with slight escalation
- Evidence items: 4-6 per round, distributed evenly across 320..2020px span
- `cameraX = playerWorldX - PLAYER_SX(88)` keeps player at fixed screen position

**Suspect AI phases:**
- `walking` / `resuming`: moves at `cfg.speed` px/frame (0.50 to 1.10 across rounds), decrements glanceTimer
- `warning`: slows to 25% speed, fires warning audio, runs 820ms before activating glance
- `glancing`: coneOpacity=1, raises suspicion if isVisible(), runs for `cfg.gd` ms (1350-1800ms)
- Random jitter on next glance interval: cfg.gi +/- 300ms

**isVisible():**
```
if (playerHiding) return false
gap = suspectWorldX - playerWorldX
if (gap < 0 || gap > CONE_DIST=255) return false
return true
```

**Suspicion mechanics:**
- Rises during glancing phase when visible: `cfg.sr * dt/1000` (52-96 per second)
- Extra penalty when gap < CLOSE_DIST=55px (suspect hears footsteps): +40/s during glance, +20/s always
- Drains at 7/s when not glancing or when hiding

**Player movement:**
- Hold to move: pointerdown sets playerMoving=true, pointerup clears
- Player speed = suspectSpeed * 1.38 (always able to catch up)
- Can't overtake suspect: playerWorldX clamped to suspectWorldX - CLOSE_DIST

**Audio:**
- `playFootstep(who)`: 80ms bandpass noise burst, 130Hz player / 150Hz suspect
- `playHeartbeat(intensity)`: two-thump sine blips at 58/52Hz, volume proportional to suspicion
- `playGlanceWarning()`: descending triangle 220->185Hz with decay
- `playBusted()`: descending sawtooth arpeggio 220->165->110Hz
- `playCollect()`: ascending sine arpeggio 880->1174->1319Hz
- `playWin()`: C major arpeggio [523, 659, 784, 1047]Hz

**Draw stack:** sky -> buildings (parallax) -> ground (with boardwalk plank hints) -> lanterns (flickering radial gradients) -> destination building -> cover objects -> evidence envelopes -> suspect (with vision cone) -> player -> HUD -> popups -> round result overlay

**Test API (`window.__pt`):** Exposes getters/setters for all critical state plus core functions (startGame, startRound, buildRound, update, isVisible, nearestCoverIdx, toggleHide, endRound). All state exposed for direct manipulation in tests.

---

## Bugs Fixed This Session

None -- clean implementation, all 47 tests passed on first run.

---

## Test Architecture Notes

- 47 tests across 15 suites
- Core stealth mechanics tested directly: isVisible with all edge cases (hiding, behind suspect, too far, in cone)
- Suspicion rise/drain: update() called with controlled state to verify delta direction
- Win/lose conditions: destination arrival tested with evidence < need (fail) and >= need (win)
- Lost trail: gap > 420 with insufficient evidence triggers fail
- Round progression: resultTimer exhausted via loop to verify gameover transition
- localStorage: best score verified after gameover

---

## Action Items for Game 52

- Continue with Frontier Forge (blacksmith crafting) per queue
- Pinkerton Trail's pursuit model could be revisited with: multiple suspects to tail simultaneously, or a mode where the suspect runs when spotted
- The warning phase before glance is effective tension-builder -- reuse in any future NPC-awareness system
- Cover proximity highlight (dashed gold outline + HIDE label) is a good discoverable UI pattern for action prompts
- Heartbeat audio scaling with suspicion creates effective anxiety curve -- reusable in any tension-based game
