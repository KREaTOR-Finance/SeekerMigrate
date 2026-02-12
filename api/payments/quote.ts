import type { VercelRequest, VercelResponse } from '@vercel/node';

import { quoteUsd, type PaymentCurrency } from './_quote';

type QuotePayload = {
  usd: number;
  currency: PaymentCurrency;
};

function parsePayload(body: unknown): QuotePayload | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Partial<QuotePayload>;
  const usd = typeof raw.usd === 'number' ? raw.usd : Number((raw as any).amountUsd);
  const currency = (raw.currency ?? (raw as any).token) as QuotePayload['currency'];
  if (!Number.isFinite(usd) || usd <= 0) return null;
  if (currency !== 'SOL' && currency !== 'SKR' && currency !== 'USDC') return null;
  return { usd, currency };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = parsePayload(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid payload. Expected { usd, currency: SOL|SKR }' });
  }

  try {
    const skrMint = process.env.SKR_MINT;
    const quoted = await quoteUsd({ usd: payload.usd, currency: payload.currency, skrMint });
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return res.status(200).json({
      status: 'ok',
      usd: payload.usd,
      currency: payload.currency,
      mint: quoted.mint,
      priceUsd: quoted.priceUsd,
      decimals: quoted.decimals,
      tokenAmount: quoted.tokenAmount,
      atomicAmount: quoted.atomicAmount,
      expiresAt,
      source: quoted.source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Quote failed';
    return res.status(502).json({ error: message });
  }
}
