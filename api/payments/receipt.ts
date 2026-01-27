import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection } from '@solana/web3.js';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, { commitment: 'confirmed' });

type ReceiptPayload = {
  merchant: string;
  amountLamports: number;
  memo?: string;
  signature: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<ReceiptPayload> | undefined;
  if (!payload?.merchant || !payload.signature || !payload.amountLamports) {
    return res.status(400).json({
      error: 'merchant, signature, and amountLamports are required',
    });
  }

  try {
    const statuses = await connection.getSignatureStatuses([payload.signature]);
    const status = statuses.value[0];

    return res.status(202).json({
      accepted: true,
      merchant: payload.merchant,
      amountLamports: payload.amountLamports,
      memo: payload.memo ?? null,
      signature: payload.signature,
      confirmationStatus: status?.confirmationStatus ?? null,
      slot: status?.slot ?? null,
      rpc: SOLANA_RPC,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify signature';
    return res.status(502).json({ error: message });
  }
}

