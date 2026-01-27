# Production Readiness

The SeekerMigrate repo now supports the full Solana mobile lifecycle that the SKR users experience: wallet authentication, in-app payments, vanity wallet issuance, and name-service lookups/mints. The Telegram alert bot is an operations-side service that surfaces events from those flows.

## Status snapshot

- **Authentication / Wallet connect:** the analyzer/generator still produces `WalletConnectButton`, `WalletAuthContext`, and `SolanaWalletProvider` for every auth migration run.
- **Payments:** `WalletPaymentModule` allows the mobile app to send lamports to a merchant address and notify your payment backend (`PAYMENTS_ENDPOINT`).
- **Vanity wallet generator:** `VanityWalletGenerator` submits prefix requests to your vanity service and surfaces the generated public key, ETA, and cost.
- **Name service:** `NameServiceLookup` handles SNS/Bonk lookups and mint submissions through your configured RPCs.
- **Telegram webhook bot:** `src/server/telegram/index.ts` is a TLS-backed endpoint that forwards wallet events to the admin chat (`TELEGRAM_ADMIN_CHAT_ID`) after validating `x-telegram-webhook-secret`.
- **Mock output removal:** `ios-output/` has been deleted; generated files now live in `seekermigrate-output/` per run.

## App build workflow

1. Run `npm install` and `npm run build` to compile the CLI (this also builds the supporting components in `dist/`).
2. Copy the generated assets into your mobile app or publish them as a package. Wrap your app with `SolanaWalletProvider` and replace Firebase login with `WalletConnectButton`.
3. Drop `WalletPaymentModule`, `VanityWalletGenerator`, and `NameServiceLookup` into the appropriate screens, wiring each component to the backend URLs/keys defined in `.env` (`PAYMENTS_ENDPOINT`, `VANITY_SERVICE_URL`, `NAME_SERVICE_RPC`, etc.).
4. Build the app for simulators and physical iOS/Android devices (including Solana Mobile Stack emulators) and verify wallet pairing, payment transfers, vanity requests, and name lookups/mints.
5. Execute the smoke tests listed below before tagging a release.

## Telegram bot workflow (ops only)

1. Provision a Telegram bot token via BotFather and set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `TELEGRAM_ADMIN_CHAT_ID` in `.env`.
2. Build the bot server (`npm run build`) so `dist/server/telegram/index.js` exists, then start it with `npm run telegram:start`.
3. Configure your mobile app (or payment backend) to POST structured events to `/webhook`, e.g. `{"eventType":"payment_request","payload":{"publicKey":"...","amountLamports":50000,"memo":"Order #1234"}}`.
4. The handler checks the `x-telegram-webhook-secret` header, formats the payload into a short summary, and calls Telegram’s `sendMessage` API for the admin chat.
5. Rotate `TELEGRAM_BOT_TOKEN`/secret per release and keep TLS certificates up to date.

## Environment & secrets

- Copy `.env.example` to `.env` for each host and populate RPC URLs, payment/vanity/name-service keys, Telegram tokens, and optional observability settings (log level, Sentry).
- Never commit `.env` or its secrets; `.gitignore` already excludes `.env*`, `dist/`, `node_modules/`, and `seekermigrate-output/`.
- Use short-lived keys when possible and disable developer tokens before handing the build to QA.
- Ensure any logs redact `TELEGRAM_WEBHOOK_SECRET` plus payment/name-service credentials.

## Testing checklist

- [ ] `npm run lint` (runs ESLint on `src/`).
- [ ] `npm run test` (Jest validations against the fixtures and analyzer).
- [ ] Run the CLI against a staging Firebase project and hydrate the generated components into a React Native build.
- [ ] Manually test wallet connect, payment checkout, vanity address issuance, and name-service lookups/mints on simulators/physical devices.
- [ ] Confirm Telegram webhook events for `wallet_connect`, `payment_request`, `vanity_request`, and `name_lookup` land in the admin chat.
- [ ] Verify Solana dApp Store compliance and log any outstanding items before submitting.

## Safeguards

- Keep `.gitignore` aligned with any new build artifacts or telemetry folders you add.
- Treat `.env.example` as a template; production secrets belong in environment variables only.
- Audit Telegram webhook activity regularly and monitor for unexpected payloads or replay attempts.
