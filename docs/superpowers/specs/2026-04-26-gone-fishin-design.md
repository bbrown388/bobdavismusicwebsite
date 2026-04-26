# Gone Fishin' — Design Spec

**Project:** Bob Davis Music Website  
**Date:** 2026-04-26  
**Type:** Browser game, single HTML file, mobile-first

---

## Concept

A peaceful fishing game set at a Texas lake during golden hour. Cast your line, wait for a bite, hook the fish, reel it in. 90-second timer — score as many fish as possible before time runs out.

Levels above previous games via: physics-based fishing line (bezier catenary), fish AI with sinusoidal swimming, pre-composed chord-progression audio (actual song), layered parallax water depth, water ripple particle system.

---

## Visual Design

**Canvas:** 360×640. Same responsive CSS scaling.

**Scene layers (top to bottom):**

| Layer | Y range | Contents |
|-------|---------|----------|
| Sky | 0–180 | Sunset gradient: deep purple at top → warm orange at horizon |
| Tree silhouettes | 120–220 | Dark pine/oak shapes left and right banks |
| Water surface | 220 | Animated shimmer line, ripple rings |
| Shallow water | 220–340 | `#1a3a4a` teal-blue, fish visible |
| Mid water | 340–460 | `#0f2030` deep blue |
| Deep water | 460–580 | `#080f18` near-black |
| Bottom | 580–640 | `#050a10` dark sediment |

**Fishing rod:**
- Extends from left edge (0, 200) to tip at (110, 140)
- Dark brown/black silhouette
- Line attaches at tip

**Fishing line:**
- Bezier curve from rod tip to lure position
- Droops naturally with gravity simulation
- Tension straightens line during reel

**Lure/bobber:**
- Small circle (r=6), red top / white bottom
- Floats at water surface when not sinking
- Bobs gently (sine wave) while waiting
- Dips sharply on bite

**Fish:**
- Silhouette shapes (simple oval + tail fin)
- Size varies by type (small=16px, medium=24px, large=34px, trophy=48px)
- Color: slightly lighter than background water layer they're in
- Swim left/right with sinusoidal vertical oscillation

**Particles:**
- Cast splash: 8 white particles at water entry point, radial burst
- Catch splash: 14 colored particles (fish color), larger burst
- Ripple rings: expanding circles at surface, fade out over 0.8s

---

## Fish Types

| Type | Depth zone | Speed | Points | Rarity | Width |
|------|-----------|-------|--------|--------|-------|
| Sunfish | Shallow | Fast | 50 | 40% | 16px |
| Bass | Shallow/Mid | Medium | 150 | 35% | 24px |
| Catfish | Mid/Deep | Slow | 300 | 20% | 34px |
| Trophy Bass | Deep | Very slow | 750 | 5% | 48px |

Max 6 fish active at once. New fish spawn every 4–8 seconds.

---

## Core Mechanic

### States
`title` → `casting` → `waiting` → `biting` → `reeling` → `caught` / `broke` / `escaped` → back to `casting`

### Cast Phase
- Tap and hold anywhere on canvas → power meter fills over 1.5s
- Release → lure launches in arc, splashes into water
- Cast power determines lure X position (20–320px) and depth (shallow at low power, deep at high power)
- Lure sinks to its target depth over 0.8s after splash

### Wait Phase
- Lure is in water at its depth, bobbing gently
- Fish swim past; fish within 60px of lure become "attracted" (swim toward it)
- Attracted fish commits to bite after 1–3 seconds
- Bite: bobber dips sharply + screen pulse
- Player must tap within 0.6s window to hook
- Miss → fish escapes, return to casting

### Reel Phase
- Fish hooked — tension meter appears at bottom (0–100)
- Hold anywhere to reel: tension rises ~15/s, fish gets closer
- Release to rest: tension drops ~20/s
- Fish periodically fights: tension spike +25 over 0.3s
- Tension > 90: line breaks → lose fish
- Fish reaches surface: caught!

### Caught
- Fish name + points float up
- Particles burst
- Score increments
- Return to casting immediately (fast loop)

---

## Web Audio

BPM: 90. All audio procedural.

### Background: Pre-composed fingerpick loop

Four-bar G–C–D–G chord progression. Each bar = 8 eighth notes = 2.67s. Loop = 10.67s.

Fingerpick pattern per bar: alternating bass note (beat) and upper chord tones (off-beat). Bass notes get gain 0.28, upper notes get gain 0.14, creating boom-chick feel.

| Bar | Chord | Notes (8 eighth positions) |
|-----|-------|---------------------------|
| 1 | G maj | G3, B3, D4, B3, G3, B3, D4, B3 |
| 2 | C maj | C4, E4, G4, E4, C4, E4, G4, E4 |
| 3 | D maj | D4, F#4, A4, F#4, D4, F#4, A4, F#4 |
| 4 | G maj | G3, B3, D4, B3, G3, B3, D4, B3 |

Guitar timbre: triangle oscillator, lowpass filter at 900Hz, Q=0.8. Attack 8ms, decay 320ms.

Frequencies:
- G3=196, B3=247, D4=294, G4=392
- C4=262, E4=330
- F#4=370, A4=440

### Water ambience
Two layered noise sources:
- Low rumble: white noise → lowpass at 80Hz → gain 0.06 (constant)
- Surface wash: white noise → bandpass at 400Hz, Q=0.3 → gain 0.04 (constant)

### Event sounds
- **Cast whoosh**: filtered noise sweep 800→200Hz over 0.25s
- **Splash**: noise burst, lowpass 300Hz, 0.15s
- **Nibble**: sine at 520Hz, 0.05s, soft
- **Hook**: sine at 380Hz → 280Hz, 0.12s, medium
- **Reel tick**: sine at 900Hz, 0.02s, very quiet (per 30px reeled)
- **Catch arpeggio**: G4→B4→D5→G5 quick ascending, 0.08s each
- **Line break**: square 120Hz, gain 0.15, 0.2s
- **Time warning** (last 10s): hihat pattern doubles to 8th notes

---

## HUD

- **Score** pill: top left — `🐟 1,250 pts`
- **Timer**: top right — `1:30` countdown, turns red at 10s
- **Tension bar**: bottom strip (only during reel) — color shifts green→yellow→red
- **Fish popup**: fish name + points float up from catch point, fade over 1s

---

## Screens

**Title:** Lake scene, "Gone Fishin'" in rustic serif gold, personal best, gently bobbing lure animation, "Tap to start."

**Gameplay:** Full scene, HUD overlaid.

**Game Over:** Dark overlay. Score, fish count, personal best, NEW RECORD pulse, Play Again button, feedback button.

---

## Feedback Form
Same pattern as previous games: Formspree POST to `https://formspree.io/f/xdayvnvo`, fields: game="Gone Fishin'", rating, feedback, score, fish_count.

---

## Scope

**In:**
- Physics fishing line (bezier drooping, tension straightening)
- Fish AI (sinusoidal swimming, depth zones, attraction behavior)
- Pre-composed G–C–D–G fingerpick loop (real chord tones, sounds like a song)
- 4 fish types with different depths/speeds/values
- Cast power mechanic, wait/bite/reel state machine
- Tension meter with fish fight events
- Water ripple particles + catch burst
- 90-second timer
- Personal best localStorage
- Feedback form

**Out:**
- Multiple rod types / equipment
- Inventory / progression between sessions
- Multiplayer
- Pause
