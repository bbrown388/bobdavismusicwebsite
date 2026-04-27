const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { fetchNewFeedback } = require('./feedback');
const { classifyAndDecide } = require('./decision');

const ROOT       = path.join(__dirname, '..');
const STATE_FILE = path.join(__dirname, 'state.json');
const STATUS_FILE = path.join(__dirname, 'status.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastFeedbackId: null, gamesBuilt: 5, lastGameTitle: 'Outlaw Run', currentTask: null, lastRunAt: null }; }
}

function writeState(updates) {
  const current = readState();
  const next = { ...current, ...updates, lastRunAt: new Date().toISOString() };
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
}

function readStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); }
  catch { return {}; }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parses feedback messages for queue reorder instructions and applies them.
// Returns { remaining, dirty } where remaining = feedback items not consumed.
function applyQueueFeedback(feedbackItems, status) {
  const queue = status.gameQueue;
  if (!queue || !queue.length || !feedbackItems.length) {
    return { remaining: feedbackItems, dirty: false };
  }

  let q = [...queue];
  const remaining = [];
  let dirty = false;

  for (const item of feedbackItems) {
    const msg = (item.message || '').toLowerCase();
    let handled = false;

    for (const game of [...q]) {
      const t = escapeRe(game.title.toLowerCase());
      if (!msg.includes(game.title.toLowerCase())) continue;

      // "X next" / "X first" / "do X next" / "do X first"
      if (/\bnext\b/.test(msg) || /\bfirst\b/.test(msg)) {
        q = q.filter(g => g !== game);
        q.unshift(game);
        dirty = true;
        handled = true;
        console.log(`[director] QUEUE REORDER: "${game.title}" moved to front — feedback: "${item.message}"`);
        break;
      }

      // "X after Y" — Y may be in queue or already built (meaning front of queue)
      const afterMatch = msg.match(new RegExp(`${t}.*?\\bafter\\b([^.]+)`));
      if (afterMatch) {
        const afterText = afterMatch[1].trim();
        const pivot = q.find(g => g !== game && afterText.includes(g.title.toLowerCase()));
        if (pivot) {
          // Move game to immediately after pivot in queue
          q = q.filter(g => g !== game);
          const pivotIdx = q.indexOf(pivot);
          q.splice(pivotIdx + 1, 0, game);
          dirty = true;
          handled = true;
          console.log(`[director] QUEUE REORDER: "${game.title}" moved after "${pivot.title}" — feedback: "${item.message}"`);
        } else {
          // Pivot not in queue (already built or unknown) - treat as "move to front"
          q = q.filter(g => g !== game);
          q.unshift(game);
          dirty = true;
          handled = true;
          console.log(`[director] QUEUE REORDER: "${game.title}" moved to front (pivot not in queue) — feedback: "${item.message}"`);
        }
        break;
      }

      // "X before Y"
      const beforeMatch = msg.match(new RegExp(`${t}.*?\\bbefore\\b([^.]+)`));
      if (beforeMatch) {
        const beforeText = beforeMatch[1].trim();
        const pivot = q.find(g => g !== game && beforeText.includes(g.title.toLowerCase()));
        if (pivot) {
          q = q.filter(g => g !== game);
          const pivotIdx = q.indexOf(pivot);
          q.splice(pivotIdx, 0, game);
          dirty = true;
          handled = true;
          console.log(`[director] QUEUE REORDER: "${game.title}" moved before "${pivot.title}" — feedback: "${item.message}"`);
          break;
        }
      }
    }

    // "skip X" / "don't do X" / "remove X"
    if (!handled) {
      for (const game of [...q]) {
        const t = game.title.toLowerCase();
        if (!msg.includes(t)) continue;
        if (/\bskip\b/.test(msg) || /\bdon't do\b/.test(msg) || /\bdo not do\b/.test(msg) || /\bremove\b/.test(msg) || /\bcancel\b/.test(msg)) {
          q = q.filter(g => g !== game);
          dirty = true;
          handled = true;
          console.log(`[director] QUEUE REMOVE: "${game.title}" removed — feedback: "${item.message}"`);
          break;
        }
      }
    }

    if (!handled) {
      console.log(`[director] FEEDBACK PASS-THROUGH: "${item.message}" (game: ${item.game}, fixRequested: ${item.fixRequested})`);
      remaining.push(item);
    } else {
      console.log(`[director] FEEDBACK CONSUMED by queue logic: "${item.message}"`);
    }
  }

  if (dirty) {
    status.gameQueue = q;
    const pretty = JSON.stringify(status, null, 2);
    fs.writeFileSync(STATUS_FILE, pretty, 'utf8');
    fs.writeFileSync(path.join(ROOT, 'director-status.json'), pretty, 'utf8');
    let html = fs.readFileSync(path.join(ROOT, 'status.html'), 'utf8');
    html = html.replace(/^const STATUS = .*$/m, `const STATUS = ${JSON.stringify(status)};`);
    fs.writeFileSync(path.join(ROOT, 'status.html'), html, 'utf8');
    try {
      execSync('git add autonomous/status.json director-status.json status.html', { cwd: ROOT, stdio: 'pipe' });
      execSync('git commit -m "chore: reorder game queue per feedback"', { cwd: ROOT, stdio: 'pipe' });
      execSync('git push', { cwd: ROOT, stdio: 'pipe' });
      console.log('[director] Queue changes committed and pushed');
    } catch (e) {
      if (!e.message.includes('nothing to commit')) {
        console.warn('[director] Queue commit warning:', e.stderr ? e.stderr.toString().trim() : e.message);
      }
    }
  }

  return { remaining, dirty };
}

async function main() {
  console.log('[director] Session start:', new Date().toISOString());
  const state = readState();
  console.log('[director] State:', JSON.stringify(state));

  let feedback = [];
  try {
    feedback = await fetchNewFeedback();
    console.log('[director] Fetched', feedback.length, 'new feedback item(s)');
  } catch(e) {
    console.warn('[director] Could not fetch feedback:', e.message);
  }

  // Process queue reorder instructions before deciding action.
  // Items consumed here are not passed to Claude.
  const status = readStatus();
  const { remaining: feedbackForDecision, dirty } = applyQueueFeedback(feedback, status);
  if (dirty) {
    console.log('[director] Queue was reordered based on feedback');
  }
  if (feedback.length && !dirty) {
    console.log('[director] No queue instructions found in feedback - all items passed to Claude');
  }

  const feedbackItems = feedbackForDecision.map(i => ({
    game:         i.game || 'general',
    message:      i.message || '',
    fixRequested: i.fixRequested || false,
  }));

  if (state.currentTask) {
    console.log('[director] In-progress task found - evaluating feedback before resuming');
    console.log('RESUME_TASK:', JSON.stringify({ ...state.currentTask, feedbackItems }));
    return;
  }

  const decision = classifyAndDecide(feedbackForDecision, state);
  decision.feedbackItems = feedbackItems;
  console.log('[director] Decision:', JSON.stringify(decision, null, 2));

  writeState({ currentTask: decision });

  console.log('\nEXECUTE:', JSON.stringify(decision));
  console.log('\n[director] See autonomous/DIRECTOR_PROMPT.md for execution instructions.');
}

main().catch(e => {
  console.error('[director] Fatal error:', e);
  process.exit(1);
});
