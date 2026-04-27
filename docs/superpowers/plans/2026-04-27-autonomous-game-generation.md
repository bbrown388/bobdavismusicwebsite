# Autonomous Game Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New games appear on the website automatically, with no input from Bob, using only session-token credits — the system pauses when tokens run out and resumes as soon as a new session starts.

**Architecture:** A Claude Code session running in this working directory acts as the "game director." On each session start it reads feedback from Formspree, decides whether to fix an existing game or build a new one, executes the work, and pushes. A lightweight polling script checks Formspree on a schedule (via Claude Code `/schedule` or a cron-style CronCreate call) so the director fires even when no human opens a terminal.

**Tech Stack:** Claude Code CLI, Claude API (for reading feedback + making decisions), Formspree REST API, Git/GitHub Pages, Playwright (tests), existing game knowledge base.

---

## How the Loop Works (No Human Required)

```
Session opens
  → read_feedback()          — GET Formspree submissions since last run
  → classify_feedback()      — group into: fix-existing / new-game / noise
  → decide_action()          — pick highest-priority item (fix > new)
  → execute_action()         — brainstorm → plan → implement → test → push
  → update_state()           — write last-run timestamp, summary to state file
Session ends (token limit)

Next session opens → repeat
```

The system is fully idempotent: if a session ends mid-task, the next session reads the state file, finds the incomplete task, and continues.

---

## File Structure

| File | Purpose |
|---|---|
| `autonomous/director.js` | Main orchestrator — reads state, calls decision logic, dispatches work |
| `autonomous/feedback.js` | Formspree client — GET submissions, filter to new ones, return structured list |
| `autonomous/decision.js` | Classify feedback, score priority, return `{ action, target, context }` |
| `autonomous/state.json` | Persisted run state: last feedback ID seen, current task, last game number |
| `autonomous/run.sh` | Shell entry point: `node autonomous/director.js` |
| `autonomous/DIRECTOR_PROMPT.md` | System prompt given to the game-director Claude session |
| `docs/game-dev-knowledge/` | Existing knowledge base — director reads this for brand/design context |

---

### Task 1: Formspree feedback reader

**Files:**
- Create: `autonomous/feedback.js`
- Create: `autonomous/state.json`

- [ ] **Step 1: Write the failing test**

Create `autonomous/test-feedback.js`:

```js
// Run: node autonomous/test-feedback.js
// Expected: prints structured feedback array (or [] if no submissions)
const { fetchNewFeedback } = require('./feedback');
fetchNewFeedback().then(items => {
  console.log('Feedback items:', JSON.stringify(items, null, 2));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run to verify it fails**

```
node autonomous/test-feedback.js
```
Expected: `Cannot find module './feedback'`

- [ ] **Step 3: Write `autonomous/state.json`**

```json
{
  "lastFeedbackId": null,
  "lastRunAt": null,
  "currentTask": null,
  "gamesBuilt": 5,
  "lastGameTitle": "Outlaw Run"
}
```

- [ ] **Step 4: Write `autonomous/feedback.js`**

```js
const https = require('https');
const fs = require('fs');
const STATE_FILE = __dirname + '/state.json';
const FORMSPREE_KEY = process.env.FORMSPREE_API_KEY || '';
const FORM_ID = 'xdayvnvo';

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastFeedbackId: null }; }
}

