# SeekerMigrate

SeekerMigrate started as a migration CLI and now powers a Solana Mobile onboarding experience for Solana Seeker (SKR) users. The repo still contains the CLI/analyzer for developers, but what SKR users open is the mobile app that embeds the generated wallet, payment, vanity, and name-service components. The Telegram bot is an operational tool for the team, not something end users interact with.

- **Wallet authentication:** existing analyzer + generator output still provides `WalletConnectButton`, `WalletAuthContext`, and `SolanaWalletProvider`.
- **Payments:** the new `WalletPaymentModule` component wires a connected Solana wallet to a merchant account and an optional payment backend.
- **Vanity wallet generator:** `VanityWalletGenerator` lets your app request custom prefixes from a backend service and shows the generated address.
- **Name service:** `NameServiceLookup` covers lookups and mint requests for SNS or other Solana naming systems.
- **Telegram webhook service:** `/webhook` receives anonymized mobile events and forwards them to the admin chat defined in `.env`.

Each feature can be scaffolded through `npx seekermigrate auth`/`analyze`, which writes all of the components above into your output directory.

The deployed surface on Vercel now includes a Solana-themed landing page at `/`, API routes under `/api/*`, and the operations webhook at `/webhook`.

## CLI usage (developer-only)

```bash
npx seekermigrate auth --source ./my-firebase-app --output ./seekermigrate-output
npx seekermigrate analyze --source ./my-firebase-app --json
```

These CLI commands are used during development / migration runs; SKR end users never invoke them.

## Generated assets

After migrating, `seekermigrate-output/` now contains:

- `WalletConnectButton.tsx`
- `WalletAuthContext.tsx`
- `SolanaWalletProvider.tsx`
- `polyfills.js`
- `WalletPaymentModule.tsx`
- `VanityWalletGenerator.tsx`
- `NameServiceLookup.tsx`
- `MIGRATION_REPORT.md`

Use these files to replace Firebase-specific UI/logic. The report documents the bundle of packages to add/remove and the behavioral diffs.

## Mobile integration

1. Wrap your root component with `SolanaWalletProvider` and consume `useWallet`/`useAuth` from `WalletAuthContext`.
2. Replace login screens with `WalletConnectButton`.
3. Drop `WalletPaymentModule` into the flow that handles customer checkouts. By default it posts receipts to `/api/payments/receipt`.
4. Integrate `VanityWalletGenerator` where you let users name their wallet. By default it posts to `/api/vanity`.
5. Surface `NameServiceLookup` for ENS-style lookups and mint submissions; by default it posts to `/api/name/lookup` and `/api/name/mint`.
6. Update any backend APIs so they record wallet public keys instead of Firebase tokens and accept the signatures from these components.

## Environment variables

Copy `.env.example` to `.env` (and to your Vercel env settings) and populate:

- `APP_ENV`, `SOLANA_NETWORK`, `SOLANA_RPC`
- Wallet adapter metadata (`WALLET_ADAPTER_IDENTITY`, `WALLET_ADAPTER_RPC`)
- Payment rails (`PAYMENTS_PROVIDER`, `PAYMENTS_ENDPOINT=/api/payments`, `PAYMENTS_API_KEY`, `PAYMENT_MERCHANT_ADDRESS`, `PAYMENT_MERCHANT_LABEL`)
- Vanity service (`VANITY_SERVICE_URL=/api/vanity`, `VANITY_API_KEY`, `VANITY_COST_LAMPORTS`, `VANITY_MAX_ATTEMPTS`)
- Name service (`NAME_SERVICE_RPC=/api/name`, `NAME_SERVICE_API_KEY`, `NAME_ACCOUNT_SPACE`)
- Telegram bot (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_CHAT_ID`)
- Observability (`LOG_LEVEL`, `SENTRY_DSN`)

The project’s `.gitignore` already ignores `.env*`, `dist/`, `node_modules/`, and other generated artifacts.

## API routes (production surface)

The Vercel deploy now exposes real Solana-backed endpoints:

- `GET /api/health`
- `POST /api/payments/receipt`
- `POST /api/vanity`
- `POST /api/name/lookup`
- `POST /api/name/mint`

These are the contracts the generated components call by default.

## Telegram webhook service (operations only)

The webhook (see `src/server/telegram/index.ts`) exposes `POST /webhook`. It is intended for the SeekerMigrate operations team to monitor app events (wallet connects, payments, vanity/name-service flows) and is not part of the public SKR experience. The mobile app can emit:

```json
{
  "eventType": "payment_request",
  "payload": {
    "publicKey": "PUBLISHED_KEY",
    "amountLamports": 75000,
    "memo": "Order #1234"
  }
}
```

The handler verifies `x-telegram-webhook-secret`, forwards the message to the admin chat, and returns a 202 response.

Every deployment must set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `TELEGRAM_ADMIN_CHAT_ID` via `.env` or Vercel environment variables.

## Development & testing

1. `npm install`
2. `npm run build`
3. `npm run lint`
4. `npm run test`

Before QA builds:

- Run the CLI against a staging Firebase project and hydrate `seekermigrate-output/` into your mobile app.
- Manually test wallet connects, payment transfers, vanity requests, and name lookups/mints on simulators and devices.
- Verify `/api/health` returns 200, then test `/webhook` with the shared secret header.

## Resources

- [Solana Mobile Documentation](https://docs.solanamobile.com/)
- [Mobile Wallet Adapter](https://github.com/solana-mobile/mobile-wallet-adapter)
- [Solana dApp Store](https://dappstore.solanamobile.com/)
- [Seeker Documentation](https://docs.solanamobile.com/seeker)

## License

MIT
