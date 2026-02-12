import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, { commitment: 'confirmed' });

type ReceiptPayload = {
  merchant?: string;
  merchantAddress?: string;
  // Legacy field name (lamports). In this service it represents *atomic amount* for the chosen currency.
  amountLamports?: number;
  amountAtomic?: number | string;
  memo?: string;
  signature: string;
  currency?: 'SOL' | 'SKR' | 'USDC';
  mint?: string;
};

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SKR_MINT = process.env.SKR_MINT ?? 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
const USDC_MINT = process.env.USDC_MINT ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

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

function parseAmountAtomic(payload: Partial<ReceiptPayload>) {
  const raw = payload.amountAtomic ?? payload.amountLamports;
  if (typeof raw === 'string') {
    try {
      return BigInt(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return BigInt(Math.trunc(raw));
  }
  return null;
}

function defaultMint(currency: 'SOL' | 'SKR' | 'USDC') {
  if (currency === 'SOL') return SOL_MINT;
  if (currency === 'USDC') return USDC_MINT;
  return SKR_MINT;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = (req.body ?? {}) as Partial<ReceiptPayload>;
  const merchant = pickMerchant(payload);
  const currency = (payload.currency ?? 'SOL') as 'SOL' | 'SKR' | 'USDC';
  const expectedMint = (payload.mint ?? defaultMint(currency)).trim();
  const amountAtomic = parseAmountAtomic(payload);

  if (!merchant || !payload.signature || !amountAtomic) {
    return res.status(400).json({
      error: 'merchantAddress (or merchant), signature, and amountAtomic (or amountLamports) are required',
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
    let matchedAmount: bigint | null = null;

    const instructions = tx.transaction.message.instructions as any[];

    if (currency === 'SOL') {
      for (const ix of instructions) {
        if (ix?.program === 'system' && ix?.parsed?.type === 'transfer') {
          const info = ix.parsed.info;
          if (info?.destination === merchant) {
            const lamports = BigInt(String(info?.lamports ?? '0'));
            matchedAmount = matchedAmount === null ? lamports : lamports > matchedAmount ? lamports : matchedAmount;
            if (lamports >= amountAtomic) {
              matched = true;
            }
          }
        }
      }

      return res.status(202).json({
        accepted: true,
        currency,
        mint: expectedMint,
        merchant,
        merchantTokenAccountExpected: null,
        amountAtomicExpected: amountAtomic.toString(),
        amountAtomicMatched: matchedAmount ? matchedAmount.toString() : null,
        matched,
        memo: payload.memo ?? null,
        signature: payload.signature,
        confirmationStatus: status?.confirmationStatus ?? null,
        slot: status?.slot ?? null,
        rpc: SOLANA_RPC,
        note: 'For SOL receipts, merchant should be a wallet address.',
        confirmed,
      });
    }

    // SPL transfer: merchant is expected to be a wallet address; we compute the ATA.
    let expectedAta: string | null = null;
    try {
      expectedAta = getAssociatedTokenAddressSync(new PublicKey(expectedMint), new PublicKey(merchant), false).toBase58();
    } catch {
      expectedAta = null;
    }

    for (const ix of instructions) {
      if (ix?.program === 'spl-token' && (ix?.parsed?.type === 'transfer' || ix?.parsed?.type === 'transferChecked')) {
        const info = ix.parsed.info;
        const destination = info?.destination;
        const mint = info?.mint;

        const rawAmount =
          info?.tokenAmount?.amount ??
          info?.amount ??
          info?.tokenAmount?.uiAmountString ??
          '0';

        let amount = 0n;
        try {
          amount = BigInt(String(rawAmount));
        } catch {
          amount = 0n;
        }

        const destinationMatches = destination === expectedAta || destination === merchant;

        if (destinationMatches && mint === expectedMint) {
          matchedAmount = matchedAmount === null ? amount : amount > matchedAmount ? amount : matchedAmount;
          if (amount >= amountAtomic) {
            matched = true;
          }
        }
      }
    }

    return res.status(202).json({
      accepted: true,
      currency,
      mint: expectedMint,
      merchant,
      merchantTokenAccountExpected: expectedAta,
      amountAtomicExpected: amountAtomic.toString(),
      amountAtomicMatched: matchedAmount ? matchedAmount.toString() : null,
      matched,
      memo: payload.memo ?? null,
      signature: payload.signature,
      confirmationStatus: status?.confirmationStatus ?? null,
      slot: status?.slot ?? null,
      rpc: SOLANA_RPC,
      note: 'For SPL receipts (SKR/USDC), merchant should be a wallet address; this verifier checks the merchant ATA for the mint.',
      confirmed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify signature';
    return res.status(502).json({ error: message });
  }
}

