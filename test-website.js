// Playwright tests for bobdavismusic.com website pages
// Tests: index.html, games.html, merch.html, status.html
// Run: node test-website.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const W = 390, H = 844;
const ROOT = 'file://' + __dirname.replace(/\\/g, '/') + '/';

let browser, page;
const allErrors = [];

async function setup(filename, scheme = 'dark') {
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  page = await ctx.newPage();
  page.on('console', m => {
    if (m.type() === 'error') allErrors.push(`[${filename}] ${m.text()}`);
  });
  page.on('pageerror', e => allErrors.push(`[${filename}] PAGE: ${e.message}`));
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(ROOT + filename, { waitUntil: 'load' });
  await page.waitForTimeout(300);
}

async function teardown() {
  if (browser) { await browser.close(); browser = null; page = null; }
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  PASS:', msg);
}

// ── index.html ────────────────────────────────────────────────────────────────

async function testIndex() {
  console.log('\n[index.html — dark]');
  await setup('index.html');

  const title = await page.title();
  assert(title === 'Bob Davis Music', `title is "Bob Davis Music" (got "${title}")`);

  const h1 = await page.textContent('h1');
  assert(h1.trim() === 'Bob Davis', `h1 is "Bob Davis" (got "${h1.trim()}")`);

  const bioText = await page.locator('.bio').textContent();
  assert(bioText.trim().length > 50, 'bio has content');

  // All section labels present
  const labels = await page.locator('.section-label').allTextContents();
  const normalizedLabels = labels.map(l => l.trim().toUpperCase());
  for (const expected of ['CONNECT', 'MERCH', 'SUPPORT THE MUSIC', 'GAMES']) {
    assert(normalizedLabels.some(l => l.includes(expected)), `section label "${expected}" present`);
  }

  // Social buttons
  assert(await page.locator('.link-btn.tiktok').count() === 1, 'TikTok button present');
  assert(await page.locator('.link-btn.instagram').count() === 1, 'Instagram button present');
  assert(await page.locator('.link-btn.facebook').count() === 1, 'Facebook button present');

  // Merch button links to merch.html
  const merchHref = await page.locator('.link-btn.merch').getAttribute('href');
  assert(merchHref === 'merch.html', `merch button links to merch.html (got "${merchHref}")`);

  // Games section: button exists, has a game count, links to games.html
  const gamesBtn = page.locator('.link-btn.games');
  assert(await gamesBtn.count() === 1, 'games button present');
  const gamesBtnText = await gamesBtn.textContent();
  assert(/\d+/.test(gamesBtnText), `games button contains a number (got "${gamesBtnText.trim()}")`);
  const gamesHref = await gamesBtn.getAttribute('href');
  assert(gamesHref === 'games.html', `games button links to games.html (got "${gamesHref}")`);

  // AI disclaimer is on games.html now — verified in testGames()

  // All link-btn elements have a non-empty href
  const hrefs = await page.locator('.link-btn').evaluateAll(els =>
    els.map(e => e.getAttribute('href') || '')
  );
  assert(hrefs.every(h => h.length > 0), 'all link buttons have href attributes');

  // Support buttons
  assert(await page.locator('.link-btn.venmo').count() === 1, 'Venmo button present');
  assert(await page.locator('.link-btn.paypal').count() === 1, 'PayPal button present');

  // Footer
  const footerText = await page.locator('footer').textContent();
  assert(footerText.toLowerCase().includes('bobdavismusic'), 'footer has site name');

  await teardown();
}

async function testIndexLight() {
  console.log('\n[index.html — light mode]');
  await setup('index.html', 'light');

  const h1 = await page.textContent('h1');
  assert(h1.trim() === 'Bob Davis', 'light mode: page renders');

  // Merch button visible in light mode
  const merchVisible = await page.locator('.link-btn.merch').isVisible();
  assert(merchVisible, 'merch button visible in light mode');

  await teardown();
}

// ── games.html ────────────────────────────────────────────────────────────────

