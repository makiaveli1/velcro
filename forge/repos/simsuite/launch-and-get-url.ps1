$ErrorActionPreference = "SilentlyContinue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9243
$appUrl = "http://localhost:$port"

taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 2

$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal

$cdpOk = $false
$wsUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep 1
    try {
        $targets = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2
        if ($targets -and $targets.Count -gt 0) {
            $wsUrl = $targets[0].webSocketDebuggerUrl
            $cdpOk = $true
            break
        }
    } catch {}
}

$outFile = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\cdp_result.txt"
if ($cdpOk) {
    "OK:$wsUrl" | Out-File -FilePath $outFile -Encoding ASCII
} else {
    "FAIL" | Out-File -FilePath $outFile -Encoding ASCII
}

if (-not $proc.HasExited) { Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue }
