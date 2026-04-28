# Retrospective: Stampede (Game 12)

**Date:** 2026-04-28
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First first-person perspective game in the series** — all prior 11 games use top-down, side-scrolling, or fixed-camera views. Stampede renders a pseudo-3D perspective with a vanishing point at the horizon, giving the player a ground-level view of the incoming herd. This is a fundamentally different spatial relationship than any prior game.

- **Perspective projection system** — each buffalo is rendered using `FOCAL / z` scale factor applied to world-space coordinates. At z=900 (spawn distance) a buffalo is ~14px tall; at z=80 (collision distance) the same buffalo is ~158px tall filling the lower third of the screen. The effect is visceral: you see tiny specks on the horizon becoming massive silhouettes bearing down on you.

- **Dual-intensity threat system** — center-lane buffalos are the most terrifying because they remain centered on screen and grow enormous. Side-lane buffalos sweep across the screen and disappear off the edges as they pass, rewarding the player who dodges early with a satisfying near-miss visual. This gives the two dodge directions meaningfully different visual payoffs.

- **Horizon dust cloud** — the HUD is enhanced by a subtle orangey dust cloud that appears just above the horizon and intensifies as the nearest buffalo approaches. Tiny, but effective: it signals the herd is coming before the first buffalo is clearly visible.

- **Signal Herd mechanic** — 3 uses with a 500-frame cooldown. When triggered: nearby buffalos get a `scattered` flag and accelerating lateral velocity, fading out as they arc off-screen. The player shadow emits a golden particle burst and a 4-note ascending triangle bugle phrase. This creates a genuine strategic choice: use signal early to clear a wave, or save it for when you're boxed in.

- **Dynamic hoofbeat audio** — a continuous sawtooth oscillator through a bandpass filter runs while the game is active, with gain and frequency modulated by the nearest buffalo's z-depth. As the herd approaches, the rumble grows in volume and pitch. Stops cleanly on game over.

- **Screen shake on hit** — `shakeFrames` counter drives random canvas translation for ~22 frames post-collision, giving physical weight to getting trampled.

- **Smooth lane interpolation** — `playerLaneT` animates toward `playerLane` at 28% per frame, so the player's shadow and the dodge effect animate smoothly rather than snapping. The dodge flash effect reinforces the direction of motion.

- **23 test suites, all pass** — suites cover: title (1), canvas dimensions (2), start game (3), player lane (4), lives start (5), signal uses (6), dodge left (7), dodge right (8), edge blocking (9), distance increment (10), buffalo management (11), collision (12), invulnerability (13), signal scatter (14), signal uses/cooldown (15), cooldown block (16), game over (17), dead screen (18), localStorage (19), feedback overlay (20), signal zone (21), speed scaling (22), console error sweep (23).

---

## What Caused Friction

- **Perspective math for lane dividers** — the world-space lane projection formula gives side-lane buffalos x positions way off-screen at close range (z=80, LANE_SEP=62: x = ±248 from center = ±68 or ±428). The visual ground dividers are drawn as artistic perspective lines (VP → fixed bottom positions) that approximately match at medium range (z=200-600) but diverge at very close range. This is intentional and actually correct (peripheral lanes pass out of view when very close), but took significant analysis to confirm it was acceptable rather than a bug.

- **No multi-frame test injection** — suite 12 (collision) places a buffalo at z=72 and waits 200ms for the game loop to process it. This worked reliably but is time-dependent. The action items from Boot Hill Bluff (inject state directly) were partially implemented via `addBuffalo` / `setInvuln` / `setLives` test helpers.

---

## Bugs Caught Before Shipping

- None — first run was clean. The simpler real-time mechanic (compared to Boot Hill Bluff's multi-phase round system) meant the update loop was straightforward to get right.

---

## Action Items for Game 13

1. **Test frame injection** — expose a `tickFrames(n)` helper that runs `update(1/60)` n times synchronously inside page.evaluate(). This eliminates all `waitForTimeout` waits in collision/state-change tests, making the suite faster and deterministic.

2. **Speed lines on sky** — consider adding faint radial speed lines from the VP that animate outward as speed increases. Currently the horizon is static; a subtle animated effect would reinforce the velocity feel at high speeds.

3. **Wave preview indicator** — a small "NEXT WAVE" row of dots at the top showing the next incoming wave's lane configuration. Would give skilled players one extra beat to pre-position.

4. **Scoring in title best** — best score should display on title even at 0 (currently hidden when best===0). A "0 yd" starter entry helps calibrate expectations.

---

## What Raised the Bar vs. Game 11

| Dimension | Boot Hill Bluff | Stampede |
|---|---|---|
| Perspective | Fixed 2D saloon table | First-person pseudo-3D vanishing point |
| Real-time urgency | None (turn-based, no timer) | Continuous real-time, increasing speed |
| Visual scale | Card/chip icons, static positions | Perspective-scaled silhouettes from 14px to 158px |
| Audio | Ambient loop + 9 distinct SFX | Continuous dynamic rumble modulated by proximity |
| Spatial reading | Read tells (character details) | Read 3D depth and lane positions simultaneously |
| Test coverage | 18 suites | 23 suites |