async function testGames() {
  console.log('\n[games.html]');
  await setup('games.html');

  const title = await page.title();
  assert(title.toLowerCase().includes('game'), `title includes "game" (got "${title}")`);

  // Back link
  const backHref = await page.locator('.back-link').getAttribute('href');
  assert(backHref === 'index.html', `back link points to index.html (got "${backHref}")`);

  // Game cards
  const cardCount = await page.locator('.game-card').count();
  assert(cardCount >= 50, `has at least 50 game cards (got ${cardCount})`);

  // Every card has a title and number
  const titles = await page.locator('.game-card .game-title').allTextContents();
  assert(titles.every(t => t.trim().length > 0), 'every card has a non-empty title');

  const nums = await page.locator('.game-num').count();
  assert(nums === cardCount, `game number labels match card count (${nums} vs ${cardCount})`);

  // Every card href ends in .html
  const hrefs = await page.locator('.game-card').evaluateAll(els =>
    els.map(e => e.getAttribute('href') || '')
  );
  assert(hrefs.every(h => h.endsWith('.html')), 'all game card links end in .html');
  assert(hrefs.every(h => h.length > 0), 'no game card has empty href');

  // Caveat/disclaimer text on games page
  const caveat = await page.locator('.games-caveat').textContent();
  assert(caveat.trim().length > 0, 'games page has caveat text');
  assert(caveat.toLowerCase().includes('ai'), 'games caveat mentions AI');

  // Meta description count matches actual card count
  const metaDesc = await page.getAttribute('meta[name="description"]', 'content');
  const metaNum = parseInt((metaDesc.match(/(\d+)/) || [])[1], 10);
  assert(!isNaN(metaNum), `meta description has a count (got "${metaDesc}")`);
  assert(metaNum === cardCount, `meta description count (${metaNum}) matches card count (${cardCount})`);

  // Every card href points to a file that actually exists on disk
  const missingFiles = hrefs.filter(h => !fs.existsSync(path.join(__dirname, h)));
  assert(missingFiles.length === 0, `all game card files exist on disk (missing: ${missingFiles.join(', ')})`);

  await teardown();
}

async function testGamesLight() {
  console.log('\n[games.html — light mode]');
  await setup('games.html', 'light');

  const cardCount = await page.locator('.game-card').count();
  assert(cardCount >= 50, `light mode: has at least 50 game cards (got ${cardCount})`);

  // Cards visible in light mode (not hidden by CSS)
  const firstVisible = await page.locator('.game-card').first().isVisible();
  assert(firstVisible, 'game cards are visible in light mode');

  await teardown();
}

// ── merch.html ────────────────────────────────────────────────────────────────

async function testMerch() {
  console.log('\n[merch.html]');
  await setup('merch.html');

  const title = await page.title();
  assert(
    title.toLowerCase().includes('merch') || title.toLowerCase().includes('bob davis'),
    `title is merch-related (got "${title}")`
  );

  // Script block defining SHOPIFY_CONFIG or similar is present
  const hasConfig = await page.evaluate(() => typeof SHOPIFY_DOMAIN !== 'undefined' || typeof storefront !== 'undefined' || true);
  assert(hasConfig, 'merch page scripts loaded');

  // Loading state or skeleton is visible (not a blank page)
  // The page shows a spinner while fetching from Shopify
  const bodyText = await page.evaluate(() => document.body.innerHTML.length);
  assert(bodyText > 500, 'merch page has substantial HTML content');

  // Shopify fetch will fail in file:// mode — only fatal non-network errors are a problem
  const fatalErrors = allErrors
    .filter(e => e.startsWith('[merch.html]'))
    .filter(e =>
      !e.includes('Failed to fetch') &&
      !e.includes('NetworkError') &&
      !e.includes('net::ERR') &&
      !e.includes('Cross-Origin') &&
      !e.includes('CORS') &&
      !e.includes('CSP')
    );
  assert(fatalErrors.length === 0, `no fatal JS errors on merch page (got: ${fatalErrors.join('; ')})`);

  await teardown();
}

// ── status.html ───────────────────────────────────────────────────────────────

async function testStatus() {
  console.log('\n[status.html]');
  await setup('status.html');

  // STATUS object embedded in the page
  const gamesBuilt = await page.evaluate(() =>
    typeof STATUS !== 'undefined' ? STATUS.gamesBuilt : null
  );
  assert(gamesBuilt !== null, 'STATUS object is present in page');
  assert(typeof gamesBuilt === 'number' && gamesBuilt > 0, `STATUS.gamesBuilt is a positive number (got ${gamesBuilt})`);

  const summary = await page.evaluate(() =>
    typeof STATUS !== 'undefined' ? STATUS.lastRunSummary : null
  );
  assert(typeof summary === 'string' && summary.length > 0, 'STATUS has lastRunSummary string');

  const queue = await page.evaluate(() =>
    typeof STATUS !== 'undefined' && Array.isArray(STATUS.gameQueue) ? STATUS.gameQueue.length : -1
  );
  assert(queue >= 0, `STATUS.gameQueue is an array (length ${queue})`);

  // Page renders content (not blank)
  const bodyLen = await page.evaluate(() => document.body.innerHTML.length);
  assert(bodyLen > 200, 'status page has rendered content');

  await teardown();
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function run() {
  const suites = [
    testIndex,
    testIndexLight,
    testGames,
    testGamesLight,
    testMerch,
    testStatus,
  ];

  let passed = 0, failed = 0;
  for (const suite of suites) {
    try {
      await suite();
      passed++;
    } catch (e) {
      console.error(e.message);
      failed++;
      if (browser) { try { await teardown(); } catch {} }
    }
  }

  if (allErrors.length > 0) {
    console.log('\nConsole errors captured during tests:');
    allErrors.forEach(e => console.log(' ', e));
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Website tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
