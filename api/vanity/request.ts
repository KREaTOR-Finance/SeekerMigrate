import type { VercelRequest, VercelResponse } from '@vercel/node';

type VanityRequestPayload = {
  suffix?: string;
  requester?: string;
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
};

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

function normalizeSuffix(input: string | undefined) {
  const raw = (input ?? '').trim();
  const suffix = raw.replace(/^\s+|\s+$/g, '');
  return suffix;
}

function validateSuffix(suffix: string) {
  if (!suffix) return 'suffix is required';
  if (suffix.length < 4 || suffix.length > 6) return 'suffix must be 4-6 characters';
  if (!BASE58_RE.test(suffix)) return 'suffix must be base58 (no 0,O,I,l)';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<VanityRequestPayload> | undefined;
  const suffix = normalizeSuffix(payload?.suffix);
  const err = validateSuffix(suffix);
  if (err) return res.status(400).json({ error: err });

  const requester = (payload?.requester ?? '').toString();
  if (!requester) return res.status(400).json({ error: 'requester is required' });

  const cluster = payload?.cluster ?? 'mainnet-beta';

  // Production routing: proxy to an external vanity worker/service.
  // This avoids burning CPU inside serverless functions.
  const serviceUrl = process.env.VANITY_SERVICE_URL;
  if (!serviceUrl) {
    return res.status(501).json({
      error: 'Vanity service is not configured (VANITY_SERVICE_URL missing).',
      suffix,
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
    body: JSON.stringify({ suffix, requester, cluster }),
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
    suffix,
    cluster,
    status: data.status ?? 'queued',
    etaSeconds: data.etaSeconds ?? null,
    attempts: data.attempts ?? null,
    address: data.address ?? null,
    note: 'Vanity generation runs out-of-process; poll status if requestId is present.',
  });
}
