const { execSync } = require('child_process');
const fs = require('fs');

const EXE_WIN = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort\\src-tauri\\target\\debug\\simsuite.exe';
const PORT = 9253;
const PROJECT_DIR = 'C:\\Users\\likwi\\OneDrive\\Desktop\\PROJS\\SimSort';

function run(cmd) {
  try { return execSync(cmd, { windowsHide: true, timeout: 60000 }).toString(); }
  catch (e) { return e.stdout?.toString() || ''; }
}

// Kill existing
run('"/mnt/c/Windows/System32/taskkill.exe" /F /IM simsuite.exe 2>nul');

// Write PowerShell launch script to Windows path
const ps1Content = [
  '$port = ' + PORT,
  '$appUrl = "http://localhost:$port"',
  '$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$port"',
  '$proc = Start-Process "' + EXE_WIN + '" -ArgumentList "--remote-debugging-port=$port" -PassThru -WindowStyle Normal',
  'Start-Sleep 1',
  'for ($i = 0; $i -lt 15; $i++) {',
  '    Start-Sleep 1',
  '    try {',
  '        $targets = Invoke-RestMethod "$appUrl/json" -TimeoutSec 2',
  '        if ($targets -and $targets.Count -gt 0) {',
  '            $targets[0].webSocketDebuggerUrl | Out-File -FilePath "' + PROJECT_DIR + '\\ws_url.txt" -Encoding ASCII',
  '            break',
  '        }',
  '    } catch {}',
  '}',
  'if (-not $proc.HasExited) { Stop-Process $proc.Id -Force }',
].join('\r\n');

const ps1Path = PROJECT_DIR + '\\launch_cdp.ps1';
fs.writeFileSync(ps1Path, ps1Content, 'utf8');
console.log('PS1 written to:', ps1Path);

// Execute using /mnt/c/Windows/System32/cmd.exe with forward-slash path for the PS1
const ps1PathForCmd = ps1Path.replace(/\\/g, '/');
const cmdStr = '"/mnt/c/Windows/System32/cmd.exe" /c "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \\"' + ps1PathForCmd + '\\""';
console.log('Executing:', cmdStr);
const output = run(cmdStr);
console.log('Output:', output.substring(0, 300));

// Cleanup
try { fs.unlinkSync(ps1Path); } catch {}

// Read result
let wsUrl;
try {
  const result = fs.readFileSync(PROJECT_DIR + '\\ws_url.txt', 'utf8').trim();
  try { fs.unlinkSync(PROJECT_DIR + '\\ws_url.txt'); } catch {}
  if (result.length < 5) {
    console.log('CDP FAIL:', result);
    process.exit(1);
  }
  wsUrl = result;
} catch (e) {
  console.log('CDP result not found:', e.message);
  process.exit(1);
}

console.log('CDP OK:', wsUrl.substring(0, 60));
