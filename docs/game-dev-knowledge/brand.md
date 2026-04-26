# Bob Davis — Game Brand Guidelines

## Artist Identity
- **Name:** Bob Davis
- **Genre:** Country / outlaw country / hip-hop fusion
- **Vibe:** Campfire warmth, road-worn grit, outlaw edge, genuine heart
- **Music status:** Not yet released; embed slot reserved (`MUSIC_SRC = ''`)

## Visual Tone
- **Aesthetic:** Illustrated, warm, gritty-country. Not cartoonish, not pixel art — somewhere between illustrated poster art and silhouette animation.
- **Color palette:**
  - Night sky: deep purples `#050208` → `#1a0d35`
  - Warm gold: `#FFE066`, `#FFD700`, `#F4C842`
  - Earth: `#2a1500`, `#3a1f05`, `#C8A04A`
  - Danger/warning: `#E74C3C`
  - Success/streak: `#FF9F43`
  - Silhouette fill: `#1a0520`, `#2a0f30`
- **Typography:** Serif fonts for titles (Georgia, serif). Sans-serif for HUD numbers. Bold weight throughout.
- **Character style:** Dark silhouettes with simple rounded shapes. Shadow ellipses. No outlines on character fills — shapes only.

## Game Design Principles
- **Mobile-first:** Canvas 360×640, scaled to fit viewport with `min(vw/W, vh/H)`.
- **Single tap dominant:** Primary input is a single tap/click anywhere. Keyboard fallback (Space) for desktop.
- **HUD conventions:** Pills (rounded rects) for all HUD elements. Score center-top gold. Lives top-left. Streak top-right. Music toggle bottom-right.
- **Feedback:** Text popups that float up and fade over ~800ms. Color: gold (perfect), green (good), red (bad/miss).
- **Personal best:** `localStorage` key format: `{game_slug}_best`. Display on title screen if > 0.
- **Music slot:** `const MUSIC_SRC = ''` at top of file. Audio element created but only used when non-empty.
- **Game over:** Dark overlay on scene, score, best, "NEW RECORD!" pulse animation, Play Again button, Share button (`navigator.share()`).

## Tone for Game Text
- Western but not parody. Confident, not campy.
- Examples: "Lasso Loop", "On the Road", "PERFECT", "MISS", "NEW RECORD!"
- Avoid: "AWESOME!!!", excessive exclamation, generic gaming clichés

## What To Avoid
- Neon/synthwave palette (not the brand)
- Cartoonish proportions or bright primary colors without warmth
- Overly complex UI — keep it clean
- Sound effects that aren't placeholder-ready
