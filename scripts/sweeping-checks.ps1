Param(
  [string]$ApiBaseUrl,
  [string]$WebhookSecret
)

$ErrorActionPreference = 'Stop'

function Step($msg) {
  Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

Step "Typecheck (root)"
npm run typecheck

Step "Typecheck (mobile)"
npm run typecheck:mobile

Step "Edge tests (onboarding/wizard)"
npm run test -- onboarding-wizard-edge

Step "Full test suite"
npm run test

if ($ApiBaseUrl) {
  Step "Backend smoke"
  powershell -ExecutionPolicy Bypass -File scripts/smoke-backend.ps1 -BaseUrl $ApiBaseUrl -WebhookSecret $WebhookSecret
} else {
  Write-Host "Skipping API smoke. Pass -ApiBaseUrl to include it." -ForegroundColor Yellow
}

Step "Sweeping checks complete"
