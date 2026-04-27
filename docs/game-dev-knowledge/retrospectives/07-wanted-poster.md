# Retrospective: Wanted Poster (Game 09)

**Date:** 2026-04-27
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First cognitive/deduction mechanic in the series** — all 8 prior games rely on reflexes, timing, or spatial navigation. Wanted Poster introduces memory and face recognition: study a procedurally generated wanted poster, then identify the matching outlaw in a crowd of 4–6 imposters. The challenge is entirely mental — no motor demand at all during the study phase. This is the most distinctly different mechanic the series has seen.

- **Procedural face generation is technically the series' deepest system** — 6 independent feature axes (hatStyle, hatColor, beard, scar, eyeStyle, hair) with 3–4 values each produce 972 unique faces. The `diffCount` guarantee ensures every imposter differs by at least 2 features from the outlaw and from each other, making the crowd readable but not trivially easy. No two rounds are ever alike.

- **Drawing system handles two rendering contexts (big/small) cleanly** — the same `drawFace(cx, cy, faceR, feat, big)` function renders both the wanted poster portrait (faceR=60, big=true) and the NPC crowd (faceR=22*scale, big=false) using proportional geometry everywhere. No separate code paths, no pixel-specific magic numbers.

- **Three-phase difficulty scaling is natural** — study time drops from 8→6→4→3s across rounds, NPC count rises from 4→5→6, and imposters grow visually closer to the outlaw as experience increases. The player feels the pressure tighten without any artificial wall.

- **Saloon atmosphere is the series' most narrative-rich art** — the dark gradient interior, three amber lanterns casting radial glow halos, and the bar counter at the base tell a complete environment. The wanted poster itself — aged paper, double border, WANTED header in crimson, feature legend in serif — is the most typographically detailed element the series has produced.

- **15 test suites cover all state transitions and edge cases** — including face object integrity (Suite 12), localStorage persistence (Suite 11), NPC count scaling across rounds (Suite 9), and the full console-error sweep (Suite 13). All 15 pass on first run.

- **Audio is harmonically grounded** — study phase plays an A minor drone (A3 C4 E4 sine layers at 0.055 gain each), catch plays a G major arpeggio (G4 B4 D5 triangles), wrong tap fires a square descending pitch (160Hz→60Hz). The three sounds occupy different registers and never clash; minor→major tonal shift on success is emotionally legible.

---

## What Caused Friction

- **update-status.js JSON escaping on PowerShell (again)** — confirmed same issue as Game 08. Using `.status-patch.json` file path as the argument is the correct approach on Windows. No deviation from the established pattern.

- **Full-beard re-draw pass** — the full beard (beard===2) fills the lower face oval with dark ink, then restores skin on the upper area and re-draws eyes/nose. This is a layered compositing approach that required careful ordering to avoid clipping the beard into the eye region. The solution works but adds ~30 lines vs. the simpler beard options.

---

## Bugs Caught Before Shipping

- None. Game file was complete and all 15 tests passed on first run.

---

## Action Items for Game 10

1. **Face readability at NPC scale** — at faceR=17 (scale=0.78), some features (scar, handlebar mustache) are near the limit of legibility. Consider adding a subtle highlight ring around the outlaw NPC after a brief "find" delay (1.5s) as an accessibility option.

2. **Timed urgency audio** — the tick sound fires at ≤3s remaining on the study timer. A slower heartbeat-style pulse could begin at 5s remaining to build tension earlier without removing it from the study phase.

3. **Crowd animation** — NPCs are currently static silhouettes. Subtle idle sway (±2px sin wave offset per NPC, each with a different phase) would make the saloon feel alive without changing game logic.

4. **Score decay for hints** — if a player takes more than 8s in the find phase, a subtle feature label could appear near the outlaw (e.g., "SCAR: Left Cheek"). This would reward quick identification and scaffold struggling players without removing challenge.

5. **Test suite: time-based auto-advance** — Suite 8 uses a 2200ms wait for the 1.55s caughtTimer. Future games should expose a `skipCaught()` test hook to avoid wall-clock waits in the test runner.

---

## What Raised the Bar vs. Game 08

| Dimension | Dust Devil | Wanted Poster |
|---|---|---|
| Mechanic type | Physical reflex (impulse momentum) | Cognitive deduction (memory + visual matching) |
| Technical depth | Physics engine (vx/vy/gravity/drag) | Procedural face system (972 unique faces, diffCount guarantee) |
| Art direction | Sunset canyon panorama | Dual-environment: saloon crowd + aged wanted poster with typography |
| Narrative richness | Environmental (canyon, tumbleweed) | Diegetic (law enforcement, reward, Dodge City) |
| Difficulty scaling | 3-axis: gap/frequency/speed | 3-axis: study time/NPC count/feature proximity |
| Test coverage | 14 suites | 15 suites |
