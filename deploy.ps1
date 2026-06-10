# Netlify Auto Deployer for MorphemeFlow
$ErrorActionPreference = "Stop"

$nodeDir = "C:\Users\User\.gemini\antigravity\scratch\classroom-tools-web\node"
if (-not (Test-Path $nodeDir)) {
    Write-Error "Portable Node environment not found in adjacent folder."
}

# Prepend node path
$env:PATH = "$nodeDir;" + $env:PATH

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Launching Netlify deployment (Logged-in site mode)..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Deploy and create site automatically
& npx netlify-cli deploy --dir=. --prod --site-name morphemeflow-etymology-tw --no-build
