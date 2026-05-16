// Run the full test suite for this project.
//
// Usage:
//   node run-all-tests.js              → website tests + all game tests
//   node run-all-tests.js --website    → website tests only (fast, ~10s)
//   node run-all-tests.js --game smoke-signal → single game test
//   node run-all-tests.js --recent 5   → website + 5 most recently modified game tests
//
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function getGameTestFiles() {
  return fs.readdirSync(ROOT)
    .filter(f => f.startsWith('test-') && f.endsWith('.js') && f !== 'test-website.js')
    .map(f => path.join(ROOT, f));
}

function runTest(file) {
  const label = path.basename(file);
  const result = spawnSync('node', [file], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const ok = result.status === 0;
  const lines = (result.stdout || '').split('\n');
  const summary = lines.filter(l => /Result|passed|failed/i.test(l)).join(' ').trim();
  return { label, ok, summary, output: result.stdout + (result.stderr || '') };
}

const args = process.argv.slice(2);
const websiteOnly  = args.includes('--website');
const recentIdx    = args.indexOf('--recent');
const recentCount  = recentIdx >= 0 ? parseInt(args[recentIdx + 1], 10) || 5 : 0;
const gameIdx      = args.indexOf('--game');
const singleGame   = gameIdx >= 0 ? args[gameIdx + 1] : null;

let gameFiles = [];
if (!websiteOnly) {
  if (singleGame) {
    const f = path.join(ROOT, `test-${singleGame}.js`);
    if (!fs.existsSync(f)) { console.error(`No test file: ${f}`); process.exit(1); }
    gameFiles = [f];
  } else {
    gameFiles = getGameTestFiles();
    if (recentCount > 0) {
      gameFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      gameFiles = gameFiles.slice(0, recentCount);
    }
  }
}

const allFiles = [path.join(ROOT, 'test-website.js'), ...gameFiles];
const total = allFiles.length;
let passed = 0, failed = 0;

console.log(`\nRunning ${total} test file(s)...\n${'─'.repeat(60)}`);

for (const file of allFiles) {
  process.stdout.write(path.basename(file).padEnd(42));
  const { ok, summary, output } = runTest(file);
  if (ok) {
    passed++;
    console.log('  OK   ' + summary);
  } else {
    failed++;
    console.log('  FAIL ' + summary);
    // Print failing lines for context
    output.split('\n')
      .filter(l => /FAIL:|Error:|error/i.test(l))
      .slice(0, 5)
      .forEach(l => console.log('         ' + l.trim()));
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${total} file(s)`);
if (failed > 0) {
  console.log('Re-run a specific test: node run-all-tests.js --game <slug>');
  process.exit(1);
}
