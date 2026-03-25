/**
 * SimSuite UI Smoke Test
 * Launches app, connects via CDP, tests lane buttons
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

const EXE = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\bundle\\msi\\SimSuite.exe';
const PORT = 9222;
const APP_URL = `http://localhost:${PORT}`;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${APP_URL}${path}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    }).on('error', reject).setTimeout(5000);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 SimSuite UI Test');
  console.log('   Exe:', EXE);

  // Kill existing
  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore' }); } catch {}
  await sleep(1500);

  // Launch with remote debug
  console.log('   Launching...');
  const proc = spawn(EXE, [`--remote-debugging-port=${PORT}`], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  proc.unref();
  console.log('   PID:', proc.pid);

  // Wait for app
  await sleep(6000);
  if (proc.killed) { console.log('❌ App exited early'); process.exit(1); }

  // Check CDP
  let targets = [];
  try {
    targets = await httpGet('/json');
    console.log(`✅ CDP accessible — ${targets.length} target(s)`);
  } catch (e) {
    console.log(`❌ CDP not accessible: ${e.message}`);
    try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore' }); } catch {}
    process.exit(1);
  }

  const pageUrl = targets[0]?.url || 'unknown';
  console.log('   Page URL:', pageUrl.substring(0, 80));

  // Use playwright to connect
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    console.log('❌ Playwright not found');
    try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore' }); } catch {}
    process.exit(1);
  }

  const wsUrl = targets[0]?.webSocketDebuggerUrl;
  if (!wsUrl) {
    console.log('❌ No WebSocket URL');
    try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore' }); } catch {}
    process.exit(1);
  }

  // Extract host:port from wsUrl
  const wsMatch = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  const wsHost = wsMatch[1];
  const wsPort = wsMatch[2];
  const wsFullUrl = `ws://${wsHost}:${wsPort}/`;

  let browser;
  try {
    browser = await playwright.chromium.connectOverCDP(`ws://${wsHost}:${wsPort}/`);
    console.log('✅ Connected via CDP WebSocket');

    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();
    await sleep(3000);

    // Check content
    const html = await page.content();
    const hasContent = html.includes('downloads') || html.includes('Downloads');
    console.log(hasContent ? '✅ Page has downloads content' : '⚠️  No downloads content found');

    // Find lane buttons
    const lanes = await page.locator('.downloads-lane-button').count();
    console.log(`   Lane buttons: ${lanes}`);

    if (lanes > 0) {
      // Get active lane before click
      let before = 'none';
      try {
        const el = page.locator('.downloads-lane-button.is-active').first();
        before = await el.textContent({ timeout: 2000 });
      } catch {}

      console.log(`   Active before: "${before.trim()}"`);

      // Click second lane
      const secondLane = page.locator('.downloads-lane-button').nth(1);
      const laneName = await secondLane.textContent();
      console.log(`   Clicking: "${laneName.trim()}"`);

      await secondLane.click({ timeout: 5000, force: true });
      await sleep(1500);

      // Check active after
      let after = 'none';
      try {
        const el = page.locator('.downloads-lane-button.is-active').first();
        after = await el.textContent({ timeout: 2000 });
      } catch {}

      const changed = after.trim() !== before.trim();
      console.log(changed
        ? `✅ Lane changed → "${after.trim()}"`
        : `❌ Lane unchanged → "${after.trim()}" (was "${before.trim()}")`);
    }

    // Queue items
    const queueItems = await page.locator('.downloads-item-row').count();
    console.log(`   Queue items: ${queueItems}`);

    // Collect console errors
    const errors = [];
    const errHandler = m => { if (m.type() === 'error') errors.push(m.text()); };
    page.on('console', errHandler);
    await sleep(2000);

    if (errors.length > 0) {
      console.log(`❌ ${errors.length} console error(s):`);
      errors.slice(0, 5).forEach(e => console.log('   -', e.substring(0, 200)));
    } else {
      console.log('✅ No console errors');
    }

    await browser.close();

  } catch (err) {
    console.log('❌ Test error:', err.message);
    if (browser) await browser.close().catch(() => {});
  }

  // Cleanup
  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore' }); } catch {}
  console.log('\n--- Done ---');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