function fetchNewFeedback() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'formspree.io',
      path: `/api/0/forms/${FORM_ID}/submissions`,
      headers: { 'Authorization': `Bearer ${FORMSPREE_KEY}`, 'Accept': 'application/json' },
    };
    https.get(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const submissions = data.submissions || [];
          const { lastFeedbackId } = readState();
          const newItems = lastFeedbackId
            ? submissions.filter(s => s.id > lastFeedbackId)
            : submissions;
          resolve(newItems.map(s => ({
            id: s.id,
            game: s.data?.game || 'unknown',
            rating: parseInt(s.data?.rating || '0', 10),
            feedback: s.data?.feedback || '',
            score: parseInt(s.data?.score || '0', 10),
            submittedAt: s.created_at,
          })));
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

module.exports = { fetchNewFeedback };
```

- [ ] **Step 5: Run test**

```
node autonomous/test-feedback.js
```
Expected: prints `Feedback items: []` (or array of submissions if Formspree has data)

Note: Without a valid `FORMSPREE_API_KEY` env var this will return 401. That's expected — the key is set at runtime.

- [ ] **Step 6: Commit**

```bash
git add autonomous/feedback.js autonomous/state.json autonomous/test-feedback.js
git commit -m "feat: autonomous feedback reader (Formspree client)"
```

---

### Task 2: Decision engine

**Files:**
- Create: `autonomous/decision.js`
- Create: `autonomous/test-decision.js`

- [ ] **Step 1: Write test**

```js
// autonomous/test-decision.js
const { classifyAndDecide } = require('./decision');

const mockFeedback = [
  { id: 1, game: 'Gone Fishin\'', rating: 2, feedback: 'fish are too slow to bite', score: 120 },
  { id: 2, game: 'Outlaw Run', rating: 4, feedback: 'sheriff should be faster', score: 850 },
  { id: 3, game: 'Outlaw Run', rating: 5, feedback: 'love it!', score: 1200 },
];

const state = { gamesBuilt: 5, lastGameTitle: 'Outlaw Run' };
const decision = classifyAndDecide(mockFeedback, state);
console.log('Decision:', JSON.stringify(decision, null, 2));

// Assertions
console.assert(decision.action, 'decision has action');
console.assert(['fix', 'new_game', 'idle'].includes(decision.action), 'valid action type');
if (decision.action === 'fix') {
  console.assert(decision.target, 'fix has target game');
  console.assert(decision.context, 'fix has context');
}
console.log('PASS');
```

- [ ] **Step 2: Run to verify fails**

```
node autonomous/test-decision.js
```
Expected: `Cannot find module './decision'`

- [ ] **Step 3: Write `autonomous/decision.js`**

```js
// Priority: bug-level complaints (rating ≤ 2) on specific game → fix
// Recurring theme across 2+ items → incorporate in next game
// Positive feedback → log, no action
// No feedback → build next game (if ≥ 1 week since last)
function classifyAndDecide(feedbackItems, state) {
  if (!feedbackItems.length) {
    return { action: 'new_game', context: 'No feedback; continuing game series', target: null };
  }

  const byGame = {};
  for (const item of feedbackItems) {
    if (!byGame[item.game]) byGame[item.game] = [];
    byGame[item.game].push(item);
  }

  // Fix priority: game with lowest avg rating among those with ≥1 complaint
  let fixTarget = null, lowestAvg = Infinity;
  for (const [game, items] of Object.entries(byGame)) {
    const complaints = items.filter(i => i.rating <= 2);
    if (!complaints.length) continue;
    const avg = items.reduce((s, i) => s + i.rating, 0) / items.length;
    if (avg < lowestAvg) { lowestAvg = avg; fixTarget = game; }
  }

  if (fixTarget) {
    const complaints = byGame[fixTarget].filter(i => i.rating <= 2);
    return {
      action: 'fix',
      target: fixTarget,
      context: complaints.map(c => c.feedback).filter(Boolean).join(' | '),
      feedbackSummary: byGame[fixTarget],
    };
  }

  // Recurring themes (2+ mentions of same word root) → inform next game
  const themes = {};
  for (const item of feedbackItems) {
    const words = (item.feedback || '').toLowerCase().split(/\W+/).filter(w => w.length > 4);
    for (const w of words) { themes[w] = (themes[w] || 0) + 1; }
  }
  const recurring = Object.entries(themes).filter(([, n]) => n >= 2).map(([w]) => w);

  return {
    action: 'new_game',
    context: recurring.length ? `Player themes: ${recurring.join(', ')}` : 'General positive feedback; raise the bar',
    target: null,
    recurringThemes: recurring,
  };
}

module.exports = { classifyAndDecide };
```

- [ ] **Step 4: Run test**

```
node autonomous/test-decision.js
```
Expected: prints decision with `action: 'fix'` (Gone Fishin' rating 2), plus `PASS`

- [ ] **Step 5: Commit**

```bash
git add autonomous/decision.js autonomous/test-decision.js
git commit -m "feat: autonomous decision engine — classify feedback, choose fix vs new game"
```

---

### Task 3: State persistence and director skeleton

**Files:**
- Create: `autonomous/director.js`
- Create: `autonomous/DIRECTOR_PROMPT.md`

- [ ] **Step 1: Write `autonomous/DIRECTOR_PROMPT.md`**

This is the system prompt injected into the Claude Code session that actually builds games:

```markdown
# Game Director

You are building games for Bob Davis's music website. Read the knowledge base at `docs/game-dev-knowledge/index.md` before any action.

## If action = fix
- Read the target game file
- Apply the smallest change that addresses the feedback
- Run the game's Playwright test file; fix failures
- Commit with message: `fix(<game>): <one-line description>`
- Push

## If action = new_game
- Use brainstorming + writing-plans + subagent-driven-development skills
- Each game must be more impressive than the last in at least 2 dimensions
- Incorporate `recurringThemes` from feedback context if present
- Write Playwright tests from the start (ship with game)
- Add game card to index.html
- Commit and push
- Update `autonomous/state.json`: increment gamesBuilt, set lastGameTitle

## Rules
- Never ask Bob a question — make decisions using the knowledge base
- Never break a game that was already working
- Test file must pass before pushing
- Match brand: outlaw/country/hip-hop, ochre/gold palette, Georgia serif, 360×640 canvas
```

- [ ] **Step 2: Write `autonomous/director.js`**

```js
const fs = require('fs');
const { fetchNewFeedback } = require('./feedback');
const { classifyAndDecide } = require('./decision');

const STATE_FILE = __dirname + '/state.json';

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastFeedbackId: null, gamesBuilt: 5, lastGameTitle: 'Outlaw Run', currentTask: null }; }
}

