# Retrospective: Gone Fishin' (Game 04)

**Date:** 2026-04-26
**Build method:** Direct inline implementation (subagent org limit hit mid-session; switched to single-session execution)

---

## What Went Well

- **Pre-composed chord progression was the right move** — G–C–D–G with real chord tones (not random frequencies), triangle oscillator + lowpass filter, and a boom-chick gain pattern (bass notes 0.28, upper notes 0.14) produced music that actually sounds like a country fingerpick loop. The "it sounds random" problem from Honky Tonk is solved. The key insight: schedule notes at exact eighth-note positions with harmonically intentional pitches, not randomized lanes.

- **Fish behavior system (not AI) added real depth** — idle/attracted/biting/spooked states with a `bold` trait per fish type created emergent, believable behavior. Fish scatter when the lure splashes nearby, then cautiously approach. The state machine is simple but the visible result reads as "living fish" not "moving pixels."

- **Physics-based bezier line feels premium** — the drooping control point that straightens under tension gives the fishing mechanic a tactile quality no previous game has had. Single most impactful visual feature per effort invested.

- **All features implemented in one session** — implementing all 10 core tasks as a single coherent file eliminated integration bugs that would appear when tasks were applied sequentially. No intermediate commit breakage.

- **Pre-empted failure modes worked** — the checklist at the top of the plan (ctx.save/restore, no state in draw, startGame resets all, gain management) was verified during the single implementation pass. No post-hoc audio bugs or context leaks found.

- **Depth-colored fish silhouettes** — fish color shifts with depth (teal → dark blue → near-black), which reinforces the layered water visual without extra art assets.

---

## What Caused Friction

- **Subagent limit hit during dispatch** — subagent credits were exhausted at the moment of first dispatch. Switched to inline execution. Recoverable, but wasted one dispatch attempt and a brief context stall.

- **Session continuity cost** — this session was resumed from a compacted summary. Some fine-grained context was lost (exact line numbers, intermediate reasoning). The plan being saved to disk was essential — without it, resuming would have been guesswork.

- **No browser automation for verification** — `Start-Process` opens the browser but there's no way to assert "no console errors" or "canvas rendered" without human eyeballing. All browser verification is manual. This will scale poorly as games get more complex.

- **Dual event listener registration** — `touchstart` is registered twice (for `onTap` and `onHoldStart`). On touch devices both fire. This works because they guard on `state`, but it's fragile — future changes could trigger unintended double-handling. Should be unified.

---

## Bugs Caught Before Shipping

| Issue | Where | Fix applied |
|---|---|---|
| `drawLine` during air-arc showed full droop bezier | Cast animation phase | Added `castAnim` guard — during air arc, draw straight taut line instead |
| `reelHeld` could stay `true` if touchend fired during non-reel state | Input handlers | Moved `reelHeld = true` inside the `onHoldStart` state check |
| `fightTimer` not reset on `startGame` | State reset | Added to `startGame()` reset block |
| `ctx.textBaseline` left set after HUD calls | Draw order | Each drawX uses `ctx.save()/ctx.restore()` — baseline resets correctly |
| Feedback overlay click events propagating to canvas | Overlay interaction | Added `if (feedbackOverlay.style.display === 'flex') return;` guard in `onTap` |

---

## Action Items for Game 05

1. **Verify subagent credit availability before dispatching** — do a quick test dispatch before committing to a subagent-driven development session. Don't discover the limit during Task 1.

2. **Unify touch event handling** — consolidate `onTap` and `onHoldStart`/`onHoldEnd` into a single touch handler that dispatches based on state. Two parallel listener chains on the same event is a maintenance hazard.

3. **Add a `state === 'waiting'` instruction to the HUD** — currently there's no prompt telling the player their lure is in the water. Players may not know to wait. A subtle "watching..." label or small indicator would help.

4. **Introduce a completely different input paradigm** — Gone Fishin' uses hold-and-release (cast) plus tap (hook) plus hold (reel). Game 05 should innovate at the input layer: swipe, drag, accelerometer, or multi-point touch.

5. **Consider scene transitions** — all games so far cut instantly between states. A 300ms fade between title → game and game → game over would feel more polished.

6. **Add a minimum game-start delay after a cast** — currently a power-bar tap can immediately trigger `startGame` if the player's finger position matches the title-screen tap target AND the cast hold zone. State transition guard is in place but worth an explicit 200ms lockout.

---

## What Raised the Bar vs. Game 03

| Dimension | Honky Tonk | Gone Fishin' |
|---|---|---|
| Audio | Bar-length patterns, G major scale | Pre-composed chord progression, real chord tones, boom-chick gain pattern |
| Visuals | Stage, crowd, spotlights | Layered parallax water, golden hour sky gradient, animated shimmer, tree silhouettes |
| Physics | None | Bezier fishing line with gravity droop + tension straightening |
| Behavior system | Static target lanes | Fish AI: 4 states, bold trait, attraction radius, scatter on splash |
| Mechanic depth | Tap rhythm | Cast → wait → bite window → reel tension → catch/break |

---

## Updated Knowledge Base Rules

- **Chord progressions beat random notes** — pre-compose the melody using real chord tones at precise rhythmic positions. Random frequencies at random intervals will always sound random regardless of key constraints.
- **Gain pattern matters** — alternating bass/upper note gain (0.28/0.14) creates the structural feel of a real instrument. Flat gain across all notes sounds like a sine wave test.
- **Fish scatter on splash** — distance check against lure landing X at WATER_Y (not lure.y) catches the right moment. Check in `launchCast()`, not in `updateFish`.
- **Bezier droop control point** — `midY = (tipY + lureY)/2 + droop` where `droop = lerp(60, 5, tension/100)` is sufficient for a convincing fishing line. Simple and cheap.
- **Guard feedback overlay in tap handler** — any game with a DOM overlay on top of a canvas must early-return in canvas tap handlers when the overlay is visible, or taps pass through to game state.
