$ErrorActionPreference = "SilentlyContinue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\release\simsuite.exe"
$proc = Start-Process $exePath -PassThru -WindowStyle Normal
Write-Host "PID:" $proc.Id
Start-Sleep 8
Write-Host "Running:" (-not $proc.HasExited)
if ($proc.HasExited) { Write-Host "ExitCode:" $proc.ExitCode }

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinE {
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$allWindows = @()
$cb = {
    param($hWnd, $lParam)
    $len = [WinE]::GetWindowTextLength($hWnd)
    if ($len -gt 0) {
        $title = New-Object System.Text.StringBuilder ($len + 1)
        [WinE]::GetWindowText($hWnd, $title, $len + 1) | Out-Null
        $pid = 0
        [WinE]::GetWindowThreadProcessId($hWnd, [ref]$pid) | Out-Null
        $className = New-Object System.Text.StringBuilder 256
        [WinE]::GetClassName($hWnd, $className, 256) | Out-Null
        $allWindows += [PSCustomObject]@{HWnd=$hWnd; PID=$pid; Title=$title.ToString(); Class=$className.ToString()}
    }
    return $true
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinCB {
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
}
"@

$enumDelegate = [WinCB.EnumProc]$cb.GetNewClosure()
[WinCB]::EnumWindows($enumDelegate, [IntPtr]::Zero) | Out-Null

Write-Host "Total windows:" $allWindows.Count
$simWindows = $allWindows | Where-Object { $_.PID -eq $proc.Id }
Write-Host "SimSuite windows:" $simWindows.Count
$simWindows | ForEach-Object {
    Write-Host "  Handle:" $_.HWnd "Title:" $_.Title "Class:" $_.Class
}

# Also check for child processes
$childProc = Get-WmiObject Win32_Process -Filter "ParentProcessID=$($proc.Id)" -ErrorAction SilentlyContinue | Select-Object ProcessId, Name
if ($childProc) {
    Write-Host "Child processes:"
    $childProc | ForEach-Object { Write-Host "  " $_.ProcessId ":" $_.Name }
}

if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }
