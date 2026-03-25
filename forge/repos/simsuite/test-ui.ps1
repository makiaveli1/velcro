# SimSuite UI Test Script
# Run from PowerShell on Windows

param(
    [string]$ExePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\bundle\msi\SimSuite.exe",
    [int]$Port = 9222
)

$ErrorActionPreference = "Continue"

Write-Host "🚀 Starting SimSuite UI test..." -ForegroundColor Cyan
Write-Host "   Executable: $ExePath" -ForegroundColor Gray

# Check if exe exists
if (-not (Test-Path $ExePath)) {
    Write-Host "❌ Exe not found at: $ExePath" -ForegroundColor Red
    exit 1
}

# Kill any existing instances
$existing = Get-Process -Name "SimSuite" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "   Killing existing SimSuite process..." -ForegroundColor Gray
    Stop-Process -Name "SimSuite" -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
}

# Launch with remote debugging
$debugUrl = "http://localhost:$Port"
$appPath = Resolve-Path $ExePath

Write-Host "   Launching with remote debug on port $Port..." -ForegroundColor Gray
$proc = Start-Process $appPath -ArgumentList "--remote-debugging-port=$Port" -PassThru

# Wait for app to start
Start-Sleep 5

if ($proc.HasExited) {
    Write-Host "❌ App exited immediately with code: $($proc.ExitCode)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ App launched (PID: $($proc.Id))" -ForegroundColor Green

# Try to connect via CDP
$wsUrl = $null

try {
    # Get CDP websocket URL
    $debugInfo = Invoke-RestMethod "$debugUrl/json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ CDP debug endpoint accessible" -ForegroundColor Green

    if ($debugInfo -and $debugInfo.Count -gt 0) {
        $wsUrl = $debugInfo[0].webSocketDebuggerUrl
        Write-Host "   WebSocket URL: $($debugInfo[0].url)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not connect to CDP debug endpoint: $_" -ForegroundColor Yellow
    Write-Host "   Trying direct page access..." -ForegroundColor Gray
}

# Use Playwright via Node.js if available, otherwise do basic checks
$playwrightPath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\node_modules\.bin\playwright.cmd"
if (-not (Test-Path $playwrightPath)) {
    $playwrightPath = "npx.cmd playwright"
}

# Run Playwright test
$testScript = @"
const { chromium } = require('playwright');

async function main() {
    const browser = await chromium.connect({
        endpoint: 'http://localhost:$Port',
        timeout: 10000
    });
    
    const page = browser.contexts()[0].pages()[0];
    console.log('✅ Connected to page:', page.url());
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Check for Downloads content
    const html = await page.content();
    console.log('✅ Page loaded, content length:', html.length);
    
    // Check for lane buttons
    const laneButtons = await page.locator('.downloads-lane-button').count();
    console.log('Lane buttons found:', laneButtons);
    
    // Try clicking the first lane
    if (laneButtons > 0) {
        const firstBtn = page.locator('.downloads-lane-button').first();
        await firstBtn.click();
        console.log('✅ Clicked first lane button');
    }
    
    await browser.close();
    console.log('✅ Test complete');
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
"@

# Write test script to temp file and run
$testFile = "$env:TEMP\simsuite-test-$(Get-Random).js"
Set-Content -Path $testFile -Value $testScript

try {
    Write-Host "`n🧪 Running Playwright test..." -ForegroundColor Cyan
    $result = & node $testFile 2>&1
    Write-Host $result
} catch {
    Write-Host "⚠️  Playwright test failed: $_" -ForegroundColor Yellow
} finally {
    Remove-Item $testFile -Force -ErrorAction SilentlyContinue
}

# Check for console errors from the process
Start-Sleep 2

# Clean up
if (-not $proc.HasExited) {
    Write-Host "`n🛑 Stopping SimSuite..." -ForegroundColor Cyan
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "`n--- Test Complete ---" -ForegroundColor Cyan
