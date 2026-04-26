# Honky Tonk — Design Spec

**Project:** Bob Davis Music Website  
**Date:** 2026-04-26  
**Type:** Browser game, single HTML file, mobile-first

---

## Concept

A rhythm game set on a concert stage. Colored note blocks fall down three lanes toward a glowing hit zone. The player taps the correct lane at the right moment. A procedural country beat plays through Web Audio — every note you hit adds to the music. Miss too many and the crowd turns on you.

Levels above previous games via: Web Audio (first time), particle system (first time), animated crowd (first time), dynamic spotlight lighting (first time).

---

## Visual Design

**Canvas:** 360×640. Same responsive CSS scaling as previous games.

**Stage layout (top to bottom):**

| Zone | Y range | Contents |
|------|---------|----------|
| Lighting rig | 0–50 | Spotlight origins, ceiling structure |
| Crowd | 50–110 | Animated silhouette heads |
| Sky / falling zone | 110–490 | Notes fall through here |
| Hit zone | 490–540 | Glowing bar + 3 lane buttons |
| Stage floor | 540–640 | Dark wood planks, HUD |

**Lane positions (3 lanes):**

| Lane | Center X | Color | Key |
|------|----------|-------|-----|
| 0 (left) | 72 | `#FF6B35` orange | A |
| 1 (center) | 180 | `#FFD700` gold | S |
| 2 (right) | 288 | `#C878F0` purple | D |

**Background:**
- Stage rear wall: very dark (`#0d0608`), slight warm tint
- Three vertical lane guides: subtle dark stripes, barely visible

**Spotlight beams:**
- Soft triangular cones from ceiling to hit zone, one per lane
- Lane color at very low opacity (0.04 default, 0.10 when note in lane, 0.18 on hit)
- Rendered with `ctx.filter = 'blur(3px)'` for soft glow edge

**Crowd:**
- 18 silhouette heads across y=65–100, varying sizes (r=7–12)
- Color: `#1a0514` (slightly lighter than pure black — visible but not prominent)
- Each bobs: `y = baseY + sin(time * bobFreq + offset) * bobAmp`
- Default bobAmp: 3px, bobFreq: 1.2 rad/s
- At streak ×2: bobAmp=7, bobFreq=1.8
- At streak ×3: bobAmp=12, sideways sway added
- At streak ×4: bobAmp=18, sway aggressive, heads slightly brighter

**Notes:**
- Rounded rectangle, 64px wide × 24px tall
- Filled with lane color, slight inner glow stroke in white at 0.3 opacity
- When about to enter hit zone (within 40px): slight brightness boost

**Hit zone:**
- Horizontal glowing bar at y=510: 2px line in white, blur glow behind it
- Three lane "buttons" below the bar (y=520–545): rounded rects, 70px wide, 22px tall
- Button colors at 0.3 opacity normally, flash to full opacity on tap

**Stage floor:**
- Dark wood plank texture: repeating horizontal lines (`#1a0a06`, `#120804`)
- Spans y=545–640

---

## Core Mechanic

### Note spawning
Notes are generated on a beat grid at 90 BPM (beat interval = 667ms). At each beat subdivision (eighth notes = 333ms), each lane has a probability of spawning a note based on the current density level.

| Density level | Trigger | Spawn probability per lane per beat |
|---|---|---|
| 1 | Start | 25% |
| 2 | 300 pts | 40% |
| 3 | 700 pts | 55% |
| 4 | 1200 pts | 70% |
| 5 | 2000 pts | 80% |

Maximum 2 simultaneous notes across all lanes at low density; all 3 simultaneously possible at high density.

### Note physics
Notes spawn at y=110 and fall at `noteSpeed` px/s (starts at 200px/s, increases with density level). Fall is purely linear — no easing.

### Hit detection
When the player taps a lane (or presses the key), find the note in that lane whose center y is closest to HIT_Y (510). If that distance is:
- ≤ PERFECT_DIST (20px): **PERFECT** — 2× points, gold burst, play guitar tone
- ≤ GOOD_DIST (45px): **GOOD** — 1× points, small burst, play guitar tone
- Otherwise: empty tap, no life lost, no feedback (tapping early/wrong is forgiving)

Notes that fall below HIT_Y + MISS_DIST (60px) without being hit are **MISS**:
- Lose 1 life
- Reset streak to 0
- Screen shake (4px, 200ms)
- Red flash on the missed lane

### Scoring

All notes are worth 100 base points, modified by:
- `PERFECT`: × 2
- Streak multiplier: × 1 / 2 / 3 / 4

**Streak multiplier thresholds:**
| Consecutive hits | Multiplier |
|---|---|
| 0–7 | ×1 |
| 8–15 | ×2 |
| 16–23 | ×3 |
| 24+ | ×4 |

### Lives
3 lives (shown as 🎸 icons). Each MISS costs 1 life. 0 lives = game over.

---

## Web Audio

All audio is procedural — no audio files.

```
const AC = new (window.AudioContext || window.webkitAudioContext)();
```

Resume on first user gesture. If `AC.state === 'suspended'`, call `AC.resume()` on first tap.

