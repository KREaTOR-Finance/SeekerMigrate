# Mobile-First Migration Map (Identity → Migrate)

## What changed in this pass

- `apps/mobile` is now the primary onboarding shell.
- New shared domain packages added under `packages/*`:
  - `packages/types`
  - `packages/state`
  - `packages/identity`
  - `packages/migrate`
  - `packages/api`
- Unified onboarding state machine now gates migration with a selectable branch:
  - **Identity-first (default):** requires identity completion before migrate.
  - **Migration-only:** allows direct migrate after disclosure + wallet.

## New canonical onboarding paths

### Default store onboarding (preserved)
1. `tutorial`
2. `disclosure`
3. `wallet`
4. `identity`
5. `migrate`

### Migration-only path (new)
1. `tutorial`
2. `disclosure`
3. `wallet`
4. `migrate`

`apps/mobile/app/index.tsx` redirects from machine state instead of hardcoded routes.

## Active code paths (kept)

- `apps/mobile/app/tutorial.tsx` (new quickstart + branch selector)
- `apps/mobile/app/(tabs)/identity.tsx` (identity flow + SMNS/vanity operations)
- `apps/mobile/app/migrate.tsx` (post-identity or migration-only entry)
- `apps/mobile/app/devkit.tsx` and `apps/mobile/app/(tabs)/unlock.tsx` (legacy migrate sub-steps still wired)
- `apps/web/src/*` (compatibility web shell)

## Wizard gap assessment

### Closed in this pass
- Added explicit branch selection for migration-only users in first-run tutorial + disclosure mode selector.
- Added persisted onboarding mode (`identity-first` vs `migration-only`) in secure storage.
- Guard logic now respects onboarding mode while keeping identity-first default.

### Remaining gap to full wizard
- No dedicated role detection backend yet (still user-selected intent).
- No analytics instrumentation on branch selection/dropoff yet.
- No multi-screen “wizard shell” with progress breadcrumbs; current flow is route-driven.

## Remaining migration tasks (next executable steps)

1. Add backend/user-profile signal to auto-suggest migration-only mode.
2. Move remaining API-side contract code from mobile screens into `packages/api` client modules.
3. Replace tab-centric `devkit`/`unlock` navigation with `/migrate/*` nested routes.
4. Convert web shell to read-only marketing/docs surface, then remove critical onboarding logic from web.
5. Add app-level integration tests for route redirects (beyond package-level unit tests).
