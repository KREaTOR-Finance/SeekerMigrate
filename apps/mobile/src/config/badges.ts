import { postJson } from './api';

export type BadgeChallengeResponse = {
  ok: true;
  owner: string;
  profileHash: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

export type BadgeRequestResponse = {
  ok: true;
  requestId: string;
  status: string;
};

export async function badgeChallenge(payload: { owner: string; profileJson: any }) {
  return postJson<BadgeChallengeResponse>('/api/badges/challenge', payload);
}

export async function badgeRequest(payload: {
  owner: string;
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
  nonce: string;
  message: string;
  messageSignature: string;
  paymentSignature: string;
  profileJson: any;
}) {
  return postJson<BadgeRequestResponse>('/api/badges/request', payload);
}
