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

  // Resume incomplete task if one exists from a prior session
  if (state.currentTask) {
    console.log('[director] Resuming incomplete task from prior session');
    console.log('RESUME_TASK:', JSON.stringify(state.currentTask));
    return;
  }

  // Fetch new feedback since last run
  let feedback = [];
  try {
    feedback = await fetchNewFeedback();
    console.log('[director] Fetched', feedback.length, 'new feedback item(s)');
  } catch(e) {
    console.warn('[director] Could not fetch feedback:', e.message);
  }

  // Persist the highest feedback ID seen so we don't re-process old submissions
  if (feedback.length > 0) {
    const lastId = Math.max(...feedback.map(f => f.id));
    writeState({ lastFeedbackId: lastId });
  }

  const decision = classifyAndDecide(feedback, state);
  console.log('[director] Decision:', JSON.stringify(decision, null, 2));

  // Save current task so a mid-session token limit doesn't lose work
  writeState({ currentTask: decision });

  // Signal to the Claude Code session what to do
  // The session reads DIRECTOR_PROMPT.md and acts on this output
  console.log('\nEXECUTE:', JSON.stringify(decision));
  console.log('\n[director] See autonomous/DIRECTOR_PROMPT.md for execution instructions.');
}

main().catch(e => {
  console.error('[director] Fatal error:', e);
  process.exit(1);
});
