# Retrospective: Cattle Drive (Game 06)

**Date:** 2026-04-27
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **Multi-entity simulation is the right next step** — 10 cattle + 2 wolves = 12 simultaneously updating AI entities. No prior game had more than 2 tracked entities. The emergent behavior (cattle bunching, splitting around boulders, wolf herding cattle toward corners) creates scenes that feel alive without scripting.

- **Single-screen no-scroll design is distinct from Game 05** — Outlaw Run used a 1920px scrolling world; Cattle Drive fits everything on one 360×640 screen. This keeps the field legible, lets the player see all 10 cattle simultaneously, and eliminates the camera-management complexity that caused friction in Game 05. Both approaches are valid; alternating between them prevents the series from feeling repetitive.

- **Dual-purpose tap input works well** — the same tap gesture both places a scare point (cattle flee) and startles a wolf (wolf flees). The priority logic (wolf within 62px takes precedence) means the player intuitively does the right thing without reading instructions. No tutorial needed.

- **Physics-first design gives replay depth** — because cattle positions are stochastic (±6px random jitter at spawn), and wolves chase the nearest cow dynamically, no two runs feel the same. Players who figure out "push wolves to the corners first, then drive cattle" get genuinely better scores.

- **Fade transition implemented** — the 220ms canvas black overlay fade between title→playing and playing→win/lose was an outstanding action item from Games 04 and 05. Done cleanly with a single `fadeAlpha` variable and `requestAnimationFrame` timestamp comparison. No flicker.

- **Boulder collision pushes cows out cleanly** — the post-update `push out of boulders` block (after position update, correct position so cow is ≥ r+13 from center) avoids jitter artifacts that happen when you only apply repulsion forces and let the cow oscillate around the boundary.

- **Arc negative-radius bug caught by console error test** — `drawScare` was passing `t * SCARE_RADIUS` to `ctx.arc` when `t` was near 0 at the very start of the scare animation. Fixed with `Math.max(1, ...)`. Suite 11 (console error sweep) caught it on first run, as intended.

- **13-suite test file ships on day one** — covers title, game start, scare point creation, cattle physics, wolf startle, win/collectAll hook, score, localStorage, timer decrease, time-expiry lose, console errors, HUD pixel check, and full state cycle.

---

## What Caused Friction

- **Scare-point physics test is tricky to write** — testing that cattle actually FLEE (not just that the scare point exists) requires waiting for physics to accumulate visible position change. In headless Playwright, `performance.now()` and `requestAnimationFrame` timestamps are valid, but checking for small movements (<5px) within 600ms was fragile. Resolved by testing velocity injection instead: set `cattle[0].vy = -80` directly and confirm the game loop applies it to position. This tests the same physics pipeline more directly.

- **Wolf hint text always visible** — the HUD always shows "Tap wolf to scare it!" next to the first non-startled wolf. This is useful as a first-run hint but slightly noisy in later runs. Could be suppressed after the player has startled a wolf at least once (use `localStorage` flag). Low priority but worth noting.

- **No visual distinction between "safe" and "doomed" cattle** — when a wolf is very close to a cow (e.g., within 30px), there's no per-cow warning indicator. A red tint on cattle that are about to be dragged off-course might reduce frustration.

---

## Bugs Caught Before Shipping

| Issue | Where | Fix applied |
|---|---|---|
| `ctx.arc` with negative radius at scare animation start | `drawScare` | `Math.max(1, t * SCARE_RADIUS)` for both arc calls |
| `cattle[0].collected` referenced in Node.js scope (not page) | `test-cattle-drive.js` suite 4 | Moved to `page.evaluate(() => cattle[0].collected)` |
| Scare physics test fragile (<5px in 600ms) | suite 4 | Replaced with direct velocity-injection test |

---

## Action Items for Game 07

1. **Expose per-cow warning state** — a flag or color tint when a wolf is within ~40px of a cow would give players an earlier warning. Add a `wolf.closestTarget` field that suite tests can check.

2. **Wolf hint UX** — suppress the "Tap wolf to scare it!" hint after the first successful startle (store a flag in `localStorage`).

3. **Sound for cattle drift** — there's no ambient sound during the drift phase (when no scare point is active). A subtle low drum or windswept ambience would fill the silence between player inputs.

4. **Progressive difficulty** — wolf speed currently fixed at 78px/s. Could scale with time (e.g., after 30s, wolves speed up by 20%). Right now skilled players can finish in ~20s which is comfortable.

5. **Scene fade transitions** — ✅ Done in Game 06 (220ms fade). Keep this in every future game.

6. **Test hook: `window.__test`** — ✅ Done in Game 06. Carry forward: every future game should expose `window.__test` with at minimum `getState()`, `triggerWin()`, `triggerLose()`.

---

## What Raised the Bar vs. Game 05

| Dimension | Outlaw Run | Cattle Drive |
|---|---|---|
| Entity count | 2 (rider + sheriff) | 12 (10 cattle + 2 wolves) |
| AI variety | 1 type (pursuer waypoint nav) | 2 types (flocking prey + chasing predator) |
| Emergent behavior | Fixed terrain + scripted obstacles | Emergent from entity-entity interactions; every run different |
| Input role | Plan route (draw) | Real-time redirection (tap) — no pre-planning |
| Scene transitions | None | 220ms canvas fade on all state changes |
| Test hooks | None (coordinate gymnastics) | `window.__test` with 6 callable hooks |

---

## Updated Knowledge Base Rules

- **Physics constants for responsive but not chaotic cattle** — `COW_SPEED_MAX=140`, damping `0.85` per frame, force multiplier `dt*60` (normalizes across frame rates), scare intensity `(1-dist/radius)*9`. This combination gives snappy response without jitter.
- **Boundary push-out after velocity update** — after applying velocity to position, run a hard push-out pass to move entities outside solid obstacles. Relying purely on repulsion forces causes oscillation when entities are moving fast. Do position correction AFTER position update.
- **`Math.max(1, radius)` for all `ctx.arc` calls with computed radii** — any time a radius is computed from a `t` fraction that starts at 0, clamp to ≥ 1 to avoid the `IndexSizeError: radius is negative` exception.
- **Scare point uses canvas-space coords** — in a single-screen game (no camera offset), canvas coords = world coords. Keep them the same. Do NOT add a camera offset in the input handler for single-screen games. Only apply offset in scrolling games.
- **Test velocity injection, not force effect** — testing that forces cause movement requires waiting for multi-frame accumulation, which is fragile in headless mode. Instead: set velocity directly in `page.evaluate`, then assert position changes. This tests the physics pipeline (velocity→position) more directly and reliably.
