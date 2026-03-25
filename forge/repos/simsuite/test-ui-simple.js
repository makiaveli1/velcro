/**
 * SimSuite UI Test - Direct Launch with Playwright
 * Tests: lane buttons clickability, page load, console errors
 */

const { chromium } = require('playwright');
const path = require('path');

const EXE_PATH = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\bundle\\msi\\SimSuite.exe';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 SimSuite UI Test');
  console.log('   Exe:', EXE_PATH);

  const browser = await chromium.launch({
    executablePath: EXE_PATH,
    headless: false,
    args: ['--remote-debugging-port=9222'],
  });

  console.log('✅ App launched');

  await sleep(5000); // Wait for app to fully load

  const context = browser.contexts()[0];
  const page = context.pages()[0];
  console.log('✅ Page connected:', page.url());

  // Check content
  const content = await page.content();
  const hasDownloads = content.includes('downloads') || content.includes('Downloads');
  console.log(hasDownloads ? '✅ Downloads content present' : '❌ No downloads content');

  // Check for lane buttons
  const laneCount = await page.locator('.downloads-lane-button').count();
  console.log(`   Lane buttons: ${laneCount}`);

  // Try clicking lane buttons
  if (laneCount > 0) {
    // Get initial active lane
    const activeBefore = await page.locator('.downloads-lane-button.is-active').textContent().catch(() => 'none');
    console.log(`   Active lane before: ${activeBefore.trim()}`);

    // Click the first non-active lane button
    const firstInactive = page.locator('.downloads-lane-button:not(.is-active)').first();
    const laneName = await firstInactive.textContent();
    console.log(`   Clicking: ${laneName.trim()}`);
    await firstInactive.click();
    await sleep(1000);

    const activeAfter = await page.locator('.downloads-lane-button.is-active').textContent().catch(() => 'none');
    const changed = activeAfter !== activeBefore;
    console.log(changed ? '✅ Lane changed!' : `❌ Lane unchanged (still: ${activeAfter.trim()})`);
  }

  // Check for queue items
  const queueCount = await page.locator('.downloads-item-row').count();
  console.log(`   Queue items visible: ${queueCount}`);

  // Report console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await sleep(2000);

  if (errors.length > 0) {
    console.log(`\n❌ Console errors (${errors.length}):`);
    errors.slice(0, 5).forEach(e => console.log('  -', e.substring(0, 200)));
  } else {
    console.log('\n✅ No console errors');
  }

  await sleep(1000);
  await browser.close();
  console.log('\n--- Done ---');
}

main().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
