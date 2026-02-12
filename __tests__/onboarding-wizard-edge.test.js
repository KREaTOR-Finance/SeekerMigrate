import { describe, test, expect } from '@jest/globals';
import { getMigrateGuardMessage } from '../packages/migrate/src/index.ts';
import { onboardingReducer, toOnboardingStatus } from '../packages/state/src/index.ts';
import { isIdentityComplete } from '../packages/identity/src/index.ts';
import { loadPersistedOnboarding } from '../packages/api/src/index.ts';

describe('onboarding wizard edge cases', () => {
  test('access migrate without disclosure is blocked', () => {
    const status = toOnboardingStatus({
      tutorialSeen: true,
      onboardingMode: 'identity-first',
      disclosureAccepted: false,
      walletConnected: true,
      identityCompleted: true,
    });
    expect(getMigrateGuardMessage(status)).toContain('Accept disclosure');
  });

  test('access migrate without wallet is blocked', () => {
    const status = toOnboardingStatus({
      tutorialSeen: true,
      onboardingMode: 'identity-first',
      disclosureAccepted: true,
      walletConnected: false,
      identityCompleted: true,
    });
    expect(getMigrateGuardMessage(status)).toContain('Connect a wallet');
  });

  test('access migrate with incomplete identity is blocked for identity-first', () => {
    const partial = { walletAddress: 'abc' };
    const status = toOnboardingStatus({
      tutorialSeen: true,
      onboardingMode: 'identity-first',
      disclosureAccepted: true,
      walletConnected: true,
      identityCompleted: isIdentityComplete(partial),
    });
    expect(status.identityCompleted).toBe(false);
    expect(getMigrateGuardMessage(status)).toContain('Complete Seeker Identity');
  });

  test('wallet disconnect mid-flow sends user back to wallet step', () => {
    const ready = toOnboardingStatus({
      tutorialSeen: true,
      onboardingMode: 'identity-first',
      disclosureAccepted: true,
      walletConnected: true,
      identityCompleted: true,
    });
    const afterDisconnect = onboardingReducer(ready, { type: 'WALLET_CONNECTED', connected: false });
    expect(afterDisconnect.currentStep).toBe('wallet');
    expect(getMigrateGuardMessage(afterDisconnect)).toContain('Connect a wallet');
  });

  test('resume after restart from persisted state restores migration-only path', async () => {
    const storage = {
      async load() {
        return {
          tutorialSeen: true,
          onboardingMode: 'migration-only',
          disclosureAccepted: true,
          identityProfile: null,
        };
      },
      async saveTutorialSeen() {},
      async saveOnboardingMode() {},
      async saveDisclosureAccepted() {},
      async saveIdentityProfile() {},
    };

    const persisted = await loadPersistedOnboarding(storage);
    const resumed = toOnboardingStatus({
      tutorialSeen: persisted.tutorialSeen,
      onboardingMode: persisted.onboardingMode,
      disclosureAccepted: persisted.disclosureAccepted,
      walletConnected: true,
      identityCompleted: isIdentityComplete(persisted.identityProfile),
    });

    expect(resumed.currentStep).toBe('migrate');
    expect(getMigrateGuardMessage(resumed)).toBeNull();
  });
});
