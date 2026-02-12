import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  loadPersistedOnboarding,
  persistDisclosure,
  persistIdentityProfile,
  persistOnboardingMode,
  persistTutorialSeen,
} from '../../../../packages/api/src';
import { isIdentityComplete } from '../../../../packages/identity/src';
import { createInitialOnboardingStatus, onboardingReducer, canAccessMigrate } from '../../../../packages/state/src';
import type { IdentityProfile, OnboardingMode, OnboardingStatus } from '../../../../packages/types/src';
import { useWallet } from '../wallet/WalletContext';
import { secureOnboardingStorage } from './storage';

type OnboardingContextValue = {
  ready: boolean;
  status: OnboardingStatus;
  identityProfile: IdentityProfile | null;
  setTutorialSeen: (value: boolean) => Promise<void>;
  setOnboardingMode: (mode: OnboardingMode) => Promise<void>;
  setDisclosureAccepted: (value: boolean) => Promise<void>;
  saveIdentityProfile: (profile: IdentityProfile | null) => Promise<void>;
  canOpenMigrate: boolean;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus>(() => createInitialOnboardingStatus());
  const [identityProfile, setIdentityProfile] = useState<IdentityProfile | null>(null);

  useEffect(() => {
    (async () => {
      const persisted = await loadPersistedOnboarding(secureOnboardingStorage);
      setIdentityProfile(persisted.identityProfile);
      setStatus((prev) =>
        onboardingReducer(
          onboardingReducer(
            onboardingReducer(
              onboardingReducer(
                onboardingReducer(prev, { type: 'TUTORIAL_SEEN', seen: persisted.tutorialSeen }),
                { type: 'MODE_SELECTED', mode: persisted.onboardingMode }
              ),
              { type: 'DISCLOSURE_ACCEPTED', accepted: persisted.disclosureAccepted }
            ),
            { type: 'WALLET_CONNECTED', connected: Boolean(wallet.publicKey) }
          ),
          { type: 'IDENTITY_UPDATED', completed: isIdentityComplete(persisted.identityProfile) }
        )
      );
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    setStatus((prev) => onboardingReducer(prev, { type: 'WALLET_CONNECTED', connected: Boolean(wallet.publicKey) }));
  }, [wallet.publicKey]);

  useEffect(() => {
    setStatus((prev) => onboardingReducer(prev, { type: 'IDENTITY_UPDATED', completed: isIdentityComplete(identityProfile) }));
  }, [identityProfile]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ready,
      status,
      identityProfile,
      async setTutorialSeen(value: boolean) {
        setStatus((prev) => onboardingReducer(prev, { type: 'TUTORIAL_SEEN', seen: value }));
        await persistTutorialSeen(secureOnboardingStorage, value);
      },
      async setOnboardingMode(mode: OnboardingMode) {
        setStatus((prev) => onboardingReducer(prev, { type: 'MODE_SELECTED', mode }));
        await persistOnboardingMode(secureOnboardingStorage, mode);
      },
      async setDisclosureAccepted(value: boolean) {
        setStatus((prev) => onboardingReducer(prev, { type: 'DISCLOSURE_ACCEPTED', accepted: value }));
        await persistDisclosure(secureOnboardingStorage, value);
      },
      async saveIdentityProfile(profile: IdentityProfile | null) {
        setIdentityProfile(profile);
        await persistIdentityProfile(secureOnboardingStorage, profile);
      },
      canOpenMigrate: canAccessMigrate(status),
    }),
    [ready, status, identityProfile]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('OnboardingProvider missing');
  return value;
}
