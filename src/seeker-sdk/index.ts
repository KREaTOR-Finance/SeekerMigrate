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

async function postJson<T>(baseUrl: string, path: string, payload: any): Promise<T> {
  const resp = await fetch(baseUrl.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) throw new Error(data?.error ?? `Request failed (${resp.status})`);
  return data as T;
}

export function createSeekerSdk(opts: { baseUrl: string }) {
  const baseUrl = opts.baseUrl;

  return {
    lookup: (args: { name: string; tld?: string }) => postJson<SmnsLookupResponse>(baseUrl, '/api/smns/lookup', args),
    challenge: (args: {
      owner: string;
      action: 'register' | 'set-primary' | 'create-subdomain';
      name: string;
      tld?: string;
      subdomain?: string;
    }) => postJson<SmnsChallengeResponse>(baseUrl, '/api/smns/challenge', args),
    register: (args: {
      owner: string;
      name: string;
      tld?: string;
      cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
      nonce: string;
      message: string;
      messageSignature: string;
      paymentSignature: string;
      product?: 'smns_name' | 'vanity' | 'devkit' | 'profile_badge_service';
    }) => postJson<SmnsRegisterResponse>(baseUrl, '/api/smns/register', args),
  };
}
