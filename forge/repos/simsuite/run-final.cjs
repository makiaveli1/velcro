/**
 * SimSuite UI Test - FINAL working version
 */

const { execSync } = require('child_process');
const fs = require('fs');

const PROJECT_DIR_WSL = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort';
const PROJECT_DIR_WIN = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort';
const PORT = 9246;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function runCmd(cmd) {
  try { return execSync(cmd, { windowsHide: true, timeout: 60000 }).toString(); }
  catch (e) { return e.stdout?.toString() || ''; }
}

async function main() {
  console.log('SimSuite UI Test\n');

  const ps1Path = PROJECT_DIR_WIN + '\\launch_cdp.ps1';
  const batPath = PROJECT_DIR_WIN + '\\launch_cdp.bat';
  const resultPath = PROJECT_DIR_WIN + '\\ws_url.txt';

  // Kill existing
  runCmd('taskkill /F /IM simsuite.exe 2>nul');
  await sleep(2000);

  // PowerShell script content - use forward slashes which work in PowerShell
  const ps1Content = [
    '$ErrorActionPreference = "SilentlyContinue"',
    '$exePath = "C:/Users/likwi/OneDrive/Desktop/PROJS/SimSort/src-tauri/target/debug/simsuite.exe"',
    '$port = ' + PORT,
    '$appUrl = "http://localhost:$port"',
    '',
    'taskkill /F /IM simsuite.exe 2>$null',
    'Start-Sleep 2',
    '',
    '$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"',
    '$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal',
    '',
    '$cdpOk = $false',
    '$wsUrl = $null',
    'for ($i = 0; $i -lt 15; $i++) {',
    '    Start-Sleep 1',
    '    try {',
    '        $targets = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2',
    '        if ($targets -and $targets.Count -gt 0) {',
    '            $wsUrl = $targets[0].webSocketDebuggerUrl',
    '            $cdpOk = $true',
    '            break',
    '        }',
    '    } catch {}',
    '}',
    '',
    'if ($cdpOk) {',
    '    $wsUrl | Out-File -FilePath "C:/Users/likwi/OneDrive/Desktop/PROJS/SimSort/ws_url.txt" -Encoding ASCII',
    '} else {',
    '    "FAIL" | Out-File -FilePath "C:/Users/likwi/OneDrive/Desktop/PROJS/SimSort/ws_url.txt" -Encoding ASCII',
    '}',
    '',
    'if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }',
  ].join('\r\n');

  fs.writeFileSync(ps1Path, ps1Content, 'utf8');

  // Batch file: cd to the project dir first, then run PowerShell
  const batContent = [
    '@echo off',
    'cd /d "' + PROJECT_DIR_WIN + '"',
    'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + PROJECT_DIR_WIN + '\\launch_cdp.ps1"',
  ].join('\r\n');

  fs.writeFileSync(batPath, batContent, 'utf8');

  // Execute batch file via cmd.exe /c with Windows path (forward slashes work for cmd.exe)
  console.log('Launching SimSuite...');
  const batPathForCmd = batPath.replace(/\\/g, '/');
  const output = runCmd('"/mnt/c/Windows/System32/cmd.exe" /c "' + batPathForCmd + '"');
  console.log('Output:', output.trim().substring(0, 300) || '(empty)');

  // Cleanup temp files
  try { fs.unlinkSync(batPath); } catch {}
  try { fs.unlinkSync(ps1Path); } catch {}

  // Read result
  let wsUrl;
  try {
    const result = fs.readFileSync(resultPath, 'utf8').trim();
    try { fs.unlinkSync(resultPath); } catch {}
    if (result === 'FAIL' || result.length < 5) {
      console.log('CDP not available (got: ' + result + ')');
      process.exit(1);
    }
    wsUrl = result;
  } catch (e) {
    console.log('Could not read result:', e.message);
    try { fs.unlinkSync(resultPath); } catch {}
    process.exit(1);
  }

  console.log('CDP accessible:', wsUrl.substring(0, 60));

  // Connect via Playwright CDP
  const wsMatch = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  const wsFullUrl = 'ws://' + wsMatch[1] + ':' + wsMatch[2] + '/';

  const { chromium } = require(PROJECT_DIR_WSL + '/node_modules/playwright');

  let browser;
  try {
    browser = await chromium.connectOverCDP(wsFullUrl);
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

    console.log('\nDOM Results:');
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

    // Click test
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