### Background beat (90 BPM loop)
Scheduled ahead using `AC.currentTime`. Loop indefinitely while `state === 'playing'`.

| Element | Beats | Sound |
|---------|-------|-------|
| Kick drum | 1, 3 | Sine osc at 55Hz, gain 0→0.8→0 over 0.15s |
| Snare | 2, 4 | White noise + bandpass at 250Hz, gain 0→0.4→0 over 0.1s |
| Hi-hat | Every 8th note | Oscillator at 800Hz, gain 0→0.15→0 over 0.04s |

### Guitar tones (per lane, on successful hit)
Sawtooth oscillator with pitch bend (starts slightly sharp for twang effect):

| Lane | Target freq | Start freq (sharp by 5%) |
|------|-------------|--------------------------|
| 0 (orange) | 196 Hz (G3) | 206 Hz |
| 1 (gold) | 262 Hz (C4) | 275 Hz |
| 2 (purple) | 330 Hz (E4) | 347 Hz |

Envelope: gain 0 → 0.4 (attack 5ms) → 0 (decay 280ms). Frequency ramps from start to target over 60ms.

### MISS sound
Short low buzz: oscillator at 100Hz, square wave, gain 0→0.2→0 over 80ms.

### Beat mute on miss
When a life is lost, lower the beat's master gain to 0.4 for 0.5s, then restore to 1.0. Gives an audible "uh oh" dip.

---

## Particle System

### On PERFECT hit
12 particles burst from hit zone in the struck lane:
- Color: lane color
- Speed: 80–180px/s radially outward
- Life: 0.6s, fade out linearly
- Radius: 3–5px, shrinks with life

### On GOOD hit
6 particles, same parameters but speed 40–80px/s, radius 2–3px.

### On MISS
No particles. Red flash on the missed lane button (opacity pulse over 200ms).

---

## Screen Effects

### Screen shake
Applied by translating the canvas context before drawing:
```javascript
if (now < shakeUntil) {
  ctx.translate((Math.random()-0.5)*shakeIntensity*2, (Math.random()-0.5)*shakeIntensity*2);
}
```
Triggered by: miss (4px, 200ms). Streak ×4 unlock (6px, 300ms flash).

### Streak milestone flash
At ×2, ×3, ×4: brief canvas overlay in the dominant lane's color at 0.08 opacity for 150ms.

---

## Feedback Form (in-app)

### Trigger
"Tell Us What You Think 🤠" button on game-over screen. Renders as a styled HTML overlay (not canvas) positioned absolutely over the canvas element.

### Form design
Dark semi-transparent overlay (`rgba(10,4,8,0.96)`), rounded border in gold, matches game aesthetic.

Fields:
- **Star rating:** 5 gold star spans, tap to select 1–5
- **Feedback:** `<textarea>` — "What worked? What could be better?" (3 rows)
- Auto-filled hidden fields: `game = "Honky Tonk"`, `score`, `lives_remaining`
- **Submit** button (gold) / **Cancel** (text link)

### Submission
```javascript
const FEEDBACK_ENDPOINT = 'https://formspree.io/f/xdayvnvo';
fetch(FEEDBACK_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ game, rating, feedback, score, lives_remaining })
});
```
On success: show "Thanks! 🤠" for 1.5s, hide overlay.
On error: show "Couldn't send — try again." with retry button.

---

## Controls

| Input | Action |
|-------|--------|
| Tap left third of screen | Hit lane 0 |
| Tap center third | Hit lane 1 |
| Tap right third | Hit lane 2 |
| A key | Hit lane 0 |
| S key | Hit lane 1 |
| D key | Hit lane 2 |

---

## Screens

**Title:** Stage scene static, spotlight beams gently pulsing. "Honky Tonk" in serif gold. "Tap to start." Personal best if > 0.

**Gameplay:** Full live scene — notes falling, crowd bobbing, beat playing, HUD overlaid.

**Game Over:** Dark overlay. Score, best, NEW RECORD pulse. "Play Again" button. "Tell Us What You Think 🤠" feedback button.

---

## HUD

- Score: top center pill `⭐ 1,250 pts`
- Lives: top left `🎸🎸🎸` (guitar picks, lose one per miss)
- Streak: top right `🔥 ×3` (hidden at ×1)
- Music toggle: bottom right (toggles beat on/off)

---

## Music (Bob Davis embed slot)
`const MUSIC_SRC = ''` at top of file — same pattern as previous games. When set, plays on toggle alongside the beat (or replaces the beat TBD).

---

## Scope

**In:**
- Concert stage with 3 spotlight beams, animated crowd
- Web Audio procedural beat (90 BPM) + guitar tones per lane
- 3-lane falling note system with PERFECT/GOOD/MISS
- Particle bursts on hits, screen shake on miss
- Streak multiplier ×2/×3/×4 with crowd energy escalation
- 3 lives (guitar picks), speed/density escalation
- In-app feedback form (Formspree)
- Personal best localStorage
- Game over screen with share + feedback buttons

**Out:**
- Hold notes
- Multiple songs / track selection
- Pause button
- Global leaderboard
- Tutorial overlay
