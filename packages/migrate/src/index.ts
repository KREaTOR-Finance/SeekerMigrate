import type { MigrationCapability, OnboardingStatus } from '../../types/src';

export function getMigrateGuardMessage(status: OnboardingStatus): string | null {
  if (!status.tutorialSeen) return 'Finish the quickstart tutorial before continuing.';
  if (!status.disclosureAccepted) return 'Accept disclosure first to continue.';
  if (!status.walletConnected) return 'Connect a wallet before starting migration.';
  if (status.onboardingMode !== 'migration-only' && !status.identityCompleted) {
    return 'Complete Seeker Identity before opening Seeker Migration.';
  }
  return null;
}

export function migrationCapability(status: OnboardingStatus): MigrationCapability {
  const reason = getMigrateGuardMessage(status);
  return {
    canRunMigration: !reason,
    reason: reason ?? undefined,
  };
}

export function migrationPlanSteps(): string[] {
  return [
    'Analyze codebase for Firebase/email-auth assumptions',
    'Generate migration diffs and module stubs',
    'Run wallet unlock and apply generated modules',
    'Validate with staging and Solana Mobile QA pass',
  ];
}
