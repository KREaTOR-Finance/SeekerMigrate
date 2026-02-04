Param(
  [ValidateSet('preflight','backend','backend-smoke','mobile','mobile-release','all')]
  [string]$Mode = 'preflight',
  [string]$BaseUrl,
  [string]$WebhookSecret
)

$ErrorActionPreference = 'Stop'

function Step($msg) {
  Write-Host "\n=== $msg ===" -ForegroundColor Cyan
}

function RequireCmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

RequireCmd node
RequireCmd npm

$RepoRoot = Split-Path -Parent $PSScriptRoot

Set-Location $RepoRoot

if ($Mode -eq 'preflight' -or $Mode -eq 'all') {
  Step "Preflight: install + build + lint + typecheck + test"
  if (Test-Path "$RepoRoot\package-lock.json") {
    npm ci
  } else {
    npm install
  }
  npm run build
  npm run lint
  npm run typecheck
  npm run test

  Step "Preflight complete"
}

if ($Mode -eq 'backend' -or $Mode -eq 'all') {
  Step "Backend deploy: GitHub -> Vercel"
  Write-Host "Recommended: PR -> merge to main -> Vercel deploy -> run smoke tests." -ForegroundColor Yellow
  Write-Host "Smoke test helper:" -ForegroundColor Yellow
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\\smoke-backend.ps1 -BaseUrl https://api.seekermigrate.com" -ForegroundColor Yellow
}

if ($Mode -eq 'backend-smoke' -or $Mode -eq 'all') {
  Step "Backend smoke tests"
  if (-not $BaseUrl) { throw "Provide -BaseUrl (e.g. https://your-app.vercel.app)" }
  $smoke = Join-Path $RepoRoot 'scripts\\smoke-backend.ps1'
  powershell -ExecutionPolicy Bypass -File $smoke -BaseUrl $BaseUrl -WebhookSecret $WebhookSecret
}

if ($Mode -eq 'mobile' -or $Mode -eq 'all') {
  Step "Mobile: install + dev-client reminder"
  $MobileDir = Join-Path $RepoRoot 'apps\mobile'
  if (-not (Test-Path $MobileDir)) {
    throw "Missing apps/mobile folder: $MobileDir"
  }
  Set-Location $MobileDir

  Step "Install mobile deps"
  npm ci

  Step "Dev-client (required for Solana Mobile Wallet Adapter)"
  Write-Host "First time:" -ForegroundColor Yellow
  Write-Host "  npm run run:android" -ForegroundColor Yellow
  Write-Host "  npm run dev:client" -ForegroundColor Yellow
}

if ($Mode -eq 'mobile-release' -or $Mode -eq 'all') {
  Step "Mobile release (EAS Build)"
  $MobileDir = Join-Path $RepoRoot 'apps\mobile'
  if (-not (Test-Path $MobileDir)) {
    throw "Missing apps/mobile folder: $MobileDir"
  }
  Set-Location $MobileDir

  Step "Check EAS CLI"
  if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "EAS CLI not found. Install it:" -ForegroundColor Yellow
    Write-Host "  npm i -g eas-cli" -ForegroundColor Yellow
    throw "Missing eas CLI"
  }

  Step "EAS account"
  Write-Host "Login:  npm run eas:login" -ForegroundColor Yellow
  Write-Host "Verify: npm run eas:whoami" -ForegroundColor Yellow

  Step "Build artifacts"
  Write-Host "Internal test build (APK): npm run build:apk" -ForegroundColor Yellow
  Write-Host "Store build (AAB):        npm run build:aab" -ForegroundColor Yellow
  Write-Host "Important: set EXPO_PUBLIC_API_BASE_URL in apps/mobile/eas.json to your Vercel prod URL." -ForegroundColor Yellow
}
