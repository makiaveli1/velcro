/**
 * SimSuite UI Smoke Test
 * Tests the Downloads inbox for:
 * 1. Page loads without crashes
 * 2. Lane buttons are clickable and change the active lane
 * 3. No console errors (Error level)
 * 4. Queue items are visible
 */

const { chromium } = require('playwright');
const path = require('path');

const EXE_PATH = path.join(
  __dirname,
  'src-tauri/target/debug/bundle/msi/SimSuite.exe'
);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🚀 Starting SimSuite UI test...');
  console.log(`   Executable: ${EXE_PATH}`);

  let browser;
  try {
    // Launch the Tauri app
    browser = await chromium.launch({
      executablePath: EXE_PATH,
      headless: false, // Tauri apps need a visible window
      args: ['--devtools'], // Enable DevTools for CDP connection
    });

    console.log('✅ App launched');

    // Wait for the app to initialize
    await sleep(4000);

    // Connect to the first page (Downloads screen)
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    console.log('✅ Connected to app page');

    // Test 1: Check if the page loaded (check for Downloads content)
    const pageContent = await page.content();
    const hasDownloads = pageContent.includes('Downloads') || pageContent.includes('downloads');
    console.log(`   Page has Downloads content: ${hasDownloads ? '✅' : '❌'}`);

    // Test 2: Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await sleep(2000);

    // Test 3: Try clicking a lane button
    // Find lane buttons by their text content
    const laneButtons = await page.locator('.downloads-lane-button').all();
    console.log(`   Found ${laneButtons.length} lane buttons`);

    if (laneButtons.length > 0) {
      // Get initial lane
      const initialLanes = await page.locator('.downloads-lane-button.is-active').all();
      const initialLaneName = initialLanes.length > 0
        ? await initialLanes[0].textContent()
        : 'none';

      console.log(`   Initial active lane: ${initialLaneName.trim()}`);

      // Try clicking a different lane
      const targetLane = laneButtons[1]; // Second lane button
      const targetLaneName = await targetLane.textContent();
      console.log(`   Clicking lane: ${targetLaneName.trim()}`);

      await targetLane.click();
      await sleep(1000);

      // Check if the lane changed
      const newActiveLanes = await page.locator('.downloads-lane-button.is-active').all();
      const newLaneName = newActiveLanes.length > 0
        ? await newActiveLanes[0].textContent()
        : 'none';

      const laneChanged = newLaneName !== initialLaneName;
      console.log(`   Lane changed: ${laneChanged ? '✅' : '❌ (still ' + newLaneName.trim() + ')'}`);
    }

    // Test 4: Check for queue items
    const queueItems = await page.locator('.downloads-item-row').all();
    console.log(`   Found ${queueItems.length} queue items`);

    // Report errors
    if (errors.length > 0) {
      console.log(`\n❌ Console errors (${errors.length}):`);
      errors.forEach(e => console.log(`   - ${e}`));
    } else {
      console.log('\n✅ No console errors');
    }

    console.log('\n--- Test Complete ---');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runTests();
