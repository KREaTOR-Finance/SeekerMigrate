# Seeker Device QA Checklist (Mobile-First)

## Scope
Validate the full onboarding funnel on Seeker hardware before release:
Welcome → Tutorial → Wallet → Identity → Migrate.

## Test Matrix
- Seeker device on latest stable firmware
- Wi-Fi: strong + weak network conditions
- Wallet states: no wallet, fresh wallet, returning wallet
- Onboarding modes: identity-first + migration-only
- Cluster modes: mainnet-beta, devnet

## P0 UX Checks (must pass)
- [ ] Touch targets are comfortable (buttons and checkboxes feel easy to tap with one thumb)
- [ ] Primary CTA is always visually obvious on each screen
- [ ] Loading states show clear progress language (no silent waits)
- [ ] Error states include a clear retry action
- [ ] Wallet connect flow always tells user what happens next
- [ ] Migration start path is deterministic (no ambiguous dead-end)
- [ ] Text contrast is readable in bright and dark environments
- [ ] Accessibility labels are announced for key actions (connect, continue, pay/register, request vanity)

## P1 Confidence & Recovery
- [ ] “What happens next” guidance appears on tutorial/migrate/critical transitions
- [ ] Success states feel trustworthy (connected, ready, registered)
- [ ] Stuck-state help exists (retry + support/learn-more path)
- [ ] Brand tone feels consistent: calm, confident, non-technical

## P2 Performance Feel
- [ ] Screen transitions feel smooth (no visible frame hitching)
- [ ] Polling/status updates do not freeze interaction
- [ ] Primary action buttons respond immediately to taps

## Regression Guardrails
- [ ] Existing onboarding guards still enforce required order
- [ ] Migration-only bypass works only where intended
- [ ] Wallet disconnect correctly updates downstream access
- [ ] Existing business logic and API integrations unchanged

## Evidence to Capture
- Screen recordings for complete happy path and one failure+retry path
- Screenshots of loading, error, and success states for wallet + identity actions
- Notes for any copy confusion from non-technical testers

## Sign-off
- QA owner:
- Device build:
- Date:
- Blockers:
