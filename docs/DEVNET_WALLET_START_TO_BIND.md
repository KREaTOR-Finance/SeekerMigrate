# Devnet Wallet Start -> Bind Helper

This guide is for safely testing the mobile flow from wallet start to identity bind.

## 1) Generate local devnet env helper

```powershell
powershell -ExecutionPolicy Bypass -File scripts/devnet-wallet-setup.ps1
```

This creates `.env.devnet.local` (gitignored) with non-secret defaults and comments.

## 2) Use devnet values in mobile/web

- Set `SOLANA_NETWORK=devnet`
- Set `SOLANA_RPC=https://api.devnet.solana.com`
- Use a devnet wallet funded by the Solana faucet

## 3) Mobile start -> bind flow

1. Open app and complete quickstart tutorial.
2. Accept disclosure.
3. Connect wallet in `/wallet`.
4. Go to `/identity`.
5. Run SMNS lookup/register OR vanity flow.
6. Confirm onboarding status transitions to `migrate`.

## 4) Safety rules

- Never put real private keys in env files.
- Never commit `.env`, `.env.local`, `.env.devnet.local`, or `.molt`.
- Use throwaway devnet wallets for QA.
