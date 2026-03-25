# SimSuite UI Test - Run this from PowerShell on Windows
# Requirements: Node.js + Playwright installed in the project
# Usage: .\test-simsuite.ps1

$ErrorActionPreference = "Stop"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9262
$nodeExe = "C:\Program Files\nodejs\node.exe"
$projectDir = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort"

Write-Host "SimSuite UI Test" -ForegroundColor Cyan
Write-Host "Exe: $exePath" -ForegroundColor Gray

# Kill existing
taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 2

# Set CDP env and launch
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
Write-Host "Launching on port $port..." -ForegroundColor Gray
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal

# Wait for CDP
$cdpOk = $false
$wsUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep 1
    try {
        $targets = Invoke-RestMethod "http://localhost:$port/json" -TimeoutSec 2
        if ($targets -and $targets.Count -gt 0) {
            $wsUrl = $targets[0].webSocketDebuggerUrl
            Write-Host "CDP ready after $($i+1)s" -ForegroundColor Green
            $cdpOk = $true
            break
        }
    } catch {}
    Write-Host "." -NoNewline
}
Write-Host ""

if (-not $cdpOk) {
    Write-Host "FAIL: CDP not available" -ForegroundColor Red
    if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }
    exit 1
}

# Write Playwright inspection script
$inspectJs = @"
const pw = require('$projectDir\node_modules\playwright');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const wsUrl = '$wsUrl';
    const wsMatch = wsUrl.match(/ws:\/\/([^:]+):(\d+)/);
    const wsFullUrl = 'ws://' + wsMatch[1] + ':' + wsMatch[2] + '/';

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

        let issues = 0;
        console.log('DOM Results:');
        for (const [sel, d] of Object.entries(report)) {
            if (sel.startsWith('_')) continue;
            if (!d.found) { console.log('  FAIL: ' + sel + ': NOT FOUND'); issues++; continue; }
            const p = [];
            if (d.display === 'none') p.push('display:none');
            if (d.visibility === 'hidden') p.push('visibility:hidden');
            if (d.opacity === '0') p.push('opacity:0');
            if (d.pointerEvents === 'none') p.push('pointer-events:none');
            const icon = p.length > 0 ? 'WARN: ' + p.join(',') : 'OK';
            console.log('  ' + icon + ': ' + sel + ' (' + d.w + 'x' + d.h + ' at ' + d.x + ',' + d.y + ')');
            issues += p.length;
        }
        console.log('Lane buttons: ' + report._laneCount);
        console.log('Queue items: ' + report._queueCount);
        console.log('Active lane: ' + report._activeBefore);

        console.log('Click test:');
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
            console.log(changed ? '  OK: Lane changed ' + cr.before + ' -> ' + after : '  FAIL: Lane unchanged (was ' + cr.before + ')');
            if (!changed) issues++;
        }

        const errors = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await sleep(2000);
        console.log('Console errors: ' + errors.length);
        if (errors.length > 0) { errors.slice(0, 3).forEach(e => console.log('  ERROR: ' + e.substring(0, 200))); issues++; }

        await browser.close();
        console.log(issues === 0 ? 'ALL_CHECKS_PASSED' : 'ISSUES_FOUND:' + issues);
        process.exit(issues > 0 ? 1 : 0);

    } catch (err) {
        console.error('PLAYWRIGHT_ERROR: ' + err.message);
        if (browser) await browser.close().catch(() => {});
        process.exit(1);
    }
}

main();
"@

$jsFile = "$env:TEMP\simsuite_inspect_$PID.js"
$inspectJs | Out-File -FilePath $jsFile -Encoding UTF8

Write-Host "Running Playwright inspection..." -ForegroundColor Cyan
$nodeResult = & $nodeExe $jsFile 2>&1
$nodeResult | ForEach-Object { Write-Host $_ }

# Cleanup
if (-not $proc.HasExited) { Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue }
Remove-Item $jsFile -Force -ErrorAction SilentlyContinue

if ($nodeResult -match 'ALL_CHECKS_PASSED') {
    Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
    exit 0
} elseif ($nodeResult -match 'ISSUES_FOUND') {
    Write-Host "ISSUES FOUND" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "TEST FAILED" -ForegroundColor Red
    exit 1
}
