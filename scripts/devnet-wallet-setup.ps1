$ErrorActionPreference = 'Stop'

$outFile = '.env.devnet.local'
if (Test-Path $outFile) {
  Write-Host "$outFile already exists. Leaving existing file unchanged." -ForegroundColor Yellow
  exit 0
}

@'
# Local devnet helper template (safe defaults, no secrets)
APP_ENV=development
SOLANA_NETWORK=devnet
SOLANA_RPC=https://api.devnet.solana.com
WALLET_ADAPTER_IDENTITY=SeekerMigrate-Devnet
WALLET_ADAPTER_RPC=https://api.devnet.solana.com
EXPO_PUBLIC_API_BASE_URL=http://localhost:5055

# Optional local toggles
LOG_LEVEL=debug
'@ | Set-Content -Path $outFile -Encoding UTF8

Write-Host "Created $outFile"
Write-Host "Next: start API with npm run dev:api, then run mobile dev client."
