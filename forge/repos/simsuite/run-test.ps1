$ErrorActionPreference = "Continue"
$exePath = "C:\Users\likwi\OneDrive\Desktop\PROJS\SimSort\test-simsuite.cjs"

Write-Host "🚀 Running SimSuite test..." -ForegroundColor Cyan

# Find node
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "❌ node not found in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "   Node: $($nodeCmd.Source)" -ForegroundColor Gray

# Run the test
& node $exePath 2>&1
