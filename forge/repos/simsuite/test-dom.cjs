/**
 * SimSuite UI Inspector v5 — Uses WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS env var
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

const EXE_WIN = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\simsuite.exe';
const PORT = 9232;
const APP_URL = `http://localhost:${PORT}`;
const PS_PATH = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${APP_URL}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.setTimeout(10000);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function runCmd(cmd) {
  try { return execSync(`cmd.exe /c ${cmd}`, { windowsHide: true }).toString(); } catch { return ''; }
}

async function main() {
  console.log('🔍 SimSuite UI Inspector v5\n');

  // Kill existing
  runCmd(`taskkill /F /IM simsuite.exe`);
  await sleep(2000);

  // Launch with env var for CDP via PowerShell
  console.log('🚀 Launching SimSuite with CDP enabled...');
  const psScript = `$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=${PORT}"; Start-Process -FilePath "${EXE_WIN}" -NoNewWindow`;
  try {
    execSync(`cmd.exe /c powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`, { windowsHide: true, detached: true });
  } catch {} // May fail because detached, that's ok
  await sleep(1000);

  // Wait for CDP
  console.log('   Waiting for CDP...');
  let cdpReady = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try {
      const targets = await httpGet('/json');
      if (targets && targets.length > 0) {
        console.log(`   ✅ CDP ready after ${i+1}s`);
        cdpReady = true;
        break;
      }
    } catch {}
    process.stdout.write('.');
  }
  console.log('');
  if (!cdpReady) { console.log('❌ CDP not available'); process.exit(1); }

  const targets = await httpGet('/json');
  console.log(`   Target: ${targets[0].url}\n`);

  // Connect via Playwright CDP
  let pw;
  try { pw = require('playwright'); } catch { console.log('❌ Playwright not found'); process.exit(1); }

  const wsUrl = targets[0].webSocketDebuggerUrl;
  const m = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  if (!m) { console.log('❌ Invalid WS URL'); process.exit(1); }

  let browser;
  try {
    browser = await pw.chromium.connectOverCDP(`ws://${m[1]}:${m[2]}/`);
    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();
    await sleep(3000);

    // DOM inspection
    const report = await page.evaluate(() => {
      const r = {};
      const selectors = [
        '.downloads-shell', '.downloads-rail-shell', '.downloads-stage',
        '.downloads-lane-button', '.downloads-item-row',
        '.downloads-casual-drawer', '.downloads-casual-backdrop',
        '.downloads-top-strip', '.downloads-stage-split',
        '.downloads-queue-dock',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) { r[sel] = { found: false }; continue; }
        const s = window.getComputedStyle(el);
        const box = el.getBoundingClientRect();
        r[sel] = {
          found: true,
          display: s.display, visibility: s.visibility,
          opacity: s.opacity, pointerEvents: s.pointerEvents,
          zIndex: s.zIndex, position: s.position,
          w: Math.round(box.width), h: Math.round(box.height),
          x: Math.round(box.left), y: Math.round(box.top),
        };
      }
      r._laneCount = document.querySelectorAll('.downloads-lane-button').length;
      r._activeBefore = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      r._queueCount = document.querySelectorAll('.downloads-item-row').length;
      return r;
    });

    console.log('📊 DOM Results:\n');
    for (const [sel, d] of Object.entries(report)) {
      if (sel.startsWith('_')) continue;
      if (!d.found) { console.log(`  ❌ ${sel}: NOT FOUND`); continue; }
      const issues = [];
      if (d.display === 'none') issues.push('display:none');
      if (d.visibility === 'hidden') issues.push('visibility:hidden');
      if (d.opacity === '0') issues.push('opacity:0');
      if (d.pointerEvents === 'none') issues.push('pointer-events:none');
      const icon = issues.length > 0 ? '⚠️  ' + issues.join(', ') : '✅ visible';
      console.log(`  ${sel}: ${icon}`);
      console.log(`    geometry: ${d.w}x${d.h} at (${d.x},${d.y}) z=${d.zIndex} pos=${d.position}`);
    }
    console.log(`\n  Lane buttons: ${report._laneCount}`);
    console.log(`  Queue items: ${report._queueCount}`);
    console.log(`  Active lane: "${report._activeBefore}"`);

    // Click test
    console.log('\n🖱️  Click test:');
    const cr = await page.evaluate(() => {
      const btns = document.querySelectorAll('.downloads-lane-button');
      if (btns.length < 2) return { error: `only ${btns.length} button(s)` };
      const before = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      btns[1].click();
      return { clicked: btns[1].textContent.trim().substring(0, 40), before };
    });
    if (cr.error) { console.log(`  ❌ ${cr.error}`); }
    else {
      console.log(`  Clicked: "${cr.clicked}"`);
      await sleep(1500);
      const after = await page.evaluate(() =>
        document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none'
      );
      console.log(`  Active after: "${after}"`);
      console.log(after !== cr.before ? `  ✅ Lane changed: "${cr.before}" → "${after}"` : `  ❌ No change (was "${cr.before}")`);
    }

    // Console errors
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await sleep(2000);
    console.log('\n📋 Console errors:');
    if (errors.length === 0) console.log('  ✅ None');
    else errors.slice(0, 5).forEach(e => console.log('  ❌', e.substring(0, 200)));

    await browser.close();
  } catch (err) {
    console.log('❌ Error:', err.message);
    if (browser) await browser.close().catch(() => {});
  }

  try { execSync(`cmd.exe /c taskkill /F /IM simsuite.exe`, { windowsHide: true }); } catch {}
  console.log('\n--- Done ---');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  try { execSync(`cmd.exe /c taskkill /F /IM simsuite.exe`, { windowsHide: true }); } catch {}
  process.exit(1);
});
