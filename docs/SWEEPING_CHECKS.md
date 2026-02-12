# Sweeping Checks (Forward-Facing)

Run these checks before shipping onboarding/migration changes.

## Quick run

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sweeping-checks.ps1
```

Optional API smoke against a running backend:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sweeping-checks.ps1 -ApiBaseUrl http://localhost:5055
```

## Checklist

- [ ] Typecheck root workspace (`npm run typecheck`)
- [ ] Typecheck mobile app (`npm run typecheck:mobile`)
- [ ] Run onboarding edge tests (`npm run test -- onboarding-wizard-edge`)
- [ ] Run full test suite (`npm run test`)
- [ ] Validate local API health + webhook smoke (`scripts/smoke-backend.ps1`)
- [ ] Manual UX pass:
  - [ ] First-run tutorial appears
  - [ ] Migration-only entry can reach `/migrate` without identity
  - [ ] Identity-first default still blocks `/migrate` until identity complete
  - [ ] Wallet disconnect forces return to wallet step
  - [ ] App restart resumes previous onboarding state

## Notes

- Keep this pass local-only unless a release branch is explicitly requested.
- Do not commit secrets; use `.env`, `.env.local`, or `.molt` only for local values.
