const https = require('https');
const fs = require('fs');

const STATE_FILE = __dirname + '/state.json';
const INBOX_FILE = __dirname + '/feedback-inbox.json';
const FORM_ID = 'xdayvnvo';

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastFeedbackId: null }; }
}

// Read and drain the local inbox file.
// Format: array of { game, rating, feedback, score } objects.
// After reading, the file is cleared so items aren't processed twice.
function drainInbox() {
  try {
    const items = JSON.parse(fs.readFileSync(INBOX_FILE, 'utf8'));
    if (!Array.isArray(items) || items.length === 0) return [];
    // Clear the inbox
    fs.writeFileSync(INBOX_FILE, '[]');
    console.log('[feedback] Drained', items.length, 'item(s) from inbox file');
    return items.map((item, i) => ({
      id: Date.now() + i,
      game: item.game || 'unknown',
      rating: parseInt(item.rating || '0', 10),
      feedback: item.feedback || '',
      score: parseInt(item.score || '0', 10),
      submittedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// Fetch from Formspree API if a key is available (paid plan required).
function fetchFromFormspree() {
  const apiKey = process.env.FORMSPREE_API_KEY || '';
  if (!apiKey) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'formspree.io',
      path: `/api/0/forms/${FORM_ID}/submissions`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    };
    const req = https.get(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          if (res.statusCode === 401) {
            console.warn('[feedback] Formspree key invalid — skipping API fetch');
            resolve([]);
            return;
          }
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
    });
    req.on('error', reject);
  });
}

async function fetchNewFeedback() {
  const inbox = drainInbox();
  const api = await fetchFromFormspree();
  return [...inbox, ...api];
}

module.exports = { fetchNewFeedback };
