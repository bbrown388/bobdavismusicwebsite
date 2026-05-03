# Retrospective: Dust Storm (Game 26)

**Date:** 2026-05-03
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First fog-of-war / dynamic visibility system in the series** - Prior games had full-scene visibility. Dust Storm uses a radial gradient overlay (transparent at coach center, near-opaque dust color beyond 148px) that hides the entire canvas except a lantern cone ahead of the coach. Obstacles spawn outside the fog edge and drift into visibility, creating a genuine unseen-threat mechanic that no prior game has.

- **Gradient fog implementation is visually rich** - The center of the gradient is offset 28px forward of the coach center (toward the top of screen) to simulate a forward-facing lantern cone rather than a symmetric spotlight. Five color stops from transparent through amber to near-opaque ochre give the dust body and warmth. The effect is convincing without any clipping masks or compositeOperation tricks.

- **Lane-switch tap model with smooth lerp** - Three discrete lanes (x=90, 180, 270) with left-half/right-half tap to shift. The coach smoothly interpolates toward the target x at `9 * dt` per frame, giving a satisfying responsive feel without snapping. Collision detection uses the target position (coachX) not the visual position, so dodges feel fair.

- **Dual obstacle types with different profiles** - Boulders (r=22-34 standard, r=40-47 large) are stationary threats requiring lane changes. Tumbleweeds (r=13-19) drift laterally and rotate, adding unpredictability. Large boulders block 2 adjacent lanes (r=44 boulder at center lane: edges at x=136 and x=224; player at x=90 is clear at 46px vs 62px threshold), forcing the player to the outermost lane.

- **Obstacle spawn outside fog edge** - Obstacles spawn at `COACH_Y - FOG_OUTER - 55 = 287`. At round 1 (160 px/s), an obstacle becomes visible at COACH_Y - FOG_OUTER = 342 and reaches the coach at COACH_Y = 490. That's 148px / 160 px/s = 0.925s of warning time. At round 5 (300 px/s), warning = 0.49s. This is the core tension calibration.

- **Five-round escalation** - Speed 160 to 300 px/s, spawn interval 1.5s to 0.62s, large boulder probability 0% to 40%. Each round adds one meaningful dimension of difficulty rather than just speeding up.

- **Sustained wind audio** - A sawtooth oscillator at 46Hz provides continuous low rumble throughout play. Periodic gust bursts (filtered noise, 0.5s decay) fire every 2.5-5.5s. Together these create an ambient soundscape that reinforces the "blinding storm" setting without being distracting.

- **42 tests pass** - Covers: state machine (title/playing/roundclear/gameover/gamewin), canvas dims, startGame resets (score/lives/round), ROUNDS/LANES structure, lane switching (left/right tap, clamping), obstacle spawn/scroll, collision detection, hitFlash invincibility, distance/score accumulation, roundclear trigger and advance, gamewin on round 4 clear, FOG_OUTER/COACH_R constants, FEEDBACK_ENDPOINT, localStorage, pixel renders (title gold, HUD, gameover red, feedback overlay, progress bar, heart icons, fog), console error sweep, startRound reset.

---

## What Caused Friction

- **Suite 4 (score reset) false failure** - The test called `startGame()`, set score to 9999, called `startGame()` again in one evaluate block, then read score in a separate evaluate call. In the ~1ms gap between evaluate calls, the game loop had already accrued 2 score points. Fixed by reading score in the same evaluate block as the reset.

- **Suite 35/36 pixel scan y-ranges** - Initial test samples were at the exact text baseline (y=179 for gameover, y=118 for feedback). Canvas text rendering places pixels above the baseline. Fixed by scanning a y-range (±15px around baseline) rather than a single scanline.

---

## What Raised the Bar vs. Game 25

| Dimension | Fence Line (25) | Dust Storm (26) |
|---|---|---|
| Core mechanic | Placement/construction | Dodge with fog-of-war |
| Visibility system | Full scene visible | Dynamic lantern cone, 148px fog radius |
| Obstacle reveal | Immediate | Gradual fade from dust (unseen threat) |
| Obstacle types | Single (wind/cattle) | Two types: boulder + tumbleweed with lateral drift |
| Obstacle sizing | N/A | Three size tiers (small/medium/large blockers) |
| Audio | Discrete SFX + wind bursts | Sustained wind drone + periodic gust bursts |
| Speed escalation | Fixed per level | 160 to 300 px/s across 5 rounds |
| Warning time tuning | N/A | Calibrated: 0.49-0.93s based on fog radius / speed |

---

## Action Items for Game 27

1. **River Run is next** - Water navigation, current reading, speed management. First non-land-based game.
2. **Inertia / momentum model** - On water, the raft should have more momentum than a stagecoach. Consider a velocity-based model rather than position snap.
3. **Current indicators** - Animated swirl arrows on the water surface that predict where the current will push the raft. This is the "reading" skill, analogous to Dust Storm's fog timing.
4. **Speed as a resource** - Tap to brake slows the raft and gives more reaction time; not braking builds speed for bonus scoring. Creates a risk/reward decision layer.
5. **Audio** - Rushing water (filtered noise), rock impact thud, rapid flow intensification as speed increases.
