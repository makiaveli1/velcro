$ErrorActionPreference = "SilentlyContinue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\src-tauri\target\release\simsuite.exe"
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9270"

$proc = Start-Process $exePath -PassThru -WindowStyle Normal
Write-Host "PID:" $proc.Id

# Try screenshot at different intervals
for ($i = 1; $i -le 5; $i++) {
    Start-Sleep 2
    Write-Host "Check at" ($i * 2) "sec..."

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
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    public const int SW_RESTORE = 9;
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
            $visible = [WinE]::IsWindowVisible($hWnd)
            $allWindows += [PSCustomObject]@{HWnd=$hWnd; PID=$pid; Title=$title.ToString(); Class=$className.ToString(); Visible=$visible}
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

    $simWins = $allWindows | Where-Object { $_.PID -eq $proc.Id }
    Write-Host "  SimSuite windows:" $simWins.Count

    if ($simWins.Count -gt 0) {
        foreach ($win in $simWins) {
            Write-Host "  Window:" $win.HWnd $win.Title "(" $win.Class ") visible:" $win.Visible
            $rect = New-Object WinE+RECT
            [WinE]::GetWindowRect($win.HWnd, [ref]$rect) | Out-Null
            $w = $rect.Right - $rect.Left
            $h = $rect.Bottom - $rect.Top
            Write-Host "  Rect:" $rect.Left $rect.Top $rect.Right $rect.Bottom "size:$w x $h"

            if ($w -gt 100 -and $h -gt 100 -and $win.Visible) {
                [WinE]::ShowWindow($win.HWnd, [WinE]::SW_RESTORE) | Out-Null
                [WinE]::SetForegroundWindow($win.HWnd) | Out-Null
                Start-Sleep 1

                Add-Type -AssemblyName System.Drawing
                Add-Type -AssemblyName System.Windows.Forms
                $bmp = New-Object System.Drawing.Bitmap($w, $h)
                $g = [System.Drawing.Graphics]::FromImage($bmp)
                $g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
                $outPath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\capture_" + ($i * 2) + "sec.png"
                $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
                $g.Dispose()
                $bmp.Dispose()
                Write-Host "  Screenshot saved:" $outPath
            }
        }
        break
    }
}

if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }
Write-Host "Done"
