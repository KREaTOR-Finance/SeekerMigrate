import { postJson } from './api';

export type VanityRequestResponse = {
  requestId: string | null;
  suffix: string;
  cluster: string;
  status: string;
  etaSeconds: number | null;
  attempts: number | null;
  address: string | null;
};

export type VanityStatusResponse = {
  requestId: string;
  status: string;
  etaSeconds: number | null;
  attempts: number | null;
  address: string | null;
  updatedAt: string;
  error?: string;
};

export type VanityChallengeResponse = {
  ok: true;
  requestId: string;
  requester: string;
  message: string;
  nonce: string;
  issuedAt: string;
};

export type VanityRevealResponse = {
  requestId: string;
  address: string;
  secretKeyBase58: string;
  note?: string;
};

export async function requestVanity(payload: {
  suffix: string;
  requester: string;
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
}) {
  return postJson<VanityRequestResponse>('/api/vanity/request', payload);
}

export async function getVanityStatus(payload: { requestId: string }) {
  return postJson<VanityStatusResponse>('/api/vanity/status', payload);
}

export async function getVanityRevealChallenge(payload: { requestId: string; requester: string }) {
  return postJson<VanityChallengeResponse>('/api/vanity/challenge', payload);
}

export async function revealVanitySecret(payload: {
  requestId: string;
  requester: string;
  message: string;
  messageSignature: string;
}) {
  return postJson<VanityRevealResponse>('/api/vanity/reveal', payload);
}
