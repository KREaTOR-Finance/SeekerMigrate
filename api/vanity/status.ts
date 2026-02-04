import type { VercelRequest, VercelResponse } from '@vercel/node';

type VanityStatusPayload = {
  requestId?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<VanityStatusPayload> | undefined;
  const requestId = (payload?.requestId ?? '').toString().trim();
  if (!requestId) return res.status(400).json({ error: 'requestId is required' });

  const serviceUrl = process.env.VANITY_SERVICE_URL;
  if (!serviceUrl) {
    return res.status(501).json({
      error: 'Vanity service is not configured (VANITY_SERVICE_URL missing).',
      requestId,
    });
  }

  const apiKey = process.env.VANITY_SERVICE_KEY;

  const upstream = await fetch(serviceUrl.replace(/\/+$/, '') + '/status', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ requestId }),
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
      error: data?.error ?? 'Vanity service status failed',
      status: upstream.status,
    });
  }

  return res.status(200).json({
    requestId,
    status: data.status ?? 'unknown',
    etaSeconds: data.etaSeconds ?? null,
    attempts: data.attempts ?? null,
    address: data.address ?? null,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  });
}
