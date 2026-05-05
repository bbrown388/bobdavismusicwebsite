# Retrospective: Dust Devil Dance (Game 34)

**Date:** 2026-05-05
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First generative music composition mechanic in the series** - All 33 prior games had a defined win/fail condition based on performance against opposition or time. Dust Devil Dance is the first where the player's only task is to compose — draw paths, listen, iterate. No enemies, no health, no bullets. The closest prior game was Honky Tonk (rhythm-matching), but even that scored performance. This is pure sandbox creation.

- **Path-drawing → looping audio pipeline works cleanly** - The fundamental loop is solid: pointerdown starts a path, pointermove extends it (8px² minimum threshold to avoid jitter), pointerup finalizes and spawns a devil if the path is long enough (80px). The devil then resamples the path to 48+ points and interpolates through it continuously at `DEVIL_SPEED = 0.19` progress/second.

- **Pentatonic scale guarantees harmonic coherence** - Assigning each devil a fixed scale degree from `[220, 261.63, 293.66, 329.63, 392.00]` Hz (A3–G4 A-minor pentatonic) means any combination of 2–5 simultaneously-running oscillators sounds musical. This is the core audio design insight: rather than random frequencies, the harmonic structure is baked into the assignment system.

- **Landmark audio modulation adds expressiveness without complexity** - Three of the four landmarks affect audio when a devil passes nearby:
  - **Mesa**: detunes the oscillator -850 cents (just below an octave) → makes the devil sound deeper/more resonant near the rock
  - **Waterhole**: ramps vibrato gain from 2.5 to 16 → heavy wobble near water
  - **Barn**: detunes up +1000 cents (sharp echo-overtone) → higher, more nasal quality near the structure
  - The `setTargetAtTime` with 0.08s time constant creates smooth transitions in/out of proximity zones, not abrupt jumps.

- **Resonance detection with cooldown is musically satisfying** - When two devils are within 90px, a harmonic chime (880 Hz sine) fires and the resonance meter increments by 8%. The 1.8s cooldown per pair prevents the chime from firing every frame, creating discrete musical events that feel intentional rather than spammy. Spark visuals at the intersection point make the resonance visible.

- **Storm visual progression builds tension throughout 60s** - The sky color interpolates from deep purple to a reddish-brown haze (`stormT / COMPOSE_TIME * 0.7`), stars fade out, and a dust wall gradient fills the screen from above. By the final 20 seconds, the visual atmosphere is unmistakably urgent.

- **25 tests across 25 suites all pass** - Coverage includes canvas dims, initial state, all constants, PENTA structure, LANDMARKS structure, startGame reset, pathLength geometry, spawnDevil short-path reject, spawnDevil valid-path accept, MAX_DEVILS limit, checkResonance meter increment, spark addition, meter clamp, updateDevil progress/position, endComposition state transition, resultType win/lose logic (0/1/2+ devils), localStorage storage, click-to-start, console error sweep, pixel color, FEEDBACK_ENDPOINT validity, resamplePath geometry.

- **One failing test fixed on first attempt** - Suite 21 (`click()` triggers composing state) failed because `element.click()` doesn't fire `pointerdown`. Fixed by adding a `click` event listener alongside the `pointerdown` handler.

---

## What Caused Friction

- **click() vs pointerdown()** - The standard test pattern (`canvas.click()`) dispatches a `click` event, not a `pointerdown`. The game used `pointerdown` as its primary input handler (necessary for mobile drag-drawing). Added a thin `click` listener for the title-tap and play-again-button cases to satisfy both test and real-use patterns.

---

## What Raised the Bar vs. Game 33

| Dimension | Cattle Auction (33) | Dust Devil Dance (34) |
|---|---|---|
| Player role | Auctioneer timing calls | Composer drawing music paths |
| Core input | Tap to call | Drag to draw paths |
| Win condition | Revenue maximization | Aesthetic composition (saved vs. silent) |
| Audio system | Chimes + sawtooth per lot result | 5 simultaneous oscillators + vibrato LFOs + landmark detuning |
| Game genre | Economic simulation | Generative music sandbox |
| Replay structure | 8 sequential lots | Open sandbox with free-form composition |
| First in series | Economic simulation | Generative music composition, aesthetic win condition |

---

## Action Items for Game 35

1. **Snake Canyon is next** - First-person maze-crawl: navigate a procedurally-tiled canyon by torch. Rattlesnake that hears footsteps; move slowly to stay safe, rush and it strikes. Audio is the primary navigation sense.
2. **Procedural level generation** - First procedurally-generated level layout in the series.
3. **Audio-spatial design** - Snake rattle volume and stereo panning reveal proximity before visibility. This will be the deepest audio-spatial design in the series.
4. **Directional movement input** - First-person canyon navigation requires a direction control (taps on left/right/forward zones, or swipe direction).
