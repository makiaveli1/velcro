/**
 * SimSuite UI Inspector v4 — Better launch diagnostics
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

const EXE_WSL = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/src-tauri/target/debug/simsuite.exe';
const EXE_WIN = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\simsuite.exe';
const PORT = 9226;
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

function runCmd(cmd) {
  // Prefix with cmd.exe /c to run Windows commands from WSL
  try { return execSync(`cmd.exe /c ${cmd}`, { windowsHide: true }).toString(); } catch { return ''; }
}

async function main() {
  console.log('🔍 SimSuite UI Inspector v4\n');

  // Kill existing
  runCmd(`taskkill /F /IM simsuite.exe`);
  await sleep(2000);

  // Check exe exists
  const fs = require('fs');
  if (!fs.existsSync(EXE_WSL)) {
    console.log(`❌ Exe not found: ${EXE_WSL}`);
    process.exit(1);
  }
  console.log('✅ Exe exists');

  // Launch via PowerShell Start-Process (new window so process stays alive)
  console.log('🚀 Launching SimSuite...');
  const psScript = `Start-Process -FilePath "${EXE_WIN}" -ArgumentList "--remote-debugging-port=${PORT}"`;
  const child = spawn(
    '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
    { detached: true, stdio: 'ignore', windowsHide: true }
  );
  child.unref();
  console.log('   Spawned with PID:', child.pid);

  // Poll for app startup
  console.log('   Waiting for startup...');
  let cdpAvailable = false;
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    const running = runCmd(`tasklist /FI "IMAGENAME eq simsuite.exe" 2>nul`);
    if (running.includes('simsuite')) {
      console.log(`   ✅ App detected after ${i+1}s`);
      break;
    }
    process.stdout.write('.');
  }
  console.log('');

  // Check CDP
  try {
    const targets = await httpGet('/json');
    cdpAvailable = true;
    console.log(`✅ CDP accessible — ${targets.length} target(s)`);
  } catch (e) {
    console.log(`❌ CDP not available: ${e.message}`);
    const running = runCmd(`tasklist /FI "IMAGENAME eq simsuite.exe" 2>nul`);
    if (!running.includes('simsuite')) {
      console.log('❌ simsuite.exe is NOT in task list — it crashed or failed to start');
    } else {
      console.log('⚠️  simsuite.exe IS running but CDP not accessible — DevTools may not be enabled');
    }
    runCmd(`taskkill /F /IM simsuite.exe`);
    process.exit(1);
  }

  // Connect with Playwright
  let pw;
  try { pw = require('playwright'); } catch { console.log('❌ Playwright not found'); process.exit(1); }

  const targets = await httpGet('/json');
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
          zIndex: s.zIndex,
          w: Math.round(box.width), h: Math.round(box.height),
          x: Math.round(box.left), y: Math.round(box.top),
        };
      }
      r._laneCount = document.querySelectorAll('.downloads-lane-button').length;
      r._activeBefore = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      return r;
    });

    console.log('\n📊 DOM Results:');
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

    // Click test
    console.log('\n🖱️  Click test:');
    const cr = await page.evaluate(() => {
      const btns = document.querySelectorAll('.downloads-lane-button');
      if (btns.length < 2) return { error: 'need 2+ buttons' };
      const before = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      btns[1].click();
      return { clicked: btns[1].textContent.trim().substring(0, 40), before };
    });
    if (cr.error) console.log(`  ❌ ${cr.error}`);
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

  runCmd(`taskkill /F /IM simsuite.exe`);
  console.log('\n--- Done ---');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  try { runCmd(`taskkill /F /IM simsuite.exe`); } catch {}
  process.exit(1);
});
