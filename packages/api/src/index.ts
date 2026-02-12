import type { IdentityProfile, OnboardingMode } from '../../types/src';

export type PersistedOnboarding = {
  tutorialSeen: boolean;
  onboardingMode: OnboardingMode;
  disclosureAccepted: boolean;
  identityProfile: IdentityProfile | null;
};

export interface OnboardingStorageApi {
  load(): Promise<PersistedOnboarding>;
  saveTutorialSeen(value: boolean): Promise<void>;
  saveOnboardingMode(mode: OnboardingMode): Promise<void>;
  saveDisclosureAccepted(value: boolean): Promise<void>;
  saveIdentityProfile(profile: IdentityProfile | null): Promise<void>;
}

export async function loadPersistedOnboarding(storage: OnboardingStorageApi): Promise<PersistedOnboarding> {
  return storage.load();
}

export async function persistTutorialSeen(storage: OnboardingStorageApi, value: boolean): Promise<void> {
  await storage.saveTutorialSeen(value);
}

export async function persistOnboardingMode(storage: OnboardingStorageApi, mode: OnboardingMode): Promise<void> {
  await storage.saveOnboardingMode(mode);
}

export async function persistDisclosure(storage: OnboardingStorageApi, value: boolean): Promise<void> {
  await storage.saveDisclosureAccepted(value);
}

export async function persistIdentityProfile(
  storage: OnboardingStorageApi,
  profile: IdentityProfile | null
): Promise<void> {
  await storage.saveIdentityProfile(profile);
}
