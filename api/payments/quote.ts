import type { VercelRequest, VercelResponse } from '@vercel/node';

type QuotePayload = {
  usd: number;
  currency: 'SOL' | 'SKR';
};

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SKR_MINT = process.env.SKR_MINT ?? 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';

const SOL_DECIMALS = 9;
const SKR_DECIMALS = 6;

function parsePayload(body: unknown): QuotePayload | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Partial<QuotePayload>;
  const usd = typeof raw.usd === 'number' ? raw.usd : Number((raw as any).amountUsd);
  const currency = (raw.currency ?? (raw as any).token) as QuotePayload['currency'];
  if (!Number.isFinite(usd) || usd <= 0) return null;
  if (currency !== 'SOL' && currency !== 'SKR') return null;
  return { usd, currency };
}

async function fetchJupiterPrice(mint: string) {
  const url = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(mint)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Price feed error (${res.status})`);
  }
  const json = (await res.json()) as any;
  const price = json?.data?.[mint]?.price;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Missing price');
  }
  return price as number;
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

  const mint = payload.currency === 'SOL' ? SOL_MINT : SKR_MINT;
  const decimals = payload.currency === 'SOL' ? SOL_DECIMALS : SKR_DECIMALS;

  try {
    const priceUsd = await fetchJupiterPrice(mint);
    const tokenAmount = payload.usd / priceUsd;
    const atomicAmount = Math.round(tokenAmount * Math.pow(10, decimals));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return res.status(200).json({
      status: 'ok',
      usd: payload.usd,
      currency: payload.currency,
      mint,
      priceUsd,
      decimals,
      tokenAmount,
      atomicAmount,
      expiresAt,
      source: 'jupiter',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Quote failed';
    return res.status(502).json({ error: message });
  }
}
