const https = require('https');
const fs = require('fs');

const STATE_FILE = __dirname + '/state.json';
const FORM_ID = 'xdayvnvo';

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastFeedbackId: null }; }
}

function fetchNewFeedback() {
  const apiKey = process.env.FORMSPREE_API_KEY || '';
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
            console.warn('[feedback] No API key or invalid key — skipping feedback fetch');
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

module.exports = { fetchNewFeedback };
