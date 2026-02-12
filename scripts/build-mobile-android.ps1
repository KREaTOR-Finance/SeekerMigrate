Param(
  [ValidateSet('apk', 'aab')]
  [string]$Artifact = 'aab',
  [string]$ApiBaseUrl,
  [switch]$InstallDeps,
  [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'

function Step($msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function RequireCmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

RequireCmd node
RequireCmd npm
RequireCmd eas

$repoRoot = Split-Path -Parent $PSScriptRoot
$mobileDir = Join-Path $repoRoot 'apps\mobile'

if (-not (Test-Path $mobileDir)) {
  throw "Missing mobile app directory: $mobileDir"
}

Set-Location $mobileDir

if ($InstallDeps) {
  Step "Installing mobile dependencies"
  if (Test-Path (Join-Path $mobileDir 'package-lock.json')) {
    npm ci
  } else {
    npm install
  }
}

if ($ApiBaseUrl) {
  Step "Using API base URL override"
  $env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl
  Write-Host "EXPO_PUBLIC_API_BASE_URL=$ApiBaseUrl" -ForegroundColor Yellow
}

$profile = if ($Artifact -eq 'apk') { 'preview' } else { 'production' }

$args = @('build', '-p', 'android', '--profile', $profile)
if ($NonInteractive) {
  $args += '--non-interactive'
}

Step "Starting EAS build ($Artifact via profile '$profile')"
Write-Host ("eas " + ($args -join ' ')) -ForegroundColor Yellow
& eas @args

if ($LASTEXITCODE -ne 0) {
  throw "EAS build failed with exit code $LASTEXITCODE"
}

Step "Build submitted successfully"
Write-Host "Artifact: $Artifact" -ForegroundColor Green
Write-Host "Profile:  $profile" -ForegroundColor Green
Write-Host "Track the build in EAS dashboard output above." -ForegroundColor Green