function writeState(updates) {
  const current = readState();
  const next = { ...current, ...updates, lastRunAt: new Date().toISOString() };
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
}

async function main() {
  console.log('[director] Session start:', new Date().toISOString());
  const state = readState();
  console.log('[director] State:', JSON.stringify(state));

  // Resume incomplete task if any
  if (state.currentTask) {
    console.log('[director] Resuming incomplete task:', state.currentTask);
    // The actual work is done by the Claude Code session reading this output
    // and the DIRECTOR_PROMPT.md instructions
    console.log('RESUME_TASK:', JSON.stringify(state.currentTask));
    return;
  }

  let feedback = [];
  try { feedback = await fetchNewFeedback(); }
  catch(e) { console.warn('[director] Could not fetch feedback:', e.message); }

  if (feedback.length > 0) {
    const lastId = Math.max(...feedback.map(f => f.id));
    writeState({ lastFeedbackId: lastId });
  }

  const decision = classifyAndDecide(feedback, state);
  console.log('[director] Decision:', JSON.stringify(decision));

  writeState({ currentTask: decision });

  // Signal to the Claude Code session what to do
  console.log('EXECUTE:', JSON.stringify(decision));
}

main().catch(e => { console.error('[director] Fatal:', e); process.exit(1); });
```

- [ ] **Step 3: Manual test**

```
node autonomous/director.js
```
Expected: prints `[director] Session start:`, state, decision, and `EXECUTE: {...}`

- [ ] **Step 4: Commit**

```bash
git add autonomous/director.js autonomous/DIRECTOR_PROMPT.md
git commit -m "feat: autonomous director skeleton — reads feedback, decides, signals action"
```

---

### Task 4: Session-start hook

The director needs to fire automatically when a Claude Code session opens in this directory. Claude Code supports `hooks` — shell commands that run on session events.

**Files:**
- Modify: `.claude/settings.json` (create if absent)

- [ ] **Step 1: Check current settings**

```bash
cat .claude/settings.json 2>/dev/null || echo "not found"
```

- [ ] **Step 2: Add session-start hook**

The hook runs `node autonomous/director.js` and pipes output into the conversation context as a system message. Claude Code then reads `EXECUTE: {...}` and acts on it per `DIRECTOR_PROMPT.md`.

Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node autonomous/director.js"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Verify hook fires**

Open a new Claude Code session in the working directory. The session start output should include director output (`[director] Session start: ...`).

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: session-start hook fires autonomous director"
```

