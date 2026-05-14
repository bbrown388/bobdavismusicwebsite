# Retrospective: Game 52 -- Frontier Forge

**Date:** 2026-05-14
**File:** `frontier-forge.html`
**Tests:** 63 pass

---

## What Was Built

Blacksmith crafting simulation. Player works a piece of iron through three sequential phases to forge each of five items. Phase one: hold screen to pump bellows, heating the iron bar to a golden temperature zone displayed on a vertical gauge -- release too soon and it's cold, hold too long and it overheats. Phase two: a pendulum hammer swings back and forth above the anvil; tap when it's over the numbered strike zone for each required hit -- miss the zone and the strike doesn't count, fall below minimum temperature and the iron must go back to the forge. Phase three: plunge the iron into a water barrel, hold to fill the quench meter, and release inside the golden window to achieve the correct temper.

Five items with escalating difficulty: Horseshoe (4 strikes, wide zones), Knife Blade (5 strikes), Axe Head (6 strikes, faster pendulum), Boot Spur (6 strikes, tighter quench), Bowie Knife (7 strikes, fastest pendulum, tightest windows). Iron bar color transitions dynamically from near-black through deep red, orange, yellow-orange to near-white as temperature rises.

**Mechanics introduced:**
- Three-phase sequential crafting (heat -> strike -> quench): first multi-phase material transformation in series
- Temperature material state simulation: iron color computed from piecewise RGB interpolation across 8 temperature stops
- Pendulum hammer timing: swing arc from -0.42 to +0.42 radians, player taps at correct phase
- Strike position system: 5 zones (0-4) across the iron bar mapped to pendulum angle; each item has a prescribed recipe
- Quench window: fill meter 0-2.4s, golden zone overlaid; perfect/good/soft/brittle outcomes
- Three-tier item quality rating (MASTERWORK/QUALITY/DECENT/FLAWED) based on heat precision, strike accuracy, quench precision
- Reheat mechanic: if iron drops below COOL_TEMP=380°C during striking, player must return to heat phase
- Overheat penalty: -30 points if iron exceeds maxTemp, forces cool-down

---

## What Raised the Bar vs. Game 51

1. **First multi-phase sequential material transformation**: All prior crafting or precision games (Brand Iron, Lariat Spin, etc.) have a single skill loop per round. Frontier Forge chains three distinct mechanics that each gate the next. You cannot strike without correct heat; you cannot quench without completing strikes. This creates compound skill pressure within a single item -- a bad heat phase carries forward into the strike phase as a colder iron dropping toward the reheat threshold.

2. **First material state simulation**: Iron color computed from eight temperature breakpoints via piecewise RGB lerp -- black at 20°C through deep red, orange, yellow, to near-white at 1100°C. The iron bar is the primary game object across all three phases and its visual state directly encodes gameplay-relevant information (is it hot enough? is it cooling too fast?). No prior game uses a physical material model as its core visual feedback loop.

3. **Three-phase compound scoring**: Item quality rating synthesizes heat precision, per-strike outcomes, and quench timing into a single MASTERWORK/QUALITY/DECENT/FLAWED label. Score accumulates from all three phases per item, then five items chain. The interdependency of phases means a single mistake cascades through all three tiers.

---

## Technical Implementation

**State machine:** title -> playing (phase: heat | strike | quench | item_done) -> gameover

**Items array (5 rounds):**
```js
{ name, strikes[], heatLo, heatHi, maxTemp, riseRate, fallRate, quenchLo, quenchHi, pendSpeed }
```
pendSpeed escalates 1.8 -> 3.0 rad/s across rounds.

**Temperature dynamics:**
- `heating=true`: `temp += riseRate * dt` (75-90/s depending on item)
- `heating=false`: `temp -= fallRate * dt` (7-10/s -- slow natural cooling)
- During striking: `temp -= 28 * dt` (faster cooling from iron leaving forge)
- During quench: `temp -= 200 * dt` (rapid quench cooling)

**ironColor(temp):**
```
8 stops: [0→1200°C] × [RGB triplets]
piecewise lerp between adjacent stops
returns "rgb(r,g,b)"
```

**Pendulum system:**
- `pendAngle`: -PEND_MAX_ANGLE to +PEND_MAX_ANGLE (±0.42 rad)
- Bounces direction at limits
- `pendAngleToBarPos(a)`: maps angle linearly to 0-4
- `barPosToPendAngle(pos)`: inverse
- `barZoneX(pos)`: screen X for bar zone (barLeft + pos/4 * barWidth)
- Hit detection: `|currentPos - targetPos| < 0.45` = perfect, < 0.9 = good, else miss

