/**
 * SimSuite UI Test - Connect to running Tauri app via CDP
 */

const { chromium } = require('playwright');

const CDP_URL = 'http://localhost:9222';

async function main() {
  console.log('🚀 SimSuite CDP Test');
  console.log('   Trying CDP endpoint:', CDP_URL);

  let browser;
  try {
    // Try to connect to running Tauri app via CDP
    const resp = await fetch(`${CDP_URL}/json`);
    if (!resp.ok) throw new Error(`CDP not accessible: ${resp.status}`);

    const targets = await resp.json();
    console.log('✅ CDP accessible, targets:', targets.length);
    if (targets.length > 0) {
      console.log('   First target:', targets[0].url);
    }

    // Connect via Playwright CDP
    const wsUrl = targets[0]?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error('No WebSocket URL found');

    browser = await chromium.connectOverCDP(`ws://localhost:${wsUrl.split('localhost:')[1].split('/')[0]}/`);
    console.log('✅ Connected via CDP');

    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();

    // Wait for content
    await page.waitForTimeout(3000);

    // Check for lane buttons
    const laneCount = await page.locator('.downloads-lane-button').count();
    console.log(`   Lane buttons: ${laneCount}`);

    if (laneCount > 0) {
      // Get active lane before
      let activeBefore = 'none';
      try {
        const activeEl = page.locator('.downloads-lane-button.is-active').first();
        activeBefore = await activeEl.textContent({ timeout: 2000 });
      } catch {}

      console.log(`   Active lane before: ${activeBefore.trim()}`);

      // Click second lane
      const secondLane = page.locator('.downloads-lane-button').nth(1);
      const laneName = await secondLane.textContent();
      console.log(`   Clicking: ${laneName.trim()}`);

      await secondLane.click({ timeout: 5000 });
      await page.waitForTimeout(1000);

      // Check if changed
      let activeAfter = 'none';
      try {
        const activeEl = page.locator('.downloads-lane-button.is-active').first();
        activeAfter = await activeEl.textContent({ timeout: 2000 });
      } catch {}

      const changed = activeAfter.trim() !== activeBefore.trim();
      console.log(changed ? '✅ Lane changed!' : `❌ Lane unchanged (still: ${activeAfter.trim()})`);
    }

    // Console errors
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.waitForTimeout(2000);

    console.log(errors.length ? `❌ Errors: ${errors.length}` : '✅ No errors');
    errors.slice(0, 3).forEach(e => console.log('  -', e.substring(0, 150)));

    await browser.close();

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (browser) await browser.close().catch(() => {});
  }
}

main();