---

### Task 5: Token-limit recovery

When a session ends mid-task (token limit), the next session must resume cleanly.

**Files:**
- Modify: `autonomous/director.js` (already handles `currentTask` resume)
- Create: `autonomous/RESUME_PROMPT.md`

- [ ] **Step 1: Write `autonomous/RESUME_PROMPT.md`**

```markdown
# Resume Protocol

If the session-start output contains `RESUME_TASK: {...}`, resume that task:

1. Read the task JSON
2. If `action = fix`: read the target game, determine how far the fix got (git log, git diff), continue
3. If `action = new_game`: check if the new game HTML file was started (Glob *.html), continue from where the plan left off
4. Once complete: run tests, push, then write `autonomous/state.json` with `"currentTask": null`

After completing: print `TASK_COMPLETE` so the hook system records success.
```

- [ ] **Step 2: Update director to clear task on completion signal**

Add to `autonomous/director.js` after the `EXECUTE` print:

```js
// Listen for TASK_COMPLETE signal (printed by the Claude session on finish)
// This script reruns at next session start — if currentTask is null, it was cleared.
// The Claude session itself writes state.json with currentTask: null on completion.
```

The Claude session that executes the task is responsible for calling:
```js
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('autonomous/state.json', 'utf8'));
state.currentTask = null;
fs.writeFileSync('autonomous/state.json', JSON.stringify(state, null, 2));
```

- [ ] **Step 3: Commit**

```bash
git add autonomous/RESUME_PROMPT.md
git commit -m "feat: resume protocol for mid-session token-limit recovery"
```

---

### Task 6: End-to-end manual test

Before declaring the system autonomous, run a full dry-run cycle manually.

- [ ] **Step 1: Set FORMSPREE_API_KEY**

```bash
export FORMSPREE_API_KEY=<your key from formspree.io dashboard>
```

- [ ] **Step 2: Run director**

```
node autonomous/director.js
```
Verify: decision printed, `autonomous/state.json` updated with `currentTask`

- [ ] **Step 3: Simulate execution**

Read the `EXECUTE:` output. Manually invoke the action it describes (e.g., if `fix`, apply a trivial change to the target game and push).

- [ ] **Step 4: Clear task and rerun**

```js
// In Node REPL or a one-liner:
const s = JSON.parse(require('fs').readFileSync('autonomous/state.json'));
s.currentTask = null;
require('fs').writeFileSync('autonomous/state.json', JSON.stringify(s, null, 2));
```

```
node autonomous/director.js
```
Verify: `currentTask` is null, director picks next action.

- [ ] **Step 5: Commit final state**

```bash
git add autonomous/state.json
git commit -m "chore: autonomous system verified — state.json baseline"
git push
```

---

## What This Does NOT Do (Out of Scope)

- **Scheduled wakeup without a human opening Claude Code** — the hook fires when a session opens, not on a timer. For fully unattended operation, the user would need to schedule `claude` CLI invocations via Windows Task Scheduler or a cloud cron. That's a separate setup step documented in `autonomous/SCHEDULING.md` if needed.
- **Autonomous spending / billing** — the system uses only session tokens. It cannot purchase more. When a session ends, work stops until the next session opens.
- **Selecting which game to build next** — the decision engine picks "new game" when there's no actionable feedback, but the actual game concept is determined by the Claude session reading the knowledge base and feedback themes. The director does not pre-select genre or mechanic.

---

## Remaining Manual Pieces

1. Get your Formspree API key from formspree.io dashboard → Settings → API Keys. Set as env var or add to `.env` (gitignored).
2. First time: run `node autonomous/director.js` manually to verify connectivity.
3. The system is then self-sustaining: each new Claude Code session fires the director hook, reads feedback, and executes.
