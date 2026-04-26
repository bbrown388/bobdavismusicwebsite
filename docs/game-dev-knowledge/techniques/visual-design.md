# Visual Design System

## Proven Color Palette
| Role | Hex | Notes |
|------|-----|-------|
| Night sky center | `#1a0d35` | Deep purple |
| Night sky edge | `#050208` | Near-black |
| Gold / score / moon | `#FFE066`, `#FFD700` | Warm gold, never cold yellow |
| Moon warm | `#F4C842` | Edge of moon disk |
| Earth / rope | `#C8A04A`, `#D4A84B` | Tan/gold |
| Danger | `#E74C3C` | Warning rings, MISS feedback |
| Streak / bonus | `#FF9F43` | Warm orange |
| Success | `#4CAF50` | GOOD feedback |
| Silhouette dark | `#1a0520` | Darkest purple-black for characters |
| Silhouette mid | `#2a0f30` | Slightly lighter for body shading |
| Ground dark | `#0a0318`, `#050210` | Ground fill + cactus silhouettes |
| Mesa | `#0d0520` | Mountain silhouettes |
| UI cream | `#E8DCC8` | Light text on dark overlays |
| UI mid | `#A09070` | Subtitle / secondary text |
| UI brown | `#907860` | Tertiary / "best score" text |

## Typography
- **Game titles:** `bold 42-52px serif` in `#FFE066`
- **Score / HUD numbers:** `bold 13px sans-serif` in gold/white
- **Instructions / subtitles:** `17px Georgia, serif` in `#A09070`
- **Feedback popups:** `bold 16px sans-serif` in matching color
- **Body text (game over):** `15px sans-serif` in `#907860`

## Z-Order (draw order, back to front)
1. Sky gradient
2. Stars, moon, atmospheric effects
3. Far background (mesas, mountains)
4. Mid ground (cactus silhouettes, fences)
5. Ground strip
6. Game items / collectibles
7. Player character
8. Player effects (lasso rope, particle trails)
9. Particle bursts, feedback text
10. HUD pills
11. Full-screen overlays (title, game over)

## Character Style
- Pure silhouettes: no outlines, no detail lines, just shape fills
- Dark purple tones (`#1a0520`, `#2a0f30`) — slightly lighter than the pure black sky
- Ground shadow: `rgba(0,0,0,0.3)` ellipse under character feet
- Use `roundRect` for body parts, `ellipse` for heads
- Hat always has brim + crown as separate rectangles

## Scene Composition (360×640 canvas)
- **Sky area:** y=0 to y=420 (65% of height)
- **Ground line:** y=420 (hard edge, from mesa polygon bases)
- **Ground:** y=420 to y=640
- **Moon placement:** upper-right, typically around (280, 65) with radius 38
- **Cactus silhouettes:** at x≈25 and x≈330, base at y≈380-425
- **Character standing position:** feet at y=420 (ground line)
- **Sky items:** drift between y=150 and y=350 (well above ground)

## Overlay Pattern (game over / pause)
```javascript
ctx.fillStyle = 'rgba(5,2,8,0.78)';
ctx.fillRect(0, 0, W, H);
```
Dark enough to read text, keeps scene visible underneath.

## "NEW RECORD!" Pulse Animation
```javascript
const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 180);
ctx.fillStyle = `rgba(255,215,0,${pulse})`;
```

## Particle Burst Colors by Event
| Event | Primary particle color | Count |
|-------|----------------------|-------|
| PERFECT catch | `#FFD700` gold | 12-16 |
| GOOD catch | `#4CAF50` green | 6-8 |
| Danger hit | `#E74C3C` red | 8-10 |
| Miss | — (no burst) | 0 |
| Milestone / level up | `#FFE066` + `#FF9F43` | 20+ |

## "Levels Above" Checklist
For each new game, aim to introduce at least 2 of:
- [ ] Particle system (at minimum for catch events)
- [ ] Screen shake
- [ ] Multi-layer parallax
- [ ] Procedural audio (Web Audio API)
- [ ] Dynamic lighting / glow via canvas compositing
- [ ] Physics simulation (gravity, velocity, angular momentum)
- [ ] Animated character (moving limbs, not static silhouette)
- [ ] Multiple distinct visual environments or states
- [ ] Narrative element (intro text, story beats)
- [ ] Procedurally generated content (not just random spawns)
