const fs = require('fs');
const { fetchNewFeedback } = require('./feedback');
const { classifyAndDecide } = require('./decision');

const STATE_FILE = __dirname + '/state.json';

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastFeedbackId: null, gamesBuilt: 5, lastGameTitle: 'Outlaw Run', currentTask: null, lastRunAt: null }; }
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

  // Always fetch feedback — applies even to resume scenarios.
  // The director reads feedback before deciding whether to resume, pivot, or reorder.
  let feedback = [];
  try {
    feedback = await fetchNewFeedback();
    console.log('[director] Fetched', feedback.length, 'new feedback item(s)');
  } catch(e) {
    console.warn('[director] Could not fetch feedback:', e.message);
  }

  const feedbackItems = feedback.map(i => ({
    game:         i.game || 'general',
    message:      i.message || '',
    fixRequested: i.fixRequested || false,
  }));

  // Resume incomplete task if one exists — but include feedback so director
  // can evaluate whether to continue, pivot, or requeue before resuming.
  if (state.currentTask) {
    console.log('[director] In-progress task found — evaluating feedback before resuming');
    console.log('RESUME_TASK:', JSON.stringify({ ...state.currentTask, feedbackItems }));
    return;
  }

  const decision = classifyAndDecide(feedback, state);
  decision.feedbackItems = feedbackItems;
  console.log('[director] Decision:', JSON.stringify(decision, null, 2));

  // Save current task so a mid-session token limit doesn't lose work
  writeState({ currentTask: decision });

  console.log('\nEXECUTE:', JSON.stringify(decision));
  console.log('\n[director] See autonomous/DIRECTOR_PROMPT.md for execution instructions.');
}

main().catch(e => {
  console.error('[director] Fatal error:', e);
  process.exit(1);
});
