# Game 03: Honky Tonk

**File:** `honky-tonk.html`
**Theme:** Concert stage, rhythm game
**New techniques:** Web Audio procedural beat, particle system, animated crowd, dynamic spotlight beams

## Key Constants
| Constant | Value | Notes |
|---|---|---|
| W / H | 360 / 640 | Same for all games |
| HIT_Y | 510 | Center of hit detection zone |
| PERFECT_DIST | 20px | ≤20px from HIT_Y |
| GOOD_DIST | 45px | ≤45px from HIT_Y |
| MISS_DIST | 60px | Note exits without hit |
| BPM | 90 | Standard country tempo |
| NOTE_W / NOTE_H | 64 / 24 | Rounded-rect note block |

## Lane Layout
| Lane | X center | Color | Keyboard |
|---|---|---|---|
| 0 | 72 | #FF6B35 orange | A |
| 1 | 180 | #FFD700 gold | S |
| 2 | 288 | #C878F0 purple | D |

## Audio Architecture
- `masterGain` node between all sounds and `AC.destination` — enables beat ducking and clean stop
- Beat scheduled with look-ahead loop: `while (nextBarTime < AC.currentTime + 1.0)` + `setTimeout(tick, 250)`
- `startBeat()` calls `cancelScheduledValues` + `setValueAtTime(1.0)` before scheduling — prevents audio gap on quick replay
- `stopBeat()` ramps masterGain to 0 over 80ms — prevents pre-scheduled note bleed into game over
- Noise buffers created fresh per hit (avoids AudioBuffer reuse issues)
- Guitar twang: sawtooth, start 5% sharp, `linearRampToValueAtTime(target, t + 0.06)`
- G3/C4/E4 = G major chord — always harmonically consonant when played together

## Musical Coherence Rules
- Notes only spawn on eighth-note grid (every EIGHTH_MS ≈ 333ms)
- Per-lane `minGapMs` prevents same-lane bursts that sound cluttered
- `maxSimul` cap per tick prevents all 3 lanes firing at once at low density
- Empty taps carry no penalty — player can tap early without punishment

## Density System
| Level | Unlock pts | prob | maxSimul | noteSpeed |
|---|---|---|---|---|
| 1 | 0 | 25% | 1 | 200 px/s |
| 2 | 300 | 40% | 2 | 240 px/s |
| 3 | 700 | 55% | 2 | 290 px/s |
| 4 | 1200 | 70% | 3 | 350 px/s |
| 5 | 2000 | 80% | 3 | 420 px/s |

## Streak → Crowd Energy
`crowdParams(streak)` returns `{amp, freqScale, sway, bright}`. Crowd bobs wider/faster at ×2, sways at ×3, heads lighten at ×4.

## Spotlight Beams
`ctx.filter='blur(3px)'` on triangular cones. Alpha: 0.04 default / 0.10 note-in-lane / 0.18 on hit.
**Critical:** reset `ctx.filter='none'` AFTER `ctx.restore()`, not inside the save block — restore() doesn't reliably undo filter in all browsers.

## Particle System
- `burst(x, y, count, color, now)` pushes to `particles[]`
- PERFECT (count=12): speed 80–180px/s, radius 3–5px
- GOOD (count=6): speed 40–80px/s, radius 2–3px
- `updateParticles` and `updateFeedbacks` in the playing update block; `drawParticles` and `drawFeedbacks` are pure render functions

## Lessons
- HTML overlay for feedback form (not canvas) — native inputs, star rating, submit all simpler
- Separate update functions from draw functions — never mutate state inside a draw call
- `ctx.filter` must be reset after `ctx.restore()` at the live context level
- `startBeat()` must cancel/reset masterGain before scheduling or quick-replay causes audio gap
- Fresh noise AudioBuffers per hit prevent subtle audio sync bugs
