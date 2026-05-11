# Retrospective: Prairie Telegraph (Game 46)

**Date:** 2026-05-11
**Build method:** Single autonomous session (no human input)

---

## What Went Well

- **First visual-symbol decoding mechanic in the series** - Wire Tap (Game 40) used audio Morse code. Prairie Telegraph is the VISUAL equivalent: decode arm positions rather than audio tones. The semaphore alphabet (26 letters via 6-position, 2-arm hex encoding) creates a learnable system players can master. First time the series uses a spatial/positional vocabulary as the primary decoding mechanism.

- **Direct hex-selector UI** - Instead of cycling through 6 arm positions one-at-a-time, the player sees a 6-zone hexagonal selector for each arm. Tapping directly picks the angle. This gives instant selection (1 tap = 1 answer) vs. cycling (up to 5 taps). The radial layout matches the spatial positions of the arm angles (0°=top, 60°=top-right, 120°=bottom-right, etc.) making the UI self-descriptive.

- **Relay-chain framing creates urgency without a single global countdown** - The chain metaphor (sender → player → receiver) contextualizes why the player matters. The per-letter timer bar adds pressure without being oppressive. Correct relay = confirmation flash on receiver figure. Wrong relay = red glow on player figure. Visual feedback is immediate and position-appropriate.

- **Wind gust mechanic is distinctly disruptive** - When a gust hits, sender arms visibly scramble to wrong positions AND wind particles blow across the scene. The gust lasts 420ms (visible but recoverable) then arms restore. This forces players to either (a) have already decoded the letter, or (b) wait out the gust and re-decode. Creates moment-to-moment strategy: be fast or be patient.

- **Three-figure stage layout** - Sender (left, 0.78x), Player (center, 1.0x), Receiver (right, 0.78x) creates a clear spatial narrative. The player is literally in the middle of a relay chain. Scale difference makes roles visually clear without labels. The telegraph poles and dashed wire above all figures reinforce the station-to-station structure.

- **25 tests, 0 failures on first run** - Clean test run. The `window._pt` test helper exposed all state getters and game functions without leakage issues. The `waitForFunction` approach for state transitions (waiting for `playing` after `roundAnnounce`) proved reliable for async state testing.

- **Six-position arm system (60° increments) is highly readable** - The six positions (up, upper-right, lower-right, down, lower-left, upper-left) are visually distinct from each other and match the natural "clock face" positions players intuitively understand. 26-letter alphabet fits cleanly (26 of the available 30 unique ordered pairs).

---

## What Caused Friction

- **roundAnnounce → playing transition** - Tests that needed the game in `playing` state had to use `waitForFunction(() => window._pt.getState() === 'playing', { timeout: 5000 })`. This added async complexity to 8+ tests. An alternative is exposing a `forcePlay()` helper in the test API that bypasses the announceT timer. This was acceptable but slightly verbose.

- **Second-half timer bonus not directly testable** - S13 (second-half timer → +100) couldn't directly set the internal `letterTimer` to below half-time via the exposed API. The test fell back to verifying the range of `roundTime` rather than the exact score. A `setLetterTimer(val)` method in `_pt` would allow precise bonus testing in future games.

- **Status update JSON escaping on Windows** - Running `node update-status.js '...'` with inline JSON fails on Windows PowerShell due to quote handling. The workaround was writing the JSON to a temp `.json` file and passing the path. This is a known Windows-specific friction point (documented in prior retros); the temp-file pattern is the reliable fix.

---

## What Raised the Bar vs. Game 45

| Dimension | Rattlesnake Round-Up (45) | Prairie Telegraph (46) |
|---|---|---|
| Core mechanic | Multi-phase hold+drag per entity | Visual symbol decoding + relay |
| Decoding medium | None (mechanical timing) | Spatial arm-position pattern |
| Primary challenge | Per-entity timing + dexterity | Visual matching + memory under wind disruption |
| New mechanic | Per-entity hold+pin timer | Semaphore 26-letter alphabet, hex direct-selector |
| New visual | Thermal heat-map rendering | Three-figure relay stage, hex-wheel UI |
| Disruption mechanic | Snake escape if pin expires | Wind gust scrambles sender mid-signal |
| Signal vocabulary | N/A | 26-letter spatial encoding (first in series) |
| Stage structure | Single pit, multiple entities | Linear relay chain (sender → player → receiver) |

---

## Action Items for Game 47

1. **Outlaw Auction is next** - Hidden-value auction with behavioral AI. Each outlaw has a secret bounty revealed only after purchase. Read rival bidders' behavior patterns to estimate value.
2. **Hidden-information economic game** - Distinct from Cattle Auction (Game 33, known grades) — focus on inference from behavioral tells rather than visible quality.
3. **Bidding tension** - The going-once/going-twice call mechanic from Cattle Auction worked well; this game needs a different urgency mechanism since rivals are inferring too.
4. **Player-side deception** - Consider allowing the player to read AND to bluff rival bidders into overpaying, making deception work in both directions.