**Quench:**
- `quenchTime` increments while held, clamped to MAX_QUENCH=2.4s
- Golden zone: [item.quenchLo, item.quenchHi]
- perfect: within 40% of center; good: in zone but not center; soft: below lo; brittle: above hi

**Quality rating:**
```
ratio = (perfectStrikes + goodStrikes*0.5) / total
MASTERWORK: heatResult=perfect AND quenchResult=perfect AND ratio >= 0.9
QUALITY:    heatResult != null AND (quench perfect|good) AND ratio >= 0.7
DECENT:     ratio >= 0.5
FLAWED:     else
```

**Scoring per item:**
- Perfect heat: +150 / Good heat: +80
- Per strike: perfect=+80, good=+40, miss=+0
- Perfect quench: +150 / Good quench: +80 / Soft/brittle: +20
- Overheat penalty: -30 (capped at 0)

**Audio:**
- `playBellows()`: 120ms bandpass noise burst, 200-300Hz
- `playHammer(quality)`: triangle osc with exponential pitch decay 880->440Hz; second sawtooth harmonic; pitch varies by quality
- `playMiss()`: short square wave pulse at 180Hz
- `playQuench()`: highpass noise (4000Hz+) with exponential gain fade over 1.4s
- `playWin()`: C major arpeggio [523,659,784,1047]Hz triangles
- `playPhaseChime()`: single 1047Hz sine for phase transitions

**Draw stack (heat phase):** bg (brick/stone) -> forge body -> coal glow -> iron bar -> bellows -> temp bar -> PULL button (when in zone) -> particles -> popups -> HUD
**Draw stack (strike phase):** bg -> anvil -> iron on anvil -> strike zones -> pendulum hammer -> small temp strip -> particles -> popups -> HUD
**Draw stack (quench phase):** bg -> water barrel -> iron above/in barrel -> quench fill bar -> HOLD button -> particles -> popups -> HUD
**Draw stack (item_done):** anvil -> iron -> dim overlay -> quality text -> item name -> score -> HUD

**Test API (`window.__ff`):** All state variables exposed as getters and setters. Key additions vs. prior games: `strikeFlash`, `heatResult`, `strikeResults` needed writable setters because game variables are closed-over in module scope (not on objects).

---

## Bugs Fixed This Session

- **strikeResults not writable via test API**: Getter-only in `__ff` meant `window.__ff.strikeResults = [...]` created a shadow property without modifying the closed-over variable. Fixed by adding `set strikeResults(v) { strikeResults = v; }` along with setters for `strikeFlash` and `heatResult`.
- **FEEDBACK_ENDPOINT test**: Used `querySelector('script:not([src])')` which matched the inline Google Analytics block first. Fixed to use `querySelectorAll` and check all inline scripts.
- **Strike loop in tests**: `strikeFlash` guard blocks rapid successive calls in synchronous tests. Fixed by exposing `set strikeFlash` and resetting to 0 between calls in test.

---

## Test Architecture Notes

- 63 tests across 15 suites
- Temperature: ironColor() checked at 20°C (dark), 700°C (orange), 1100°C (near-white) via RGB channel assertions
- Heat phase: onHeatTap tested for in-zone/too-cold/overheated branches; perfect/good score verified
- Strike: pendAngleToBarPos and barPosToPendAngle verified as inverses at limits; perfect/good/miss tolerance bands; strikeFlash reset in tests to allow synchronous multi-strike sequences
- Phase transitions: heat->strike verified with 700ms wait for setTimeout; strike->quench verified with strikeFlash reset; item_done->next-round and item_done->gameover both tested
- Quench: all four outcomes (perfect/good/soft/brittle) tested with direct quenchTime injection
- Quality: MASTERWORK and FLAWED extremes verified with direct state injection
- Score accumulation: multi-strike bonus verified with strikeResults setter
- localStorage best score: saves when higher, preserves when lower
- Console error sweep: both load-time and full 5-round cycle

---

## Action Items for Game 53

- Continue with Dust Bowl Derby (vehicular combat) per queue
- The three-phase chaining model is reusable: any "recipe" game (cooking, brewing, mining) can use heat/work/cool or similar
- The piecewise RGB color interpolation (ironColor) is a clean pattern for any material-state simulation
- strikeFlash guard is important for preventing double-taps but requires the test to reset it -- document in test templates
- The PULL button appears only when in zone -- good discoverable UX pattern for conditional action prompts (used in Pinkerton Trail too with HIDE)
