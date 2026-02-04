# SHIP.md — SeekerMigrate (Vercel backend + Solana Mobile dApp Store)

This is the **Definition of Done** + repeatable release pipeline for SeekerMigrate.

## What we’re shipping

1) **Backend + landing (Vercel)**
- `/` landing
- `/api/*` endpoints
- `/webhook` Telegram ops hook

2) **Mobile app (Expo / Android)**
- Expo-first app in `apps/mobile`
- Intended distribution: **Solana Mobile dApp Store** (APK/AAB)

---

## Release targets

### Backend (Vercel)
- Environment: staging + prod (recommended)
- Must pass `/api/health` after deploy

### Mobile (Solana Mobile dApp Store)
- Release build (not dev-client)
- Mainnet config for store builds
- Uses `EXPO_PUBLIC_API_BASE_URL` pointing at `https://api.seekermigrate.com`
- Needs a stable Android package name (applicationId) before store submission

---

## Shipping gates (hard requirements)

### Code quality
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`

### Secrets + env hygiene
- [ ] `.env` is NOT committed
- [ ] `.env.example` is updated if new vars exist
- [ ] Vercel env vars set (staging + prod)
- [ ] All logs redact secrets (`TELEGRAM_WEBHOOK_SECRET`, payment/name/vanity keys)

### Backend smoke tests (post-deploy)
- [ ] `GET /api/health` returns 200
- [ ] `POST /webhook` with correct `x-telegram-webhook-secret` returns 202
- [ ] Critical endpoints respond:
  - [ ] `POST /api/name/lookup`
  - [ ] `POST /api/vanity`
  - [ ] `POST /api/payments/receipt`

### Mobile smoke tests
- [ ] `apps/mobile` can run a dev build: `npx expo run:android` (first time) + `npx expo start --dev-client`
- [ ] Wallet connect works on a physical device
- [ ] API calls hit the right backend (`EXPO_PUBLIC_API_BASE_URL`)
- [ ] A release build is produced (APK/AAB) and installed on a device

### Release notes
- [ ] Version bump captured (backend + mobile if separate)
- [ ] `MIGRATION_REPORT.md` changes summarized if relevant

---

## Recommended release flow

### 1) Preflight (local)
From repo root:
- `npm ci`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`

### 2) Deploy backend (Vercel)
- Deploy staging first
- Run smoke tests against staging
- Promote to prod

### 3) Build mobile release (EAS Build)
- Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/eas.json` to the prod Vercel URL
- Login once: `npm i -g eas-cli` then `cd apps/mobile && npm run eas:login`
- Internal test build (APK): `cd apps/mobile && npm run build:apk`
- Store build (AAB): `cd apps/mobile && npm run build:aab`
- Install on device and do smoke tests

### 4) Submit to Solana Mobile dApp Store
- Confirm store metadata (name, description, screenshots, privacy)
- Upload artifact (AAB)
- Post-submit: verify listing + install path

---

## Notes / gotchas

- Solana Mobile Wallet Adapter requires a **native build**; dev-client is for development only.
- Keep a staging backend URL for QA builds to avoid breaking prod.
