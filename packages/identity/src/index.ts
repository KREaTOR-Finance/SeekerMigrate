import type { IdentityProfile } from '../../types/src';

export function isIdentityComplete(profile: IdentityProfile | null): boolean {
  if (!profile?.walletAddress) return false;
  return Boolean(profile.canonicalName || profile.vanityAddress);
}

export function identityChecklist(profile: IdentityProfile | null): Array<{ key: string; done: boolean; label: string }> {
  return [
    { key: 'wallet', done: Boolean(profile?.walletAddress), label: 'Wallet connected' },
    { key: 'name', done: Boolean(profile?.canonicalName), label: 'Canonical identity name set' },
    { key: 'vanity', done: Boolean(profile?.vanityAddress), label: 'Optional vanity address generated' },
  ];
}

export function identitySummary(profile: IdentityProfile | null): string {
  if (!profile) return 'No identity profile yet.';
  const canonical = profile.canonicalName ? `name=${profile.canonicalName}` : 'name=unset';
  const vanity = profile.vanityAddress ? `vanity=${profile.vanityAddress}` : 'vanity=unset';
  return `${canonical}, ${vanity}`;
}
