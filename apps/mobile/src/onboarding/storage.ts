import * as SecureStore from 'expo-secure-store';
import type { OnboardingStorageApi, PersistedOnboarding } from '../../../../packages/api/src';
import type { IdentityProfile, OnboardingMode } from '../../../../packages/types/src';

const KEY_TUTORIAL_SEEN = 'seekermigrate.tutorial.seen';
const KEY_ONBOARDING_MODE = 'seekermigrate.onboarding.mode';
const KEY_DISCLOSURE = 'seekermigrate.disclosure.accepted';
const KEY_IDENTITY = 'seekermigrate.identity.profile';

function parseMode(value: string | null): OnboardingMode {
  return value === 'migration-only' ? 'migration-only' : 'identity-first';
}

export const secureOnboardingStorage: OnboardingStorageApi = {
  async load(): Promise<PersistedOnboarding> {
    const [tutorialSeenRaw, modeRaw, disclosureAccepted, identityRaw] = await Promise.all([
      SecureStore.getItemAsync(KEY_TUTORIAL_SEEN),
      SecureStore.getItemAsync(KEY_ONBOARDING_MODE),
      SecureStore.getItemAsync(KEY_DISCLOSURE),
      SecureStore.getItemAsync(KEY_IDENTITY),
    ]);

    let identityProfile: IdentityProfile | null = null;
    if (identityRaw) {
      try {
        identityProfile = JSON.parse(identityRaw) as IdentityProfile;
      } catch {
        identityProfile = null;
      }
    }

    return {
      tutorialSeen: tutorialSeenRaw === 'yes',
      onboardingMode: parseMode(modeRaw),
      disclosureAccepted: disclosureAccepted === 'yes',
      identityProfile,
    };
  },

  async saveTutorialSeen(value: boolean): Promise<void> {
    if (value) return SecureStore.setItemAsync(KEY_TUTORIAL_SEEN, 'yes');
    return SecureStore.deleteItemAsync(KEY_TUTORIAL_SEEN);
  },

  async saveOnboardingMode(mode: OnboardingMode): Promise<void> {
    await SecureStore.setItemAsync(KEY_ONBOARDING_MODE, mode);
  },

  async saveDisclosureAccepted(value: boolean): Promise<void> {
    if (value) {
      await SecureStore.setItemAsync(KEY_DISCLOSURE, 'yes');
      return;
    }

    await SecureStore.deleteItemAsync(KEY_DISCLOSURE);
  },

  async saveIdentityProfile(profile: IdentityProfile | null): Promise<void> {
    if (!profile) {
      await SecureStore.deleteItemAsync(KEY_IDENTITY);
      return;
    }

    await SecureStore.setItemAsync(KEY_IDENTITY, JSON.stringify(profile));
  },
};
