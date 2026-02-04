import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection } from '@solana/web3.js';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, { commitment: 'confirmed' });

type ReceiptPayload = {
  merchant?: string;
  merchantAddress?: string;
  amountLamports: number;
  memo?: string;
  signature: string;
  currency?: 'SOL' | 'SKR';
  mint?: string;
};

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SKR_MINT = process.env.SKR_MINT ?? 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';

function pickMerchant(payload: Partial<ReceiptPayload>) {
  const incoming = (payload.merchantAddress ?? payload.merchant ?? '').trim();
  if (incoming) return incoming;
  return (
    process.env.PAYMENT_TREASURY_ADDRESS ??
    process.env.TREASURY_ADDRESS ??
    process.env.PAYMENT_MERCHANT_ADDRESS ??
    ''
  ).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<ReceiptPayload> | undefined;
  const merchant = payload ? pickMerchant(payload) : '';
  const currency = payload?.currency ?? 'SOL';
  const expectedMint = (payload?.mint ?? (currency === 'SOL' ? SOL_MINT : SKR_MINT)).trim();

  if (!merchant || !payload?.signature || !payload.amountLamports) {
    return res.status(400).json({
      error: 'merchantAddress (or merchant), signature, and amountLamports are required',
    });
  }

  try {
    const statuses = await connection.getSignatureStatuses([payload.signature]);
    const status = statuses.value[0];

    const tx = await connection.getParsedTransaction(payload.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const confirmed = Boolean(status && status.confirmationStatus);

    // Minimal verification: ensure tx includes a transfer of the expected asset to merchant.
    let matched = false;
    let matchedAmount = 0;

    const instructions = tx.transaction.message.instructions as any[];

    if (currency === 'SOL') {
      for (const ix of instructions) {
        if (ix?.program === 'system' && ix?.parsed?.type === 'transfer') {
          const info = ix.parsed.info;
          if (info?.destination === merchant) {
            const lamports = Number(info?.lamports ?? 0);
            matchedAmount = Math.max(matchedAmount, lamports);
            if (lamports >= payload.amountLamports) {
              matched = true;
            }
          }
        }
      }
    } else {
      // SPL transfer to a token account. For now we assume merchant is a token account address.
      for (const ix of instructions) {
        if (ix?.program === 'spl-token' && (ix?.parsed?.type === 'transfer' || ix?.parsed?.type === 'transferChecked')) {
          const info = ix.parsed.info;
          const destination = info?.destination;
          const mint = info?.mint;
          const amount = Number(info?.amount ?? 0);
          if (destination === merchant && mint === expectedMint) {
            matchedAmount = Math.max(matchedAmount, amount);
            if (amount >= payload.amountLamports) {
              matched = true;
            }
          }
        }
      }
    }

    return res.status(202).json({
      accepted: true,
      currency,
      mint: expectedMint,
      merchant,
      amountAtomicExpected: payload.amountLamports,
      amountAtomicMatched: matchedAmount || null,
      matched,
      memo: payload.memo ?? null,
      signature: payload.signature,
      confirmationStatus: status?.confirmationStatus ?? null,
      slot: status?.slot ?? null,
      rpc: SOLANA_RPC,
      note:
        currency === 'SKR'
          ? 'For SKR receipts, merchant should be a token account for the SKR mint.'
          : 'For SOL receipts, merchant should be a wallet address.',
      confirmed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify signature';
    return res.status(502).json({ error: message });
  }
}

