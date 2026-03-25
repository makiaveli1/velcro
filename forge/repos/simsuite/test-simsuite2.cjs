/**
 * SimSuite UI Inspector v2 — Uses Playwright to connect and inspect
 * Run from WSL: cd /mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort && node test-simsuite2.cjs
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

const EXE = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/src-tauri/target/debug/simsuite.exe';
const PORT = 9224;
const APP_URL = `http://localhost:${PORT}`;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${APP_URL}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.setTimeout(8000);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🔍 SimSuite UI Inspector\n');

  // Kill existing
  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  await sleep(1500);

  // Launch with remote debug (use WSL path directly for Windows exe)
  console.log('🚀 Launching SimSuite...');
  console.log('   Exe:', EXE);

  spawn(EXE, [`--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  await sleep(7000);

  // Get CDP target
  let targets;
  try { targets = await httpGet('/json'); } catch (e) {
    console.log(`❌ Cannot connect to CDP on port ${PORT}: ${e.message}`);
    try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
    process.exit(1);
  }
  if (!targets || targets.length === 0) { console.log('❌ No CDP targets found'); process.exit(1); }

  const pageUrl = targets[0].url;
  console.log(`✅ CDP accessible — target: ${pageUrl.substring(0, 80)}\n`);

  // Use playwright to connect
  let pw;
  try { pw = require('playwright'); } catch { console.log('❌ Playwright not found'); process.exit(1); }

  // Extract WebSocket URL
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const m = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  if (!m) { console.log('❌ Invalid WebSocket URL'); process.exit(1); }
  const wsHost = m[1];
  const wsPort = m[2];

  let browser;
  try {
    browser = await pw.chromium.connectOverCDP(`ws://${wsHost}:${wsPort}/`);
    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();
    await sleep(3000);

    // Run inspection via page.evaluate
    const report = await page.evaluate(() => {
      const r = {};

      const selectors = [
        '.downloads-shell',
        '.downloads-rail-shell',
        '.downloads-stage',
        '.downloads-lane-button',
        '.downloads-item-row',
        '.downloads-casual-drawer',
        '.downloads-casual-backdrop',
        '.downloads-top-strip',
        '.downloads-stage-split',
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) { r[sel] = { found: false }; continue; }
        const style = window.getComputedStyle(el);
        const box = el.getBoundingClientRect();
        r[sel] = {
          found: true,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          zIndex: style.zIndex,
          position: style.position,
          width: Math.round(box.width),
          height: Math.round(box.height),
          top: Math.round(box.top),
          left: Math.round(box.left),
        };
      }

      r._laneCount = document.querySelectorAll('.downloads-lane-button').length;
      const activeBefore = document.querySelector('.downloads-lane-button.is-active');
      r._activeBefore = activeBefore ? activeBefore.textContent.trim().substring(0, 40) : 'none';

      return r;
    });

    console.log('📊 DOM Inspection Results:\n');
    for (const [sel, data] of Object.entries(report)) {
      if (sel.startsWith('_')) continue;
      if (!data.found) {
        console.log(`  ❌ ${sel}: NOT FOUND`);
      } else {
        const issues = [];
        if (data.display === 'none') issues.push('display:none');
        if (data.visibility === 'hidden') issues.push('visibility:hidden');
        if (data.opacity === '0') issues.push('opacity:0');
        if (data.pointerEvents === 'none') issues.push('pointer-events:none');
        if (data.zIndex < 0) issues.push(`z-index:${data.zIndex}`);
        const status = issues.length > 0 ? '⚠️  ' + issues.join(', ') : '✅ visible';
        console.log(`  ${sel}: ${status}`);
        console.log(`    size: ${data.width}x${data.height} at (${data.left},${data.top})`);
      }
    }

    console.log(`\n  Lane buttons: ${report._laneCount}`);
    console.log(`  Active lane: "${report._activeBefore}"`);

    // Try clicking second lane button via JS
    console.log('\n🖱️ Attempting lane button click...');
    const clickResult = await page.evaluate(() => {
      const btns = document.querySelectorAll('.downloads-lane-button');
      if (btns.length < 2) return { error: 'not enough buttons' };
      const target = btns[1];
      const before = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      target.click();
      return { clicked: target.textContent.trim().substring(0, 40), before };
    });

    if (clickResult.error) {
      console.log(`  ❌ ${clickResult.error}`);
    } else {
      console.log(`  Clicked: "${clickResult.clicked}"`);
      await sleep(1500);
      const activeAfter = await page.evaluate(() =>
        document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none'
      );
      console.log(`  Active after click: "${activeAfter}"`);
      const changed = activeAfter !== clickResult.before;
      console.log(changed ? '  ✅ Lane changed!' : `  ❌ Lane did NOT change`);
    }

    // Console errors
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await sleep(2000);
    console.log('\n📋 Console errors:');
    if (errors.length === 0) {
      console.log('  ✅ No errors');
    } else {
      errors.slice(0, 5).forEach(e => console.log('  ❌', e.substring(0, 200)));
    }

    await browser.close();

  } catch (err) {
    console.log('❌ Error:', err.message);
    if (browser) await browser.close().catch(() => {});
  }

  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  console.log('\n--- Done ---');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  try { execSync(`taskkill /F /IM SimSuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  process.exit(1);
});
