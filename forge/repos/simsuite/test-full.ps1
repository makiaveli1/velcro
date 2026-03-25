$ErrorActionPreference = "SilentlyContinue"
$node = "C:\Program Files\nodejs\node.exe"
$script = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\test-dom2.cjs"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9233
$appUrl = "http://localhost:$port"

# Kill existing
taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 2

Write-Host "🚀 Launching SimSuite with CDP..." -ForegroundColor Cyan

# Set env var and launch
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal

Write-Host "   PID: $($proc.Id)" -ForegroundColor Gray

# Wait for CDP
Write-Host "   Waiting for CDP..." -ForegroundColor Gray
$cdpReady = $false
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
    Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "   Target: $($targets[0].url)" -ForegroundColor Gray

# Write CDP info to temp file for Node script
$cdpInfo = @{
    wsUrl = $targets[0].webSocketDebuggerUrl
    url = $targets[0].url
    port = $port
} | ConvertTo-Json -Compress
$cdpFile = "$env:TEMP\simsuite_cdp_$PID.json"
Set-Content -Path $cdpFile -Value $cdpInfo

Write-Host "   CDP info written to: $cdpFile" -ForegroundColor Gray

# Run the Node.js DOM inspection script
Write-Host "`n🧪 Running DOM inspection..." -ForegroundColor Cyan
& $node $script $cdpFile 2>&1

# Cleanup
$exitCode = $LASTEXITCODE
if (-not $proc.HasExited) {
    Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "`n🛑 App stopped" -ForegroundColor Cyan
}
Remove-Item $cdpFile -Force -ErrorAction SilentlyContinue

Write-Host "`n--- Done ---" -ForegroundColor Cyan
exit $exitCode
