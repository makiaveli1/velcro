$ErrorActionPreference = "Stop"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9242
$appUrl = "http://localhost:$port"
$projectDir = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort"

# Kill existing
taskkill /F /IM simsuite.exe 2>$null | Out-Null
Start-Sleep 2

Write-Host "Launching SimSuite with CDP on port $port..." -ForegroundColor Cyan
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal

# Wait for CDP to be available
$cdpOk = $false
$wsUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep 1
    try {
        $targets = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2
        if ($targets -and $targets.Count -gt 0) {
            $wsUrl = $targets[0].webSocketDebuggerUrl
            Write-Host "CDP available after $($i+1)s" -ForegroundColor Green
            $cdpOk = $true
            break
        }
    } catch {}
    Write-Host "." -NoNewline
}
Write-Host ""

if (-not $cdpOk) {
    Write-Host "CDP not available" -ForegroundColor Red
    if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }
    exit 1
}

# Write the WebSocket URL to a temp file for Node.js
$wsUrlFile = "$env:TEMP\simsuite_wsurl_$PID.txt"
$wsUrl | Out-File -FilePath $wsUrlFile -Encoding UTF8
Write-Host "WS URL written to: $wsUrlFile" -ForegroundColor Gray

# Write Node.js inspection script to temp file
$nodeScript = @"
const pw = require('$projectDir\node_modules\playwright');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const wsUrl = '$wsUrl'.trim();
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

        console.log('DOM Results:');
        let issueCount = 0;
        for (const [sel, d] of Object.entries(report)) {
            if (sel.startsWith('_')) continue;
            if (!d.found) { console.log('  FAIL: ' + sel + ': NOT FOUND'); issueCount++; continue; }
            const issues = [];
            if (d.display === 'none') issues.push('display:none');
            if (d.visibility === 'hidden') issues.push('visibility:hidden');
            if (d.opacity === '0') issues.push('opacity:0');
            if (d.pointerEvents === 'none') issues.push('pointer-events:none');
            console.log('  ' + (issues.length > 0 ? 'WARN: ' + sel + ': ' + issues.join(',') : 'OK: ' + sel + ' ' + d.w + 'x' + d.h + ' at (' + d.x + ',' + d.y + ')'));
            issueCount += issues.length;
        }
        console.log('Lane buttons: ' + report._laneCount);
        console.log('Queue items: ' + report._queueCount);
        console.log('Active lane: ' + report._activeBefore);

        // Click test
        console.log('Click test:');
        const cr = await page.evaluate(() => {
            const btns = document.querySelectorAll('.downloads-lane-button');
            if (btns.length < 2) return { error: 'only ' + btns.length + ' button(s)' };
            const before = document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none';
            btns[1].click();
            return { clicked: btns[1].textContent.trim().substring(0, 40), before };
        });
        if (cr.error) { console.log('  FAIL: ' + cr.error); }
        else {
            console.log('  Clicked: ' + cr.clicked);
            await sleep(1500);
            const after = await page.evaluate(() =>
                document.querySelector('.downloads-lane-button.is-active')?.textContent?.trim() || 'none'
            );
            const changed = after !== cr.before;
            console.log('  Active after: ' + after);
            console.log(changed ? '  OK: Lane changed ' + cr.before + ' -> ' + after : '  FAIL: Lane unchanged (was ' + cr.before + ')');
            if (!changed) issueCount++;
        }

        const errors = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await sleep(2000);
        console.log('Console errors: ' + errors.length);
        if (errors.length > 0) { errors.slice(0, 3).forEach(e => console.log('  ERROR: ' + e.substring(0, 200))); issueCount++; }

        await browser.close();
        console.log(issueCount === 0 ? 'ALL_CHECKS_PASSED' : 'ISSUES_FOUND:' + issueCount);
        process.exit(issueCount > 0 ? 1 : 0);

    } catch (err) {
        console.error('PLAYWRIGHT_ERROR: ' + err.message);
        if (browser) await browser.close().catch(() => {});
        process.exit(1);
    }
}

main();
"@

$nodeScriptFile = "$env:TEMP\simsuite_inspect_$PID.js"
$nodeScript | Out-File -FilePath $nodeScriptFile -Encoding UTF8
Write-Host "Node script written to: $nodeScriptFile" -ForegroundColor Gray

# Run the Node.js script
Write-Host "Running Playwright inspection..." -ForegroundColor Cyan
try {
    $nodeResult = & "C:\Program Files\nodejs\node.exe" $nodeScriptFile 2>&1
    Write-Host $nodeResult
} catch {
    Write-Host "Node execution failed: $_" -ForegroundColor Red
}

# Cleanup
if (-not $proc.HasExited) { Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue }
Remove-Item $wsUrlFile -Force -ErrorAction SilentlyContinue
Remove-Item $nodeScriptFile -Force -ErrorAction SilentlyContinue
Write-Host "Done" -ForegroundColor Cyan
