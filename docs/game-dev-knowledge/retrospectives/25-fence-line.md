# Retrospective: Fence Line (Game 25)

**Date:** 2026-05-03
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First construction/placement mechanic in the series** — All prior games involved reactive inputs (dodge, shoot, balance, match, navigate). Fence Line introduces a sequential construction loop: tap a gap to place a POST, tap again to add a RAIL and close it. The two-step sequence creates deliberate, satisfying micro-decisions rather than a single button mash.

- **Dual-threat pressure system** — Wind and cattle create orthogonal pressure. Wind attacks your partially-placed work (knocking posts back to gaps); cattle exploit completed gaps to escape. The player must balance completing gaps quickly (vs. wind timing) against prioritizing gaps cattle are currently rushing. This creates genuine triage decisions.

- **Cattle AI with gap-seek and wander** — Each cow idles with random velocity changes (every 1.5-2s), but if the nearest open gap is within 160px, the cow accelerates toward it proportionally. The seek bias produces emergent bottlenecks where multiple cows race the same gap simultaneously. Speed scales with level (level 0: 38px/s, level 4: 68px/s).

- **Wind gust particle system** — When wind triggers, 22 particles sweep right-to-left across the full canvas height, varying in length (18-56px), opacity (0.25-0.65), y-velocity, and x-speed. Alpha fades with gust progress. Combined with the noise-based wind audio (white noise with exponential decay), this gives wind a tactile presence beyond a stat change.

- **5-level difficulty curve** — Gap count scales 3→4→5→6→7, timer compresses 90→80→70→60→50s, wind interval tightens 18→14→11→9→7s, and wind knock increases 1→2 at level 3. Level 5 features 7 gaps (58% of fence destroyed), 50s, and 7s wind cycles — this forces constant motion with almost no downtime between closures.

- **Score design with three reward types** — Gap close (+100 each), time bonus (+50/s remaining at level clear), and level completion flat (+200). A perfect 5-level run yields roughly 5,000-8,000 points. The time bonus rewards efficiency without punishing deliberate play, and the flat bonus feels earned.

- **Visual layering** — Intact sections: warm brown gradient rail + dark post. Gap sections: broken stumps with jagged breaks. Post-only sections: fresh center post with gold glow (implicit "needs rail" cue). Closed sections: bright gold rail + lighter post (new wood). This 4-state visual vocabulary is immediately legible without any tutorialization.

- **42 tests pass** — Covers: state machine (title/playing/levelclear/gameover/gamewin), canvas dims, startGame resets (score/lives/level), LEVELS structure (5 entries, correct gap arrays), section state transitions (gap→post→closed, intact/closed immutability), level clear trigger (checkClear), level advance timing, timer expiry → gameover, openGaps count, wind behavior (post knockdown, intact/closed immunity, no-post safe call), cattle escape (lives reduction), cattle block (intact sections), level configs (gap counts by level), setSectionState, feedback endpoint, localStorage, pixel renders (title gold, HUD, gameover red, gap dark, feedback overlay), console error sweep, full state cycle.

---

## What Caused Friction

- **Suite 35 pixel color threshold** — The initial test checked `b < 80` for gold pixels, but #FFE066 has b=102. One-line fix: `b < 140`. A reminder to test the exact palette values when writing pixel assertions.

---

## What Raised the Bar vs. Game 24

| Dimension | Dead Reckoning (24) | Fence Line (25) |
|---|---|---|
| Core mechanic | Celestial navigation puzzle | Construction/placement under pressure |
| Input model | Deliberate tap-to-identify | Rapid sequential taps on same target |
| Threat type | Single (cloud coverage) | Dual-threat (wind + cattle AI) |
| Entity AI | None | 4-6 cattle with gap-seek behavior |
| Particle system | None | 22-particle wind gust with physics |
| State per section | N/A | 4 states: intact / gap / post / closed |
| Sound design | None (clouds are silent) | Post hammer, rail nail, wind noise, escape alarm, level clear chime |
| Number of levels | 5 rounds (shared timer) | 5 independent timed levels |
| Visual vocabulary | Terrain grid + sky zone | 4-state fence + living cattle entities |

---

## Action Items for Game 26

1. **Dust Storm is next** — Dynamic visibility / fog-of-war. Stagecoach, shrinking lantern cone, boulders revealed only as the coach approaches.
2. **Lean into the unseen threat** — What makes Dust Storm interesting is what players *can't* see. The tension should come from anticipation, not reaction time.
3. **Consider scroll vs. tap-dodge** — Continuous side-scroll with left/right swerve taps may feel more natural than discrete lane-switch for a moving stagecoach.
4. **Wind as ambient audio** — Prairie Fire established wind sound; Fence Line reinforced it. Dust Storm should have a constant rumbling gust that intensifies near obstacles.
