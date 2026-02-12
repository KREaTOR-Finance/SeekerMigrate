# Seeker Migrate Migration Map (Single Mobile App)

## Target architecture
- **Primary shell:** `apps/mobile` (Expo + React Native / Solana Mobile-first)
- **Primary user flow:**
  1. Seeker Identity (`/identity`)
  2. Seeker Migration (`/migrate`)
- **Gate rule:** Migration is blocked until Identity is complete.

## What is now canonical
- `apps/mobile/app/*` routes for disclosure, wallet, identity, migrate
- `apps/mobile/src/onboarding/OnboardingContext.tsx` as runtime gate/state integration
- Shared package scaffolding under `packages/*`:
  - `@seekermigrate/types`
  - `@seekermigrate/state`
  - `@seekermigrate/api`
  - `@seekermigrate/identity`
  - `@seekermigrate/migrate`

## Deprecated / legacy (kept temporarily)
- `apps/web` remains for legacy web preview and static flows; **not primary shipping shell**.
- `apps/mobile/app/(tabs)/*` routes are legacy scaffolding from earlier Expo template iterations.
  - `app/identity.tsx` now owns routing guard and reuses the identity implementation.
  - `(tabs)` is retained to avoid breaking existing deep links during migration.

## Root normalization notes
- Root now declares npm workspaces (`apps/*`, `packages/*`).
- `apps/mobile` references shared packages via local `file:` dependencies.
- Root scripts prioritize mobile bring-up and Solana Mobile developer workflow.

## Fast dev path for Solana Mobile app bring-up
From repo root:
1. `npm run dev:mobile:quick` (installs workspaces + starts dev-client mode)
2. `npm run dev:mobile:android` (open Android target quickly)
3. `npm run build:mobile:apk` (preview APK build)

## Remaining follow-ups
- Remove `(tabs)` routes fully once all navigation consumers are migrated.
- Decide whether `apps/web` stays as docs/demo shell or is archived.
