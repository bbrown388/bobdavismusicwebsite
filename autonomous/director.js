const fs = require('fs');
const path = require('path');
const { fetchNewFeedback } = require('./feedback');
const { classifyAndDecide } = require('./decision');

const STATE_FILE    = path.join(__dirname, 'state.json');
const FEEDBACK_FILE = path.join(__dirname, 'pending-feedback.json');

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

  // Write feedback to file so run.ps1 can dispatch a dedicated Claude session
  // to process it before the main game-building session starts.
  if (feedbackItems.length) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbackItems, null, 2));
    console.log('[director] Wrote', feedbackItems.length, 'item(s) to pending-feedback.json');
  } else {
    // Clear any stale file from a previous failed run
    try { fs.unlinkSync(FEEDBACK_FILE); } catch {}
  }

  if (state.currentTask) {
    console.log('[director] In-progress task found - will resume after feedback processing');
    console.log('RESUME_TASK:', JSON.stringify({ ...state.currentTask, feedbackItems }));
    return;
  }

  const decision = classifyAndDecide(feedback, state);
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
