# Resume Protocol

If the session-start output contains `RESUME_TASK: {...}`, a prior session ended before completing its task (token limit). Resume it.

## Steps

1. Parse the task JSON from `RESUME_TASK:` output — note `action` and `target`
2. Run `git log --oneline -5` to see what was committed last session
3. Run `Glob *.html` to find any partially-written game file
4. Determine how far the prior session got:
   - If the game HTML exists and has `<script>` content → game was written; check if tests pass
   - If the game HTML exists but is minimal/empty → game was started; read it and continue
   - If no game HTML → start from scratch (pick up at game concept)
5. Continue from the earliest incomplete step — do not redo completed work
6. When done: follow the same commit/push/state-clear steps from DIRECTOR_PROMPT.md

## Clearing the Task

When a task completes successfully, write to `autonomous/state.json`:

```js
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('autonomous/state.json', 'utf8'));
state.currentTask = null;
if (action === 'new_game') {
  state.gamesBuilt += 1;
  state.lastGameTitle = '<new game title>';
}
state.lastRunAt = new Date().toISOString();
fs.writeFileSync('autonomous/state.json', JSON.stringify(state, null, 2));
```

Run this via Bash or write it as a one-liner — do not leave `currentTask` non-null after success.
