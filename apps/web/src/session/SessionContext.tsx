import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createSafeStorage, type StorageLike } from './storage';

export type ProfilePresetId = '' | 'indie' | 'studio' | 'protocol' | 'tooling';

export const PROFILE_PRESETS: Record<Exclude<ProfilePresetId, ''>, {
  label: string;
  tagline: string;
  description: string;
}> = {
  indie: {
    label: 'Indie builder',
    tagline: 'Indie builder shipping on Seeker.',
    description: 'A focused, mobile-first dApp built for Solana Mobile users.',
  },
  studio: {
    label: 'Studio / agency',
    tagline: 'Studio delivering production Solana Mobile apps.',
    description: 'We ship end-to-end mobile builds: wallet auth, payments, and on-chain identity.',
  },
  protocol: {
    label: 'Protocol / infra',
    tagline: 'Infra powering Solana Mobile.',
    description: 'Protocol + SDKs for secure mobile signing and great UX.',
  },
  tooling: {
    label: 'Tooling / devtools',
    tagline: 'Devtools for Solana Mobile.',
    description: 'Tooling that makes migrations, testing, and shipping faster.',
  },
};

export type SessionState = {
  wallet: {
    connected: boolean;
    publicKey: string | null;
  };
  flags: {
    disclosureAccepted: boolean;
    devkitRan: boolean;
  };
  identity: {
    vanitySuffix: string;
  };
  profile: {
    walletAddress: string;
    displayName: string;
    projectName: string;
    tagline: string;
    description: string;
    website: string;
    email: string;
    x: string;
    telegram: string;
    discord: string;
    store: string;
    avatarId: string;
    presetId: ProfilePresetId;
    updatedAt: string;
  };
  devkit: {
    lastRunAt: string | null;
  };
};

export type SessionContextValue = {
  state: SessionState;
  acceptDisclosure: () => void;
  connectWallet: (publicKey?: string) => void;
  disconnectWallet: () => void;
  setVanitySuffix: (value: string) => void;
  setProfileField: (field: keyof SessionState['profile'], value: string) => void;
  setProfileAvatar: (avatarId: string) => void;
  setProfilePreset: (presetId: ProfilePresetId) => void;
  applyProfilePreset: (presetId: ProfilePresetId) => void;
  markDevkitRun: () => void;
};

const STORAGE_KEY = 'seekermigrate.web.session';

const defaultState: SessionState = {
  wallet: {
    connected: false,
    publicKey: null,
  },
  flags: {
    disclosureAccepted: false,
    devkitRan: false,
  },
  identity: {
    vanitySuffix: '',
  },
  profile: {
    walletAddress: '',
    displayName: '',
    projectName: '',
    tagline: '',
    description: '',
    website: '',
    email: '',
    x: '',
    telegram: '',
    discord: '',
    store: '',
    avatarId: 'icon-raven-chain',
    presetId: '',
    updatedAt: new Date().toISOString(),
  },
  devkit: {
    lastRunAt: null,
  },
};

const mergeState = (raw: Partial<SessionState> | null): SessionState => {
  if (!raw) return defaultState;

  return {
    ...defaultState,
    ...raw,
    wallet: { ...defaultState.wallet, ...raw.wallet },
    flags: { ...defaultState.flags, ...raw.flags },
    identity: { ...defaultState.identity, ...raw.identity },
    profile: { ...defaultState.profile, ...raw.profile },
    devkit: { ...defaultState.devkit, ...raw.devkit },
  };
};

const loadState = (storage: StorageLike): SessionState => {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    const parsed = JSON.parse(stored) as Partial<SessionState> | null;
    return mergeState(parsed);
  } catch (error) {
    return defaultState;
  }
};

const saveState = (storage: StorageLike, state: SessionState) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage errors and keep in-memory state.
  }
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const storage = useMemo(() => createSafeStorage(), []);
  const [state, setState] = useState<SessionState>(() => loadState(storage));

  const acceptDisclosure = useCallback(() => {
    setState((prev) => ({
      ...prev,
      flags: { ...prev.flags, disclosureAccepted: true },
    }));
  }, []);

  const connectWallet = useCallback((publicKey?: string) => {
    const key = publicKey || 'DEMO_WALLET_PUBLIC_KEY';
    setState((prev) => ({
      ...prev,
      wallet: {
        connected: true,
        publicKey: key,
      },
      profile: {
        ...prev.profile,
        walletAddress: prev.profile.walletAddress || key,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const disconnectWallet = useCallback(() => {
    setState((prev) => ({
      ...prev,
      wallet: {
        connected: false,
        publicKey: null,
      },
    }));
  }, []);

  const setVanitySuffix = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        vanitySuffix: value,
      },
    }));
  }, []);

  const setProfileField = useCallback((field: keyof SessionState['profile'], value: string) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const setProfileAvatar = useCallback((avatarId: string) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        avatarId,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const setProfilePreset = useCallback((presetId: ProfilePresetId) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        presetId,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const applyProfilePreset = useCallback((presetId: ProfilePresetId) => {
    if (!presetId) return;

    const preset = PROFILE_PRESETS[presetId];
    if (!preset) return;

    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        presetId,
        tagline: preset.tagline,
        description: preset.description,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const markDevkitRun = useCallback(() => {
    setState((prev) => ({
      ...prev,
      flags: { ...prev.flags, devkitRan: true },
      devkit: { lastRunAt: new Date().toISOString() },
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      acceptDisclosure,
      connectWallet,
      disconnectWallet,
      setVanitySuffix,
      setProfileField,
      setProfileAvatar,
      setProfilePreset,
      applyProfilePreset,
      markDevkitRun,
    }),
    [
      state,
      acceptDisclosure,
      connectWallet,
      disconnectWallet,
      setVanitySuffix,
      setProfileField,
      setProfileAvatar,
      setProfilePreset,
      applyProfilePreset,
      markDevkitRun,
    ]
  );

  React.useEffect(() => {
    saveState(storage, state);
  }, [state, storage]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
};
