/**
 * SimSuite DOM Test - Hybrid Node.js + PowerShell spawn approach
 * Node.js writes a PS1 that spawns the app and captures CDP, then reads result
 */

const { spawn: spawnNode, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const pw = require('/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/node_modules/playwright');

const EXE_WSL = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/src-tauri/target/debug/simsuite.exe';
const PORT = 9256;
const APP_URL = `http://localhost:${PORT}`;
const PROJ = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort';

// PowerShell helper - write and execute PS1, return stdout
function runPS(psContent) {
  const ps1 = PROJ + '/ps_tmp_' + process.pid + '.ps1';
  const bat = PROJ + '/ps_tmp_' + process.pid + '.bat';
  const resultFile = PROJ + '/ps_result_' + process.pid + '.txt';

  // Write PS1 (PowerShell needs backslash paths)
  const exeWin = 'C:\\\\Users\\\\likwi\\\\OneDrive\\\\Desktop\\\\PROJS\\\\SimSort\\\\src-tauri\\\\target\\\\debug\\\\simsuite.exe';
  const resultPath = 'C:\\\\Users\\\\likwi\\\\OneDrive\\\\Desktop\\\\PROJS\\\\SimSort\\\\ps_result_' + process.pid + '.txt';

  const fullPS = psContent
    .replace('__EXE__', exeWin)
    .replace('__PORT__', String(PORT))
    .replace('__RESULT__', resultPath);

  fs.writeFileSync(ps1, fullPS.replace(/\n/g, '\r\n'), 'utf8');

  // Write batch file that runs the PS1
  const batContent = '@echo off\r\ncd /d "C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort"\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\ps_tmp_' + process.pid + '.ps1"';
  fs.writeFileSync(bat, batContent.replace(/\n/g, '\r\n'), 'utf8');

  // Execute via cmd.exe /c with Windows path
  const batWinPath = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\ps_tmp_' + process.pid + '.bat';
  try {
    execSync('"' + batWinPath + '"', {
      windowsHide: true,
      timeout: 30000,
      shell: '/mnt/c/Windows/System32/cmd.exe'
    });
  } catch {}

  // Read result
  let result = '';
  try {
    result = fs.readFileSync(resultFile, 'utf8').trim();
  } catch {}

  // Cleanup
  try { fs.unlinkSync(ps1); } catch {}
  try { fs.unlinkSync(bat); } catch {}
  try { fs.unlinkSync(resultFile); } catch {}

  return result;
}

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
  console.log('SimSuite DOM Test\n');

  // Kill existing
  try { execSync('taskkill /F /IM simsuite.exe', { windowsHide: true, timeout: 5000 }); } catch {}
  await sleep(2000);

  // PowerShell script that spawns app and waits for CDP
  const psContent = `
$port = __PORT__
$exe = "__EXE__"
$appUrl = "http://localhost:$port"
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exe -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal
$cdpOk = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep 1
    try {
        $t = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2
        if ($t -and $t.Count -gt 0) {
            $t[0].webSocketDebuggerUrl | Out-File -FilePath "__RESULT__" -Encoding ASCII
            $cdpOk = $true
            break
        }
    } catch {}
}
if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }
if (-not $cdpOk) { "FAIL" | Out-File -FilePath "__RESULT__" -Encoding ASCII }
`;

  console.log('Launching SimSuite via PowerShell...');
  const result = runPS(psContent);
  console.log('Result:', result.substring(0, 100));

  if (!result.startsWith('ws://')) {
    console.log('CDP not available');
    process.exit(1);
  }

  const wsUrl = result.trim();
  console.log('CDP accessible:', wsUrl.substring(0, 60), '\n');

  const wsMatch = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  const wsFullUrl = `ws://${wsMatch[1]}:${wsMatch[2]}/`;

  let browser;
  try {
    browser = await pw.chromium.connectOverCDP(wsFullUrl);
    const page = browser.contexts()[0].pages()[0];
    await page.bringToFront();
    await sleep(3000);

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

    console.log('DOM Results:\n');
    let issues = 0;
    for (const [sel, d] of Object.entries(report)) {
      if (sel.startsWith('_')) continue;
      if (!d.found) { console.log('  NOT_FOUND: ' + sel); issues++; continue; }
      const p = [];
      if (d.display === 'none') p.push('display:none');
      if (d.visibility === 'hidden') p.push('visibility:hidden');
      if (d.opacity === '0') p.push('opacity:0');
      if (d.pointerEvents === 'none') p.push('pointer-events:none');
      const icon = p.length > 0 ? 'WARN: ' + p.join(',') : 'OK';
      console.log('  ' + icon + ': ' + sel + ' (' + d.w + 'x' + d.h + ' at ' + d.x + ',' + d.y + ')');
      issues += p.length;
    }
    console.log('\nLane buttons: ' + report._laneCount);
    console.log('Queue items: ' + report._queueCount);
    console.log('Active lane: ' + report._activeBefore);

    console.log('\nClick test:');
    const cr = await page.evaluate(() => {
      const btns = document.querySelectorAll('.downloads-lane-button');
      if (btns.length < 2) return { error: 'only ' + btns.length + ' button(s)' };
      const before = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
      btns[1].click();
      return { clicked: btns[1].textContent.trim().substring(0, 40), before };
    });
    if (cr.error) { console.log('  FAIL: ' + cr.error); issues++; }
    else {
      console.log('  Clicked: ' + cr.clicked);
      await sleep(1500);
      const after = await page.evaluate(() =>
        document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none'
      );
      const changed = after !== cr.before;
      console.log('  Active after: ' + after);
      console.log(changed ? '  OK: Lane changed ' + cr.before + ' -> ' + after : '  FAIL: Lane unchanged');
      if (!changed) issues++;
    }

    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await sleep(2000);
    console.log('\nConsole errors: ' + errors.length);
    if (errors.length > 0) { errors.slice(0, 3).forEach(e => console.log('  ERROR: ' + e.substring(0, 200))); issues++; }

    await browser.close();
    console.log('\n' + (issues === 0 ? 'ALL CHECKS PASSED' : issues + ' issue(s) found'));

  } catch (err) {
    console.log('Error:', err.message);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
