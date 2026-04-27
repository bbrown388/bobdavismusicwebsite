# Bob Davis Music — Claude Code Project Instructions

This is the working directory for Bob Davis's music website and game library.

## Autonomous Game Director

A session-start hook runs `node autonomous/director.js` at the start of every session. If its output contains `EXECUTE:` or `RESUME_TASK:`, **read `autonomous/DIRECTOR_PROMPT.md` immediately** and carry out the action it describes — without waiting for Bob to say anything.

The system is designed to run autonomously. When the director signals an action, execute it. Do not ask Bob for input unless something unexpected blocks you (missing credential, catastrophic test failure that can't be resolved by reading the code).

## Project Context

- **Website:** `index.html` — Bob Davis music hub, links to games
- **Games:** Single HTML files (`on-the-road.html`, `lasso-loop.html`, `honky-tonk-v2.html`, `gone-fishin.html`, `outlaw-run.html`)
- **Knowledge base:** `docs/game-dev-knowledge/index.md` — read before building or fixing anything
- **Tests:** Each game has a Playwright test file (`test-*.js`)
- **Feedback:** Formspree endpoint `https://formspree.io/f/xdayvnvo` (POST only, no API key needed for submission)
- **Feedback inbox:** `autonomous/feedback-inbox.json` — Bob pastes feedback here; director drains it on session start. Format: `[{ "game": "...", "rating": 1-5, "feedback": "...", "score": 0 }]`
- **Formspree API key (optional):** Set as env var `FORMSPREE_API_KEY` to also read in-game form submissions (requires paid Formspree plan)

## Session Permissions

Bash(*) and PowerShell(*) are pre-approved. Git push is approved for this project. No need to confirm before pushing to main.
