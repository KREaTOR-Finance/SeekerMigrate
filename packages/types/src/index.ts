export type OnboardingStep = 'tutorial' | 'disclosure' | 'wallet' | 'identity' | 'migrate' | 'complete';
export type OnboardingMode = 'identity-first' | 'migration-only';

export type OnboardingStatus = {
  tutorialSeen: boolean;
  onboardingMode: OnboardingMode;
  disclosureAccepted: boolean;
  walletConnected: boolean;
  identityCompleted: boolean;
  currentStep: OnboardingStep;
};

export type OnboardingEvent =
  | { type: 'TUTORIAL_SEEN'; seen: boolean }
  | { type: 'MODE_SELECTED'; mode: OnboardingMode }
  | { type: 'DISCLOSURE_ACCEPTED'; accepted: boolean }
  | { type: 'WALLET_CONNECTED'; connected: boolean }
  | { type: 'IDENTITY_UPDATED'; completed: boolean };

export type IdentityProfile = {
  walletAddress: string;
  canonicalName?: string;
  vanityAddress?: string;
};

export type MigrationCapability = {
  canRunMigration: boolean;
  reason?: string;
};
