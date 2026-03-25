/**
 * SimSuite UI Test v7 — Uses a .bat file to set env and launch app
 * Then connects via CDP and runs Playwright inspection
 */

const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EXE_WIN = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\simsuite.exe';
const PORT = 9239;
const APP_URL = `http://localhost:${PORT}`;
const PROJECT_DIR = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort';

function httpGet(urlPath, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${APP_URL}${urlPath}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.setTimeout(timeout);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function runCmd(cmd) {
  try {
    const r = execSync(cmd, { windowsHide: true, timeout: 30000 });
    return r.toString();
  } catch (e) {
    return e.stdout?.toString() || '';
  }
}

async function main() {
  console.log('🔍 SimSuite UI Test v7\n');

  const batFile = PROJECT_DIR + '\\launch_cdp.bat';
  const ps1File = PROJECT_DIR + '\\cdp_launch.ps1';
  // Forward-slash version for cmd.exe
  const batFileFs = PROJECT_DIR.replace(/\\/g, '/') + '/launch_cdp.bat';
  const ps1FileFs = PROJECT_DIR.replace(/\\/g, '/') + '/cdp_launch.ps1';

  // Kill existing
  console.log('🧹 Killing existing simsuite...');
  runCmd(`"/mnt/c/Windows/System32/taskkill.exe" /F /IM simsuite.exe 2>nul`);

  // Write the PowerShell launch script
  const ps1Content = `
$ErrorActionPreference = "SilentlyContinue"
$port = ${PORT}
$exePath = "${EXE_WIN.replace(/\\/g, '\\\\')}"
$appUrl = "http://localhost:$port"

$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal

$cdpOk = $false
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep 1
    try {
        $targets = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2
        if ($targets -and $targets.Count -gt 0) {
            Write-Host "CDP_OK"
            Write-Host $targets[0].webSocketDebuggerUrl
            $cdpOk = $true
            break
        }
    } catch {}
}

if (-not $cdpOk) {
    Write-Host "CDP_NOT_AVAILABLE"
}

if (-not $proc.HasExited) { Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue }
`;
  fs.writeFileSync(ps1File, ps1Content.replace(/\n/g, '\r\n'), 'utf8');

  // Write a batch file that sets the env and runs the PS1
  const batContent = [
    '@echo off',
    `set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=${PORT}`,
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${ps1FileFs}"`,
    'exit /b'
  ].join('\r\n');
  fs.writeFileSync(batFile, batContent, 'utf8');

  console.log('🚀 Launching SimSuite via batch...');
  const output = runCmd(`"/mnt/c/Windows/System32/cmd.exe" /c "${batFileFs}"`);
  console.log('   Output:', output.substring(0, 300));

  // Cleanup temp files
  try { fs.unlinkSync(batFile); } catch {}
  try { fs.unlinkSync(ps1File); } catch {}

  if (!output.includes('CDP_OK')) {
    console.log('❌ CDP not available');
    process.exit(1);
  }

  // Extract WS URL
  const wsLine = output.split('\n').find(l => l.trim().startsWith('ws://'));
  if (!wsLine) { console.log('❌ No WS URL found'); process.exit(1); }
  const wsUrl = wsLine.trim();
  console.log('✅ CDP accessible');
  console.log('   WS:', wsUrl.substring(0, 60), '\n');

  // Connect via Playwright
  let pw;
  try { pw = require('playwright'); }
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

    // Console errors
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
