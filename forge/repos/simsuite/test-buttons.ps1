$ErrorActionPreference = "SilentlyContinue"
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinEvents {
    [DllImport("user32.dll")]
    public static extern IntPtr WindowFromPoint(int x, int y);
    
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    
    [DllImport("user32.dll", CharSet=CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
}
"@

$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\debug\simsuite.exe"
$port = 9230

# Kill existing
taskkill /F /IM simsuite.exe 2>$null
Start-Sleep 2

Write-Host "🚀 Launching SimSuite with extended args..." -ForegroundColor Cyan

# Try with WEBVIEW2 environment variable for remote debugging
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"
$proc = Start-Process $exePath -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal -RedirectStandardError "$env:TEMP\simsuite_err.log"

Start-Sleep 6

if ($proc.HasExited) {
    Write-Host "❌ App exited: $($proc.ExitCode)" -ForegroundColor Red
    $err = Get-Content "$env:TEMP\simsuite_err.log" -Raw -ErrorAction SilentlyContinue
    if ($err) { Write-Host $err -ForegroundColor Yellow }
    exit 1
}

Write-Host "✅ App running (PID: $($proc.Id))" -ForegroundColor Green

# Try CDP again
try {
    $targets = Invoke-RestMethod "http://localhost:$port/json" -TimeoutSec 5
    Write-Host "✅ CDP accessible via WEBVIEW2 env var!" -ForegroundColor Green
    Write-Host "   $($targets.Count) target(s)"
    $targets | ForEach-Object { Write-Host "   → $($_.url)" -ForegroundColor Gray }
} catch {
    Write-Host "⚠️  CDP still not accessible via env var: $_" -ForegroundColor Yellow
}

# Check stderr log
$errLog = "$env:TEMP\simsuite_err.log"
if ((Test-Path $errLog) -and (Get-Content $errLog -Raw)) {
    Write-Host "`n📄 stderr output:" -ForegroundColor Cyan
    Get-Content $errLog | Select-Object -First 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

# Cleanup
Start-Sleep 1
Stop-Process $proc.Id -Force -ErrorAction SilentlyContinue
Remove-Item $errLog -Force -ErrorAction SilentlyContinue
Write-Host "`n--- Done ---" -ForegroundColor Cyan
