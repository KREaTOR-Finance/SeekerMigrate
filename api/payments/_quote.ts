export type PaymentCurrency = 'SOL' | 'SKR' | 'USDC';

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
// SKR mint comes from env in handlers; this is the default used across the repo.
export const DEFAULT_SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const DECIMALS: Record<PaymentCurrency, number> = {
  SOL: 9,
  SKR: 6,
  USDC: 6,
};

export function mintForCurrency(currency: PaymentCurrency, skrMint = DEFAULT_SKR_MINT) {
  switch (currency) {
    case 'SOL':
      return SOL_MINT;
    case 'SKR':
      return skrMint;
    case 'USDC':
      return USDC_MINT;
  }
}

async function fetchJupiterPriceUsd(mint: string) {
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

export async function quoteUsd(args: { usd: number; currency: PaymentCurrency; skrMint?: string }) {
  const mint = mintForCurrency(args.currency, args.skrMint ?? DEFAULT_SKR_MINT);
  const decimals = DECIMALS[args.currency];

  // For USDC we could hardcode 1.00, but using Jupiter keeps the implementation consistent.
  const priceUsd = await fetchJupiterPriceUsd(mint);

  const tokenAmount = args.usd / priceUsd;
  const atomicAmount = Math.round(tokenAmount * Math.pow(10, decimals));

  return {
    mint,
    decimals,
    priceUsd,
    tokenAmount,
    atomicAmount,
    source: 'jupiter' as const,
  };
}
