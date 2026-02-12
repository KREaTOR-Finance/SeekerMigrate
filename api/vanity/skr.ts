import type { VercelRequest, VercelResponse } from '@vercel/node';

type Payload = {
  requester?: string;
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = (req.body ?? {}) as Payload;
  const requester = (payload.requester ?? '').toString().trim();
  if (!requester) return res.status(400).json({ error: 'requester is required' });

  const cluster = payload.cluster ?? 'mainnet-beta';

  const serviceUrl = process.env.VANITY_SERVICE_URL;
  if (!serviceUrl) {
    return res.status(501).json({
      error: 'Vanity service is not configured (VANITY_SERVICE_URL missing).',
      cluster,
    });
  }

  const apiKey = process.env.VANITY_SERVICE_KEY;

  const upstream = await fetch(serviceUrl.replace(/\/+$/, '') + '/request', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ mode: 'prefix', prefix: 'SKR', requester, cluster }),
  });

  const text = await upstream.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    return res.status(502).json({
      error: data?.error ?? 'Vanity service request failed',
      status: upstream.status,
    });
  }

  return res.status(200).json({
    requestId: data.requestId ?? data.id ?? null,
    mode: 'prefix',
    prefix: 'SKR',
    cluster,
    status: data.status ?? 'queued',
    etaSeconds: data.etaSeconds ?? null,
    attempts: data.attempts ?? null,
    address: data.address ?? null,
    note: 'Fixed SKR vanity generation runs out-of-process; poll status if requestId is present.',
  });
}
