#!/usr/bin/env node
// autonomous/update-status.js
// Usage: node update-status.js '<json-patch>'
// Merges patch into status.json, writes all three status files, commits, pushes.
// Called by run.ps1 at session start/end and by the director at key checkpoints.

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT        = path.join(__dirname, '..');
const STATUS_FILE = path.join(__dirname, 'status.json');
const HTML_FILE   = path.join(ROOT, 'status.html');
const ROOT_JSON   = path.join(ROOT, 'director-status.json');

function readStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); }
  catch { return {}; }
}

function writeAll(status) {
  const compact = JSON.stringify(status);
  const pretty  = JSON.stringify(status, null, 2);

  fs.writeFileSync(STATUS_FILE, pretty);
  fs.writeFileSync(ROOT_JSON, pretty);

  // Replace the embedded const STATUS = {...}; line in status.html
  let html = fs.readFileSync(HTML_FILE, 'utf8');
  html = html.replace(/^const STATUS = .*$/m, `const STATUS = ${compact};`);
  fs.writeFileSync(HTML_FILE, html);
}

function gitPush(msg) {
  try {
    execSync('git add autonomous/status.json director-status.json status.html', { cwd: ROOT, stdio: 'pipe' });
    execSync(`git commit -m "${msg.replace(/"/g, "'")}"`, { cwd: ROOT, stdio: 'pipe' });
    execSync('git push', { cwd: ROOT, stdio: 'pipe' });
    console.log('[status] pushed:', msg);
  } catch (e) {
    // Nothing staged = no changes, that's fine
    if (!e.message.includes('nothing to commit')) {
      console.warn('[status] git warning:', e.stderr?.toString().trim() || e.message);
    }
  }
}

const patch = JSON.parse(process.argv[2] || '{}');
const current = readStatus();

// runLog is append-only — merge instead of replace
const newLog = patch.runLog;
const merged = { ...current, ...patch };
if (newLog) {
  merged.runLog = [...(current.runLog || []), ...newLog].slice(-20);
}

writeAll(merged);

const label = merged.currentTask
  ? (merged.currentTask.context || merged.currentTask.action || 'running')
  : 'idle';
gitPush(`chore: status — ${label}`);
