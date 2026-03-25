$ErrorActionPreference = "SilentlyContinue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9235
$appUrl = "http://localhost:$port"

# Kill existing
taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 3

Write-Host "🚀 Launching SimSuite (debug)..." -ForegroundColor Cyan
Write-Host "   Env var: WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=$port" -ForegroundColor Gray

# Set env and launch
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal
Write-Host "   PID: $($proc.Id)" -ForegroundColor Gray

# Check if process is still running after 3s
Start-Sleep 3
if ($proc.HasExited) {
    Write-Host "❌ Process exited with code: $($proc.ExitCode)" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Still running after 3s" -ForegroundColor Green

# Try CDP at 3s, 5s, 8s, 12s
$attempts = @(3, 5, 8, 12)
foreach ($delay in $attempts) {
    Start-Sleep ($delay - ($attempts[$attempts.IndexOf($delay)] - $attempts[0]) - 3)
    Write-Host "   Checking CDP at ${delay}s..." -ForegroundColor Gray
    try {
        $targets = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2
        if ($targets -and $targets.Count -gt 0) {
            Write-Host "   ✅ CDP accessible! $($targets.Count) target(s)" -ForegroundColor Green
            Write-Host "   URL: $($targets[0].url)" -ForegroundColor Gray
            Write-Host "   WS:  $($targets[0].webSocketDebuggerUrl)" -ForegroundColor Gray
            $global:cdpSuccess = $true
            break
        }
    } catch {
        Write-Host "   ❌ Not yet: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

if (-not $global:cdpSuccess) {
    Write-Host "`n❌ CDP never became available" -ForegroundColor Red
    # Check stderr
    Write-Host "`n📋 Checking for error output..." -ForegroundColor Cyan
    $err = Get-Content "$env:TEMP\simsuite_err_$PID.log" -Raw -ErrorAction SilentlyContinue
    if ($err) { Write-Host $err -ForegroundColor Yellow }
}

# Cleanup
if (-not $proc.HasExited) { Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue }
Write-Host "`n--- Done ---" -ForegroundColor Cyan
