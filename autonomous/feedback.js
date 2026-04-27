const https = require('https');
const fs = require('fs');
const path = require('path');

const INBOX_FILE = __dirname + '/feedback-inbox.json';
const URL_FILE   = __dirname + '/feedback-url.txt';

function getFeedbackUrl() {
  try { return fs.readFileSync(URL_FILE, 'utf8').trim(); }
  catch { return null; }
}

// Read and drain the local inbox (manual override path).
function drainInbox() {
  try {
    const items = JSON.parse(fs.readFileSync(INBOX_FILE, 'utf8'));
    if (!Array.isArray(items) || items.length === 0) return [];
    fs.writeFileSync(INBOX_FILE, '[]');
    console.log('[feedback] Drained', items.length, 'item(s) from inbox file');
    return items.map((item, i) => ({
      id: Date.now() + i,
      game:         item.game || 'general',
      rating:       parseInt(item.rating || '0', 10),
      message:      item.message || item.feedback || '',
      score:        parseInt(item.score || '0', 10),
      fixRequested: !!item.fixRequested,
      submittedAt:  new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// Fetch unread submissions from Google Apps Script endpoint.
// The endpoint marks items as read server-side after returning them.
function fetchFromSheet() {
  const url = getFeedbackUrl();
  if (!url) {
    console.log('[feedback] No feedback-url.txt found — skipping sheet fetch');
    return Promise.resolve([]);
  }

  const parsed = new URL(url);
  return new Promise((resolve) => {
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      headers:  { 'Accept': 'application/json' },
    };
    https.get(options, res => {
      // Apps Script redirects to script.googleusercontent.com — follow manually
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectParsed = new URL(res.headers.location);
        https.get({
          hostname: redirectParsed.hostname,
          path:     redirectParsed.pathname + redirectParsed.search,
          headers:  { 'Accept': 'application/json' },
        }, res2 => {
          let body = '';
          res2.on('data', d => body += d);
          res2.on('end', () => {
            try { resolve(parseItems(JSON.parse(body))); }
            catch { console.warn('[feedback] Sheet parse error'); resolve([]); }
          });
        }).on('error', () => resolve([]));
        return;
      }
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(parseItems(JSON.parse(body))); }
        catch { console.warn('[feedback] Sheet parse error'); resolve([]); }
      });
    }).on('error', () => { console.warn('[feedback] Sheet fetch failed'); resolve([]); });
  });
}

function parseItems(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r, i) => ({
    id:           Date.now() + i,
    game:         r.game || 'general',
    rating:       parseInt(r.rating || '0', 10),
    message:      r.message || '',
    score:        parseInt(r.score || '0', 10),
    fixRequested: !!r.fixRequested,
    submittedAt:  r.submittedAt || new Date().toISOString(),
  }));
}

async function fetchNewFeedback() {
  const inbox = drainInbox();
  const sheet = await fetchFromSheet();
  const all = [...inbox, ...sheet];
  if (all.length) console.log('[feedback] Total items:', all.length);
  return all;
}

module.exports = { fetchNewFeedback };
