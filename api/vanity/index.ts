import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Keypair } from '@solana/web3.js';

const MAX_ATTEMPTS = Number(process.env.VANITY_MAX_ATTEMPTS ?? 25000);

type VanityRequest = {
  prefix: string;
  costLamports?: number;
  network?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<VanityRequest> | undefined;
  const rawPrefix = (payload?.prefix ?? '').trim();
  if (rawPrefix.length < 2) {
    return res.status(400).json({ error: 'prefix must be at least 2 characters' });
  }

  const targetPrefix = rawPrefix.toLowerCase();
  let attempts = 0;
  let match: Keypair | null = null;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    const candidate = Keypair.generate();
    const address = candidate.publicKey.toBase58().toLowerCase();
    if (address.startsWith(targetPrefix)) {
      match = candidate;
      break;
    }
  }

  if (!match) {
    return res.status(422).json({
      error: 'Unable to find prefix within attempt budget',
      attempts,
      maxAttempts: MAX_ATTEMPTS,
    });
  }

  return res.status(200).json({
    address: match.publicKey.toBase58(),
    attempts,
    costLamports: payload?.costLamports ?? null,
    network: payload?.network ?? 'solana',
    warning: 'Do not expose the secret key; store it securely on your backend.',
  });
}

