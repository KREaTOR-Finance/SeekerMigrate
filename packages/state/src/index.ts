import type { OnboardingEvent, OnboardingMode, OnboardingStatus, OnboardingStep } from '../../types/src';

export type OnboardingInput = Pick<
  OnboardingStatus,
  'tutorialSeen' | 'onboardingMode' | 'disclosureAccepted' | 'walletConnected' | 'identityCompleted'
>;

export function nextOnboardingStep(input: OnboardingInput): OnboardingStep {
  if (!input.tutorialSeen) return 'tutorial';
  if (!input.disclosureAccepted) return 'disclosure';
  if (!input.walletConnected) return 'wallet';
  if (input.onboardingMode !== 'migration-only' && !input.identityCompleted) return 'identity';
  return 'migrate';
}

export function toOnboardingStatus(input: OnboardingInput): OnboardingStatus {
  const step = nextOnboardingStep(input);
  return {
    ...input,
    currentStep: step,
  };
}

export function onboardingReducer(state: OnboardingStatus, event: OnboardingEvent): OnboardingStatus {
  switch (event.type) {
    case 'TUTORIAL_SEEN':
      return toOnboardingStatus({
        ...state,
        tutorialSeen: event.seen,
      });
    case 'MODE_SELECTED':
      return toOnboardingStatus({
        ...state,
        onboardingMode: event.mode,
      });
    case 'DISCLOSURE_ACCEPTED':
      return toOnboardingStatus({
        ...state,
        disclosureAccepted: event.accepted,
      });
    case 'WALLET_CONNECTED':
      return toOnboardingStatus({
        ...state,
        walletConnected: event.connected,
      });
    case 'IDENTITY_UPDATED':
      return toOnboardingStatus({
        ...state,
        identityCompleted: event.completed,
      });
    default:
      return state;
  }
}

export function createInitialOnboardingStatus(mode: OnboardingMode = 'identity-first'): OnboardingStatus {
  return toOnboardingStatus({
    tutorialSeen: false,
    onboardingMode: mode,
    disclosureAccepted: false,
    walletConnected: false,
    identityCompleted: false,
  });
}

export function canAccessMigrate(input: OnboardingInput): boolean {
  if (!input.tutorialSeen || !input.disclosureAccepted || !input.walletConnected) return false;
  if (input.onboardingMode === 'migration-only') return true;
  return input.identityCompleted;
}
