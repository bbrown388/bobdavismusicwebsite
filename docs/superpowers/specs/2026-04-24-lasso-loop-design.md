# Lasso Loop — Design Spec

**Project:** Bob Davis Music Website  
**Date:** 2026-04-24  
**Type:** Browser game, single HTML file, mobile-first

---

## Concept

A precision timing game. A cowboy stands at the bottom of the screen while his lasso spins continuously around him like a clock hand. Items float across the night sky on smooth curved paths. The player taps once — at exactly the right moment — to throw the lasso and rope an item. Timing is everything.

Nothing auto-catches. You decide when to throw. Miss, and you lose a life. Catch a danger item, same penalty. Chain catches together to build a streak multiplier.

---

## Visual Design

**Scene:** Night sky. Deep purple-to-black radial gradient sky. Large warm gold moon upper-right. Scattered white star dots. Mesa silhouettes on the horizon. Cactus silhouettes in the foreground. Dark ground strip at the bottom.

**Cowboy:** Illustrated silhouette (dark purple/brown tones) standing at bottom center. Simple shapes: hat, head, body, arms, legs. Shadow ellipse beneath him.

**Lasso:** A rope line extends from the cowboy's raised hand and sweeps in a continuous circle. The tip of the rope has a glowing oval loop (the catch zone) rendered with a gold stroke and subtle inner glow. The lasso rotates at a constant angular speed around the cowboy.

**Items:** Floating across the sky on smooth curved paths (sinusoidal drift, varied heights). Each item has a subtle transparent circle behind it to aid readability:
- Guitar pick — gold teardrop shape with a ♪ mark, light gold halo
- Horseshoe — emoji 🧲, light purple halo
- Cash bag — emoji 💰, light green halo
- Danger items also have a red dashed warning ring (1.5px, rgba(231,76,60,0.6))

**Feedback overlays:** On throw, a brief text popup appears near the lasso tip:
- `★ PERFECT! ★` in gold
- `GOOD` in green
- `MISS` in red (brief flash, no popup stays)

**HUD (always visible):**
- Score pill — top center, gold text on dark semi-transparent pill: `⭐ 2,450 pts`
- Lives — top left pill: `❤️❤️❤️`
- Streak — top right pill: `🔥 ×4` (hidden at ×1, shown at ×2+)
- Music toggle — bottom right pill: `🎵`

**Canvas size:** 360×640 logical pixels, scaled to fit the viewport. Mobile-first.

---

## Game Mechanic

### Lasso rotation
The lasso tip rotates continuously around the cowboy at a starting angular speed of ~1.5 rad/s (counterclockwise, starting at 12 o'clock). Speed increases every 500 pts.

### Throwing
Player taps anywhere (or presses spacebar / clicks). The lasso "locks" at its current angle for 120ms, then retracts and resumes spinning. A 0.6-second cooldown follows before the next throw is possible. During cooldown, taps are ignored.

### Hit detection
On throw: check every active item against the lasso loop center.
- **PERFECT** — item center within 20px of loop center → score × 2 × streak multiplier
- **GOOD** — item center within catch radius (36px) → score × 1 × streak multiplier
- **MISS** — no item in range → lose 1 life, reset streak to ×1

If a **danger item** (rattlesnake, cactus) is within the catch radius on throw → lose 1 life, reset streak. The item is then removed.

### Scoring
| Item | Base points |
|------|-------------|
| Guitar pick 🎸 | 50 |
| Horseshoe 🧲 | 75 |
| Cash bag 💰 | 100 |

All base points × PERFECT multiplier (2 if PERFECT, 1 if GOOD) × streak multiplier.

### Streak multiplier
| Consecutive catches | Multiplier |
|---------------------|------------|
| 0–2 | ×1 (hidden) |
| 3–5 | ×2 |
| 6–9 | ×3 |
| 10+ | ×4 |

Any miss or danger-item catch resets streak to 0.

### Lives
3 lives. Each miss or danger-item catch removes one life. At 0 lives: game over.

### Speed escalation
Every 500 pts: lasso spin speed and item drift speed each increase by 8%. No ceiling.

### Personal best
Stored in `localStorage` under key `lasso_loop_best`. Game over screen shows current score, personal best, and "NEW RECORD!" flash if beaten.

---

## Item Spawning

Items spawn off the right or left edge of the screen and drift across. Only 2–4 items should be visible at once. Spawn a new item when the count drops below 2. Distribution:
- ~35% guitar pick
- ~25% horseshoe
- ~25% cash bag
- ~15% danger items (split ~50/50 rattlesnake / cactus)

Each item travels on a path with a slight sinusoidal vertical wobble. Items that fully exit the opposite side without being caught are simply removed (no life loss for items that drift away — only misses cost a life).

---

## Controls

| Input | Action |
|-------|--------|
| Tap anywhere (mobile) | Throw lasso |
| Click anywhere (desktop) | Throw lasso |
| Spacebar | Throw lasso |

During cooldown, all of the above are ignored.

---

## Screens

**Title / Start:**  
Same night sky scene, static. Game name, "Tap to start" hint. Music toggle present.

**Gameplay:**  
Full live scene — lasso spinning, items drifting, HUD overlaid.

**Game Over:**  
Dark overlay on the scene. Score, personal best, "NEW RECORD!" (if applicable) in gold flash. "Play Again" button. Share button (navigator.share() with score text, gracefully hidden if not supported).

---

## Music

`MUSIC_SRC = ''` constant at the top of the file. When non-empty, shows an `<audio>` element with controls hidden, toggled by the HUD button. Same pattern as Game #1 "On the Road."

---

## Scope

**In:**
- Night sky scene (moon, stars, mesas, cactus silhouettes)
- Animated spinning lasso with cowboy silhouette
- 3 collectible types (guitar pick, horseshoe, cash bag)
- 2 danger types (rattlesnake, cactus) with red warning rings
- PERFECT / GOOD / MISS timing feedback overlays
- Streak multiplier (×2, ×3, ×4)
- 3 lives, speed escalation every 500 pts
- Game over screen — score, personal best, new record flash, share button
- Music toggle (placeholder embed slot)
- Tap / click / spacebar controls
- localStorage personal best

**Out:**
- Multiple lasso types or upgrades
- Lasso direction control (fixed spin only)
- Global leaderboard
- Sound effects
