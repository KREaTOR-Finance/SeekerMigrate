import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const treasuryAddress =
    process.env.PAYMENT_TREASURY_ADDRESS ?? process.env.TREASURY_ADDRESS ?? process.env.PAYMENT_MERCHANT_ADDRESS ?? null;

  return res.status(200).json({
    treasuryAddress,
    merchantAddress: process.env.PAYMENT_MERCHANT_ADDRESS ?? treasuryAddress,
    merchantLabel: process.env.PAYMENT_MERCHANT_LABEL ?? 'SeekerMigrate',
    skrMint: process.env.SKR_MINT ?? 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3',
    notes: {
      sol: 'SOL receipts should pay to merchantAddress (wallet address).',
      skr: 'SKR receipts should pay to a merchant token account for the SKR mint (not yet configured here).',
    },
  });
}
