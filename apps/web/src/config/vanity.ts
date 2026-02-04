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

async function postJson<T>(url: string, payload: any): Promise<T> {
  const resp = await fetch(url, {
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

export const vanity = {
  request: (payload: { suffix: string; requester: string; cluster: 'mainnet-beta' | 'devnet' | 'testnet' }) =>
    postJson<VanityRequestResponse>('/api/vanity/request', payload),
  status: (payload: { requestId: string }) => postJson<VanityStatusResponse>('/api/vanity/status', payload),
  challenge: (payload: { requestId: string; requester: string }) =>
    postJson<VanityChallengeResponse>('/api/vanity/challenge', payload),
  reveal: (payload: { requestId: string; requester: string; message: string; messageSignature: string }) =>
    postJson<VanityRevealResponse>('/api/vanity/reveal', payload),
};
