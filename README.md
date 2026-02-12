# SeekerMigrate

SeekerMigrate started as a migration CLI and now powers a Solana Mobile onboarding experience for Solana Seeker (SKR) users. The repo still contains the CLI/analyzer for developers, but what SKR users open is the mobile app that embeds the generated wallet, payment, vanity, and name-service components. The Telegram bot is an operational tool for the team, not something end users interact with.

Auth conversion and the migration report are free. Full migration delivery unlocks per wallet after the user completes wallet identity setup.

- **Wallet authentication:** existing analyzer + generator output still provides `WalletConnectButton`, `WalletAuthContext`, and `SolanaWalletProvider`.
- **Payments:** the new `WalletPaymentModule` component wires a connected Solana wallet to a merchant account and an optional payment backend.
- **Vanity wallet generator:** `VanityWalletGenerator` lets your app request custom prefixes from a backend service and shows the generated address.
- **Name service:** SeekerMigrate issues `.skr`, `.seeker`, `.seismic`, and `.sol` names. Non-`.sol` TLDs map to on-chain SNS `.sol` domains.
- **Telegram webhook service:** `/webhook` receives anonymized mobile events and forwards them to the admin chat defined in `.env`.

Each feature can be scaffolded through `npx seekermigrate auth`/`analyze`, which writes all of the components above into your output directory.

The deployed production surface is mobile-first (Solana Mobile dApp Store app + API routes under `/api/*` + operations webhook at `/webhook`). The web app in `apps/web` is retained only as an internal emulator/dev-client for testing.

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
- Payment rails (`PAYMENTS_PROVIDER`, `PAYMENTS_ENDPOINT=/api/payments`, `PAYMENTS_API_KEY`, `PAYMENT_MERCHANT_ADDRESS`, `PAYMENT_MERCHANT_LABEL`, `STRIPE_SECRET_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`)
- Vanity service (`VANITY_SERVICE_URL=/api/vanity`, `VANITY_API_KEY`, `VANITY_COST_LAMPORTS`, `VANITY_MAX_ATTEMPTS`)
- Name service (`NAME_SERVICE_RPC=/api/name`, `NAME_SERVICE_API_KEY`, `NAME_ACCOUNT_SPACE`)
- Telegram bot (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_CHAT_ID`)
- Observability (`LOG_LEVEL`, `SENTRY_DSN`)

The project’s `.gitignore` already ignores `.env*`, `dist/`, `node_modules/`, and other generated artifacts.

## API routes (production surface)

The Vercel deploy now exposes real Solana-backed endpoints:

- `GET /api/health`
- `POST /api/payments/receipt`
- `POST /api/payments/stripe-session`
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

## Mobile app (Expo)

An Expo-first mobile app scaffold lives in `apps/mobile`.

- Uses Expo Router + Tamagui (polish pass in progress)
- Targets Solana Mobile dApp Store (Android APK)
- Configure backend base URL with `EXPO_PUBLIC_API_BASE_URL`

See: `apps/mobile/README.md`

## Resources

- [Solana Mobile Documentation](https://docs.solanamobile.com/)
- [Mobile Wallet Adapter](https://github.com/solana-mobile/mobile-wallet-adapter)
- [Solana dApp Store](https://dappstore.solanamobile.com/)
- [Seeker Documentation](https://docs.solanamobile.com/seeker)

## License

MIT


## Web surface policy

- pps/web is **internal/testing-only** (emulator/dev-client validation).
- Public product surface is mobile (pps/mobile) for Solana Mobile dApp Store.
- Legacy web onboarding routes/screens were pruned to reduce accidental public use and maintenance risk.

