import type { VercelRequest, VercelResponse } from '@vercel/node';

type VanityRevealPayload = {
  requestId?: string;
  requester?: string;
  message?: string;
  messageSignature?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<VanityRevealPayload> | undefined;
  const requestId = (payload?.requestId ?? '').toString().trim();
  const requester = (payload?.requester ?? '').toString().trim();
  const message = (payload?.message ?? '').toString();
  const messageSignature = (payload?.messageSignature ?? '').toString().trim();

  if (!requestId) return res.status(400).json({ error: 'requestId is required' });
  if (!requester) return res.status(400).json({ error: 'requester is required' });
  if (!message || !messageSignature) return res.status(400).json({ error: 'message and messageSignature are required' });

  const serviceUrl = process.env.VANITY_SERVICE_URL;
  if (!serviceUrl) {
    return res.status(501).json({
      error: 'Vanity service is not configured (VANITY_SERVICE_URL missing).',
      requestId,
    });
  }

  const apiKey = process.env.VANITY_SERVICE_KEY;

  const upstream = await fetch(serviceUrl.replace(/\/+$/, '') + '/reveal', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ requestId, requester, message, messageSignature }),
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
      error: data?.error ?? 'Vanity service reveal failed',
      status: upstream.status,
    });
  }

  return res.status(200).json(data);
}
