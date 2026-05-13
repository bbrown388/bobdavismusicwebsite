# Retrospective: Game 50 -- Tin Pan Alley

**Date:** 2026-05-13
**File:** `tin-pan-alley.html`
**Tests:** 47 pass

---

## What Was Built

Musical phrase-memory puzzle. A saloon piano plays a melody (preview phase), then replays it with blank gaps where some notes have been removed. Player must tap the correct piano key for each blank before the timer runs out. Five rounds escalate phrase length (4 to 8 notes), blank count (1 to 3), tempo (72 to 108 BPM), and time limit per blank (4s down to 2s).

**Mechanics introduced:**
- Melody-completion: hear the full phrase, then fill missing notes from memory
- Piano keyboard UI: 7 white keys (C-D-E-F-G-A-B) + 5 black keys rendered on canvas, touch/click mapped back to note names
- Note-to-pitch visual display: simplified piano-roll style with notes positioned at heights proportional to pitch, overlaid on a 5-line staff
- Dual-phase per round: PREVIEW (listen and memorize) -> CHALLENGE (fill blanks in real time)
- Speed bonus: faster answers yield more points (50-100 pts per correct blank)
- Hearts system: 3 lives per round, lost on wrong tap or timeout
- Key flash highlight during preview: shows which physical key corresponds to each note as melody plays

---

## What Raised the Bar vs. Game 49

1. **First melody-completion mechanic**: Player constructs music rather than reacting to it. Distinct from Pony Express (hit beats on rhythm grid) and Coyote Call (drag slider to match pitch). Memory + musical identification is a new skill axis.
2. **First piano keyboard UI in series**: Full chromatic layout (7 white + 5 black keys) rendered on canvas with touch hit detection. Black keys use front-of-stack detection to correctly intercept taps before white key fallback. A genuine instrument interface on a game canvas.

---

## Technical Implementation

**State machine:** title -> preview -> challenge -> phrase_done -> (next round or gameover)

**Preview playback:**
- `advancePreview()` fires on `noteTimer` countdown each frame
- Plays each note via `playPianoNote()`, flashes key with `keyHighlight = { note, t }`
- Sets `previewDone = true` when noteIndex reaches phrase.length (checked both at start and after increment)
- After all notes played, 1.2s pause then `startChallenge()`

**Challenge playback:**
- `advanceChallengeNote()` called on noteTimer countdown
- Known notes play and advance noteIndex; blanks stop the timer and wait for input
- `handleTap()` called with canvas-scaled coordinates; `noteAtPoint()` checks black keys first (z-order) then white keys
- Correct: +100 + speedBonus (proportional to inputTimer/timeLimit), blankAnswers[i] = 'correct', advance
- Wrong or timeout: -1 heart, -30 roundScore (floored at 0), blankAnswers[i] = 'wrong', advance

**Piano keyboard geometry:**
- 7 white keys: KEY_W = floor(360/7) = 51px, KEY_H = 175px, starting at y = H - KEY_H - 10
- 5 black keys: BK_W = round(KEY_W * 0.6) = 31px, BK_H = round(KEY_H * 0.6) = 105px
- `keyRect(noteName)` returns bounding rect; `noteAtPoint(px, py)` does black-first hit detection

**Piano synth:**
- Three stacked oscillators: triangle at freq, sine at 2x, sine at 3x
- ADSR envelope: attack 12ms, decay to 0.10 by 180ms, exponential release to 0.001 by duration
- Blend: 0.7/0.2/0.08 mix for realistic piano timbre

**Audio:**
- `playPianoNote(freq, dur)`: piano timbre via 3-oscillator additive synthesis
- `playWrong()`: sawtooth 140Hz burst, 350ms
- `playSuccess()`: C major arpeggio at end of phrase
- `playComplete()`: 4-note ascending chord at game end

**Note display:**
- 5-line staff drawn with semi-transparent gold lines
- Notes: filled gold ellipses at heights proportional to pitch (C=bottom, B=top of area)
- Blanks: outlined ellipses, animate with pulsing alpha when active; arc timer overlay shows remaining time
- Completed blanks: green (correct) or red (wrong) with correct note letter shown

**Test API fixes needed:**
- Added setters for `noteIndex`, `blankIndex`, `roundNum` alongside getters
- `advancePreview` sets `previewDone` in two places: at function entry (when called again after completion) and immediately after noteIndex reaches phrase.length

---

## Bugs Fixed This Session

1. **advancePreview only set previewDone on the N+1th call** -- After playing the last note, noteIndex incremented to phrase.length. previewDone was only checked at function entry, so one extra call was needed. Fixed by also checking `if (noteIndex >= phrase.length)` after the increment block.

2. **Test API setters missing for noteIndex, blankIndex, roundNum** -- Without setters, test assignments like `window.__tpa.noteIndex = 3` created a new own property on the API object without writing the internal variable. Added setters for all three.

---

## Test Architecture Notes

- 47 tests, all pass
- Timeout simulation: the loop's inputTimer path is structurally tested via wrong-tap proxy (same heart-deduction code path). Full async loop testing left to manual play.
- Speed bonus test: two `startGame` + `startRound` calls in one `page.evaluate` with different `inputTimer` values confirm proportional scoring.

---

## Action Items for Game 51

- Continue with Pinkerton Trail (stealth pursuit) per queue
- Melody-completion concept is strong -- could revisit with longer phrases and a "call and response" mode
- Key flash during preview is very effective for teaching -- worth reusing when teaching patterns in other games
- Consider adding a "replay" counter (N replays allowed) rather than unlimited LISTEN -- adds pressure and skill ceiling
