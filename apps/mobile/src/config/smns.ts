import { postJson } from './api';

export type SmnsLookupResponse = {
  name: string;
  canonicalName: string;
  mirrorName: string;
  owner: string | null;
  available: boolean;
  status: string;
  updatedAt: string | null;
  namespace: 'smns';
};

export type SmnsChallengeResponse = {
  ok: true;
  action: string;
  owner: string;
  displayName: string;
  canonicalName: string;
  mirrorName: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

export type SmnsRegisterResponse = {
  ok: true;
  product: string;
  name: string;
  canonicalName: string;
  mirrorName: string;
  owner: string;
  treasury: string;
  paymentSignature: string;
  paidLamports: number;
  requiredLamports: number;
  cluster: string;
  rpc: string;
};

export async function smnsLookup(payload: { name: string; tld?: string }) {
  return postJson<SmnsLookupResponse>('/api/smns/lookup', payload);
}

export async function smnsChallenge(payload: {
  owner: string;
  action: 'register' | 'set-primary' | 'create-subdomain';
  name: string;
  tld?: string;
  subdomain?: string;
}) {
  return postJson<SmnsChallengeResponse>('/api/smns/challenge', payload);
}

export async function smnsRegister(payload: {
  owner: string;
  name: string;
  tld?: string;
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
  nonce: string;
  message: string;
  messageSignature: string;
  paymentSignature: string;
  product?: 'smns_name' | 'vanity' | 'devkit' | 'profile_badge_service';
}) {
  return postJson<SmnsRegisterResponse>('/api/smns/register', payload);
}
