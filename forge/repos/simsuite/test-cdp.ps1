$ErrorActionPreference = "SilentlyContinue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9230

taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 2

$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal

Start-Sleep 7

try {
    $targets = Invoke-RestMethod "http://localhost:$port/json" -TimeoutSec 3
    if ($targets -and $targets.Count -gt 0) {
        Write-Host "CDP_OK"
        Write-Host $targets[0].webSocketDebuggerUrl
    } else {
        Write-Host "CDP_EMPTY"
    }
} catch {
    Write-Host "CDP_FAIL"
}

if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }
