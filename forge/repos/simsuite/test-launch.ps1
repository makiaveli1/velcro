$ErrorActionPreference = "SilentlyContinue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9227

Write-Host "🚀 Launching SimSuite (diagnostic)..." -ForegroundColor Cyan
Write-Host "   Exe: $exePath" -ForegroundColor Gray

# Kill existing
taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 2

# Check exe exists
if (-not (Test-Path $exePath)) {
    Write-Host "❌ Exe not found!" -ForegroundColor Red
    exit 1
}

# Launch with remote debugging
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal
Write-Host "   PID: $($proc.Id)" -ForegroundColor Gray

# Wait and check if still running
Start-Sleep 5

if ($proc.HasExited) {
    Write-Host "❌ App exited immediately: $($proc.ExitCode)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ App still running after 5s" -ForegroundColor Green

# Try CDP
try {
    $targets = Invoke-RestMethod "http://localhost:$port/json" -TimeoutSec 5
    Write-Host "✅ CDP accessible: $($targets.Count) target(s)" -ForegroundColor Green
    Write-Host "   URL: $($targets[0].url)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  CDP not accessible: $_" -ForegroundColor Yellow
    Write-Host "   Is DevTools enabled in tauri.conf.json?" -ForegroundColor Yellow
}

# Cleanup
Start-Sleep 1
Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue
Write-Host "`n--- Done ---" -ForegroundColor Cyan
