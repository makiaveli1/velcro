$ErrorActionPreference = "SilentlyContinue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9234
$appUrl = "http://localhost:$port"

# Kill existing
taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 2

Write-Host "🚀 Launching SimSuite with CDP (port $port)..." -ForegroundColor Cyan

# Set env var and launch
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal

Write-Host "   PID: $($proc.Id)" -ForegroundColor Gray

# Wait for CDP
Write-Host "   Waiting for CDP..." -ForegroundColor Gray
$cdpReady = $false
$targets = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep 1
    try {
        $targets = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2
        if ($targets -and $targets.Count -gt 0) {
            Write-Host "   ✅ CDP ready after $((($i+1)))s" -ForegroundColor Green
            $cdpReady = $true
            break
        }
    } catch {}
    Write-Host "." -NoNewline
}
Write-Host ""

if (-not $cdpReady) {
    Write-Host "❌ CDP not available" -ForegroundColor Red
    if (-not $proc.HasExited) { Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}

$wsUrl = $targets[0].webSocketDebuggerUrl
Write-Host "   WS URL: $wsUrl" -ForegroundColor Gray

# Run the Node.js DOM inspection script with WS URL as argument
$nodeScript = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\test-dom3.cjs"
Write-Host "`n🧪 Running DOM inspection via Node.js..." -ForegroundColor Cyan
$nodeResult = & "C:\Program Files\nodejs\node.exe" $nodeScript $wsUrl 2>&1
Write-Host $nodeResult

# Cleanup
if (-not $proc.HasExited) { Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue }
Write-Host "`n🛑 App stopped" -ForegroundColor Cyan
Write-Host "--- Done ---" -ForegroundColor Cyan
