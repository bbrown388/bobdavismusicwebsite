# Bob Davis Music — Claude Code Project Instructions

This is the working directory for Bob Davis's music website and game library.

## Autonomous Game Director

A session-start hook runs `node autonomous/director.js` at the start of every session. If its output contains `EXECUTE:` or `RESUME_TASK:`, **read `autonomous/DIRECTOR_PROMPT.md` immediately** and carry out the action it describes — without waiting for Bob to say anything.

The system is designed to run autonomously. When the director signals an action, execute it. Do not ask Bob for input unless something unexpected blocks you (missing credential, catastrophic test failure that can't be resolved by reading the code).

## Project Context

- **Website:** `index.html` — Bob Davis music hub, links to games, merch, socials
- **Merch:** `merch.html` — Shopify Storefront API product listing
- **Game library:** `games.html` — browseable index of all games; 54 games and counting
- **Games:** Single HTML files in the root directory (e.g. `smoke-signal.html`, `trail-blaze.html`)
- **Knowledge base:** `docs/game-dev-knowledge/index.md` — read before building or fixing anything
- **Tests:** Each game has `test-<slug>.js`; website pages tested in `test-website.js`
- **Test runner:** `node run-all-tests.js --website` (fast) | `--recent 5` | no flags = all 54+ game tests (slow)
- **Feedback inbox:** `autonomous/feedback-inbox.json` — paste feedback here; director drains it on session start
- **Feedback endpoint:** `https://formspree.io/f/xdayvnvo` (POST only; read from `autonomous/feedback-url.txt`)

## Session Permissions

Bash(*) and PowerShell(*) are pre-approved. Git push is approved for this project. No need to confirm before pushing to main.

## Windows / Encoding Gotcha

The Edit tool on Windows can silently introduce Unicode curly quotes (U+201C/U+201D) into HTML attribute values, breaking CSS selectors and JS. After editing `index.html` or other HTML files, run:

```powershell
$path = "index.html"
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$c = $c.Replace([char]0x201C, '"').Replace([char]0x201D, '"')
[System.IO.File]::WriteAllText($path, $c, [System.Text.Encoding]::UTF8)
```

## Keeping Game Count in Sync

When a new game is added, update the game count in **two places**:

1. **`index.html`** — find `<a class="link-btn games" href="games.html">` and update the number in "Browse N Games"
2. **`games.html`** — update `<meta name="description" content="N western mini-games, each built in a single AI session.">`

The director's `DIRECTOR_PROMPT.md` step 9 has the full instructions for this.
