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
    usdcMint: process.env.USDC_MINT ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    notes: {
      sol: 'SOL payments send to merchantAddress (wallet address).',
      spl: 'SPL payments (SKR/USDC) should send to the merchant associated token account (ATA) for the mint.',
      receipt:
        'The receipt verifier can compute the expected ATA when you pass merchantAddress as a wallet address.',
    },
  });
}
