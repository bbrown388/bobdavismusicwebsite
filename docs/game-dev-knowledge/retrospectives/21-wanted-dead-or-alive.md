# Retrospective: Wanted: Dead or Alive (Game 21)

**Date:** 2026-05-02
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First investigation/deduction mechanic in series** — All prior games used real-time action, resource management, or card mechanics. Wanted: Dead or Alive introduces inference: gather clues, build a confidence meter, then accuse. The player must synthesize evidence (hat, coat, build, scar) to identify one of 8 suspects. This is the most cognitively demanding game in the series to date.

- **First first-person perspective** — The scene renders from the player's point of view looking down a frontier street. Two building silhouettes form a perspective corridor converging at a vanishing point at the horizon (y=240). Ground perspective lines radiate from VP_X. The moon, stars, and candlelit windows animate subtly to give the scene life. Three NPC depth levels (far/mid/near) scale from 0.45× to 1.05× and position at proportional y-depths along the corridor.

- **Five distinct locations with navigation** — Saloon, General Store, Livery Stable, Sheriff's Office, Hotel. The player taps < > arrows to move between them. Each location is procedurally populated with 1-2 NPCs from the 8-suspect pool (distributed [2,1,2,1,2]). Each transition flashes a dark overlay via `transAnim` that decays at 4×/s, giving a sense of physical movement.

- **Confidence system with four clue sources** — Clues build confidence toward the 60% accusation threshold:
  - Witness interview: +15% (via CLUE_WEIGHT). Each of the 7 non-fugitive suspects gives one unique clue about one of the 4 fugitive features (hat, coat, build, scar). Clue topics are pre-shuffled so features are evenly covered.
  - Evidence examination: +12% (EVIDENCE_WEIGHT). 3 of 5 locations have physical evidence — bootprints, dropped hat, or torn coat — each tied to a specific feature.
  - Fugitive interview: +8% (FUGITIVE_SUSPICION). The fugitive gives a vague deflecting response. Interviewing them adds a small confidence boost rather than nothing, rewarding suspicion recognition.
  - Clue deduplication via Set (`cluesFound`): each source ID ('npc_N' or 'ev_N') contributes at most once per game. Re-interviewing or re-examining the same source does nothing.

- **Accusation system with forgiveness mechanic** — Two wrong accusations lose the game; one wrong accusation applies a -30% confidence penalty and marks the suspect as cleared. This gives the player one mistake to learn from while maintaining high stakes.

- **Wanted poster screen** — A parchment-colored poster (drawn using layered rounded rectangles in ochre/gold) shows the fugitive's silhouette and all four features as bullet points before gameplay begins. A depleting progress bar below the poster auto-advances to playing after 3 seconds. The silhouette is drawn procedurally using the same feature data as the in-game NPC renderer, so it's always accurate.

- **Randomized fugitive identity** — Each game uses a seeded XOR-shift RNG (`gameSeed`). The fugitive's hat, coat, build, and scar are drawn fresh each run. NPC suspect order is shuffled for distribution across locations. Evidence locations are shuffled. No two games are alike.

- **47 tests, all pass first run (after 1-line apostrophe fix)** — The only bug was an unescaped apostrophe in a string literal (`'Clean face, no marks on 'em.'`). Fixed to `'them.'`. All 47 tests then passed: state machine, startGame resets, timer, confidence mechanics, clue weights, evidence weights, no-double-count, fugitive suspicion, correct/wrong accusation, wrongStrikes tracking, navigate clamping, feature validation, popup spawning, HUD pixel check, localStorage, FEEDBACK_ENDPOINT, and console error sweep.

---

## What Caused Friction

- **Apostrophe syntax error** — `'no marks on 'em.'` broke the script silently (the page loaded but `window.__test` was never defined because the crash happened mid-script). All 47 tests reported `window.__test is undefined`. Fix: replace with `'them.'`.

- **HUD pixel coordinates in test** — Suite 43 checked `getImageData(14, 490, 150, 14)` but the confidence bar lives at `SCENE_BOT + 55 = 550`. Fixed coordinates to `(14, 548, 150, 18)`.

---

## Action Items for Game 22

1. **Gallows Road is next** — Sokoban-style jail escape: push crates to block guards, collect keys to unlock doors, reach the exit. First pure puzzle mechanic in the series.
2. **5 escalating levels** — Each level is a small grid (8-10 cols, 10-12 rows). Guards patrol; pushed crates block their path. Player collects keys to unlock the exit door.
3. **Grid-based rendering** — Draw each cell from tile constants. Player character animated with step movement. Guards animate separately.
4. **Level state machine** — Each level has its own `levelStart()`, success advances to next, last level wins.

---

## What Raised the Bar vs. Game 20

| Dimension | Trail Boss (20) | Wanted: Dead or Alive (21) |
|---|---|---|
| Core mechanic | Resource management escort | Investigation / deduction |
| Perspective | Top-down | First-person corridor |
| Skill type | Reactive (resource monitoring) | Cognitive (evidence synthesis) |
| Narrative depth | None | Fugitive identity, witness testimony |
| Procedural variety | Biome/event order | Suspect identity + location assignment |
| New mechanic type | First management sim | First investigation game |
| Test count | 40 | 47 |
