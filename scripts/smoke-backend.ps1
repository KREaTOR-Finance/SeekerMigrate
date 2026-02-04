Param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [string]$WebhookSecret
)

$ErrorActionPreference = 'Stop'

function Step($msg) {
  Write-Host "\n=== $msg ===" -ForegroundColor Cyan
}

function Get-Ok($url) {
  Write-Host "GET $url"
  $resp = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing
  if ($resp.StatusCode -lt 200 -or $resp.StatusCode -ge 300) {
    throw "GET failed ($($resp.StatusCode)) $url"
  }
}

function Post-Expect($url, $bodyObj, $headers, $expectedMin, $expectedMax) {
  Write-Host "POST $url"
  $json = ($bodyObj | ConvertTo-Json -Depth 8)
  $resp = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -ContentType 'application/json' -Body $json -UseBasicParsing
  if ($resp.StatusCode -lt $expectedMin -or $resp.StatusCode -gt $expectedMax) {
    throw "POST failed ($($resp.StatusCode)) $url"
  }
}

$BaseUrl = $BaseUrl.TrimEnd('/')

Step "Backend smoke: /api/health"
Get-Ok "$BaseUrl/api/health"

if ($WebhookSecret) {
  Step "Backend smoke: /webhook (telegram ops)"
  $headers = @{ 'x-telegram-webhook-secret' = $WebhookSecret }
  $body = @{ eventType = 'smoke_test'; payload = @{ ok = $true; at = (Get-Date).ToString('o') } }
  # Expect 202 (or any 2xx)
  Post-Expect "$BaseUrl/webhook" $body $headers 200 299
} else {
  Write-Host "Skipping /webhook test (no -WebhookSecret provided)" -ForegroundColor Yellow
}

Step "Smoke tests complete"
