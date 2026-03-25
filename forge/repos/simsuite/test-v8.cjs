/**
 * SimSuite UI Test v8 — Two-phase: PowerShell launches app, Node.js inspects
 */

const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const PROJECT_DIR_WSL = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort';
const PROJECT_DIR_WIN = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort';
const EXE_WSL = '/mnt/c/Users/likwi/OneDrive/Desktop/PROJS/SimSort/src-tauri/target/debug/simsuite.exe';
const PORT = 9244;
const APP_URL = `http://localhost:${PORT}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function runCmd(cmd) {
  try { return execSync(cmd, { windowsHide: true, timeout: 60000 }).toString(); }
  catch (e) { return e.stdout?.toString() || ''; }
}

async function main() {
  console.log('🔍 SimSuite UI Test v8\n');

  const ps1File = `${PROJECT_DIR_WSL}/launch_cdp.ps1`;
  const resultFile = `${PROJECT_DIR_WSL}/cdp_result.txt`;
  const wsUrlFile = `${PROJECT_DIR_WSL}/ws_url.txt`;

  // Kill existing
  console.log('🧹 Killing existing...');
  runCmd(`taskkill /F /IM simsuite.exe 2>nul`);
  await sleep(2000);

  // Write PowerShell launch script
  const ps1Content = [
    '$ErrorActionPreference = "SilentlyContinue"',
    `$exePath = "${EXE_WSL.replace(/\\//g, '\\\\')}"`,
    `$port = ${PORT}`,
    `$appUrl = "http://localhost:$port"`,
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
    '$outFile = "' + wsUrlFile.replace(/\\//g, '\\\\') + '"',
    'if ($cdpOk) {',
    '    $wsUrl | Out-File -FilePath $outFile -Encoding ASCII',
    '} else {',
    '    "FAIL" | Out-File -FilePath $outFile -Encoding ASCII',
    '}',
    '',
    'if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }',
  ].join('\r\n');

  fs.writeFileSync(ps1File, ps1Content, 'utf8');

  // Write batch file
  const batContent = [
    '@echo off',
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${ps1File.replace(/\\//g, '\\')}"`,
  ].join('\r\n');
  const batFile = `${PROJECT_DIR_WSL}/launch_cdp.bat`;
  fs.writeFileSync(batFile, batContent, 'utf8');

  // Run batch file via cmd.exe /c with forward slashes
  const batFileFs = PROJECT_DIR_WSL + '/launch_cdp.bat';
  const ps1FileFs = PROJECT_DIR_WSL + '/launch_cdp.ps1';
  console.log('🚀 Launching SimSuite via batch...');
  const output = runCmd(`"/mnt/c/Windows/System32/cmd.exe" /c "${batFileFs}"`);
  console.log('   Done, cleaning up...');

  // Cleanup files
  try { fs.unlinkSync(batFile); } catch {}
  try { fs.unlinkSync(ps1File); } catch {}

  // Read result
  let wsUrl;
  try {
    const result = fs.readFileSync(wsUrlFile, 'utf8').trim();
    fs.unlinkSync(wsUrlFile);
    if (result === 'FAIL' || !result.startsWith('ws://')) {
      console.log('❌ CDP not available');
      process.exit(1);
    }
    wsUrl = result;
  } catch (e) {
    console.log('❌ Could not read CDP result:', e.message);
    try { fs.unlinkSync(wsUrlFile); } catch {}
    process.exit(1);
  }

  console.log('✅ CDP accessible');
  console.log('   WS URL:', wsUrl.substring(0, 60), '\n');

  // Connect via Playwright
  let pw;
  try { pw = require(`${PROJECT_DIR_WSL}/node_modules/playwright`); }
  catch { console.log('❌ Playwright not found'); process.exit(1); }

  const wsMatch = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
  const wsFullUrl = `ws://${wsMatch[1]}:${wsMatch[2]}/`;

  let browser;
  try {
    browser = await pw.chromium.connectOverCDP(wsFullUrl);
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
    let issueCount = 0;
    for (const [sel, d] of Object.entries(report)) {
      if (sel.startsWith('_')) continue;
      if (!d.found) { console.log(`  ❌ ${sel}: NOT FOUND`); issueCount++; continue; }
      const issues = [];
      if (d.display === 'none') issues.push('display:none');
      if (d.visibility === 'hidden') issues.push('visibility:hidden');
      if (d.opacity === '0') issues.push('opacity:0');
      if (d.pointerEvents === 'none') issues.push('pointer-events:none');
      const icon = issues.length > 0 ? '⚠️  ' + issues.join(', ') : '✅';
      console.log(`  ${sel}: ${icon}`);
      console.log(`    geometry: ${d.w}x${d.h} at (${d.x},${d.y}) z=${d.zIndex} pos=${d.position}`);
      if (issues.length > 0) issueCount++;
    }
    console.log(`\n  Lane buttons: ${report._laneCount}`);
    console.log(`  Queue items: ${report._queueCount}`);
    console.log(`  Active lane: "${report._activeBefore}"`);

    // Click test
    console.log('\n🖱️  Lane button click test:');
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
      const changed = after !== cr.before;
      console.log(`  Active after: "${after}"`);
      console.log(changed
        ? `  ✅ SUCCESS: Lane changed "${cr.before}" -> "${after}"`
        : `  ❌ FAILED: Lane unchanged (was "${cr.before}", still "${after}")`);
      if (!changed) issueCount++;
    }

    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await sleep(2000);
    console.log('\n📋 Console errors:');
    if (errors.length === 0) console.log('  ✅ None');
    else { errors.slice(0, 5).forEach(e => console.log('  ❌', e.substring(0, 200))); issueCount++; }

    await browser.close();
    console.log(`\n${issueCount === 0 ? '✅ All checks passed!' : `⚠️  ${issueCount} issue(s) found`}`);

  } catch (err) {
    console.log('❌ CDP/Browser error:', err.message);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});
