import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export type SmnsProduct = 'smns_name' | 'vanity' | 'wizard' | 'devkit' | 'profile_badge_service';

export function getUsdPrice(product: SmnsProduct): number {
  switch (product) {
    case 'smns_name':
      return 25;
    case 'vanity':
      return 25;
    case 'wizard':
      return 50;
    case 'devkit':
      return 50;
    case 'profile_badge_service':
      return 25;
    default:
      return 25;
  }
}

const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function fetchJupiterPriceUsd(mint: string) {
  const url = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(mint)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price feed error (${res.status})`);
  const json = (await res.json()) as any;
  const price = json?.data?.[mint]?.price;
  if (!Number.isFinite(price) || price <= 0) throw new Error('Missing price');
  return price as number;
}

export async function requiredLamportsForUsd(usd: number) {
  const priceUsd = await fetchJupiterPriceUsd(SOL_MINT);
  const solAmount = usd / priceUsd;
  return Math.ceil(solAmount * LAMPORTS_PER_SOL);
}
