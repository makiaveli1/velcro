/**
 * SimSuite UI Inspector v3 — Launch via cmd.exe to properly start Windows GUI app
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

const EXE_WSL = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/src-tauri/target/debug/simsuite.exe';
const EXE_WIN = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\simsuite.exe';
const PORT = 9225;
const APP_URL = `http://localhost:${PORT}`;

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

async function main() {
  console.log('🔍 SimSuite UI Inspector v3\n');
  console.log('   Exe:', EXE_WSL);

  // Kill existing
  try { execSync(`taskkill /F /IM simsuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  await sleep(2000);

  // Launch via powershell Start-Process to properly run Windows GUI
  console.log('🚀 Launching SimSuite via PowerShell...');
  const psScript = `Start-Process -FilePath "${EXE_WIN}" -ArgumentList "--remote-debugging-port=${PORT}" -NoNewWindow`;
  spawn('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref();

  // Wait for app to start
  console.log('   Waiting 8s for startup...');
  await sleep(8000);

  // Check if app is running
  let appRunning = true;
  try {
    const tasks = execSync(`tasklist /FI "IMAGENAME eq simsuite.exe" 2>nul`, { windowsHide: true }).toString();
    if (!tasks.includes('simsuite')) {
      console.log('⚠️  simsuite.exe not in task list — may have exited');
      appRunning = false;
    } else {
      console.log('✅ simsuite.exe is running');
    }
  } catch {}

  if (!appRunning) {
    console.log('❌ App not running. CDP cannot be tested.');
    process.exit(1);
  }

  // Get CDP target
  let targets;
  try { targets = await httpGet('/json'); } catch (e) {
    console.log(`❌ Cannot connect to CDP: ${e.message}`);
    try { execSync(`taskkill /F /IM simsuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
    process.exit(1);
  }
  if (!targets || targets.length === 0) { console.log('❌ No CDP targets'); process.exit(1); }

  console.log(`✅ CDP accessible — ${targets.length} target(s)\n`);

  // Use playwright
  let pw;
  try { pw = require('playwright'); } catch { console.log('❌ Playwright not found'); process.exit(1); }

  const wsUrl = targets[0].webSocketDebuggerUrl;
  const m = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  if (!m) { console.log('❌ Invalid WS URL'); process.exit(1); }
  const wsHost = m[1];
  const wsPort = m[2];

  let browser;
  try {
    browser = await pw.chromium.connectOverCDP(`ws://${wsHost}:${wsPort}/`);
    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();
    await sleep(3000);

    // Inspect DOM
    const report = await page.evaluate(() => {
      const r = {};
      const selectors = [
        '.downloads-shell', '.downloads-rail-shell', '.downloads-stage',
        '.downloads-lane-button', '.downloads-item-row',
        '.downloads-casual-drawer', '.downloads-casual-backdrop',
        '.downloads-top-strip', '.downloads-stage-split',
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
      console.log(`    size: ${d.w}x${d.h} at (${d.x},${d.y})`);
    }
    console.log(`\n  Lane buttons: ${report._laneCount}`);
    console.log(`  Active: "${report._activeBefore}"`);

    // Click second lane
    console.log('\n🖱️  Click test:');
    const cr = await page.evaluate(() => {
      const btns = document.querySelectorAll('.downloads-lane-button');
      if (btns.length < 2) return { error: 'need 2+ buttons' };
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
      console.log(after !== cr.before ? '  ✅ Lane changed!' : `  ❌ No change (was "${cr.before}")`);
    }

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

  try { execSync(`taskkill /F /IM simsuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  console.log('\n--- Done ---');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  try { execSync(`taskkill /F /IM simsuite.exe`, { stdio: 'ignore', windowsHide: true }); } catch {}
  process.exit(1);
});
