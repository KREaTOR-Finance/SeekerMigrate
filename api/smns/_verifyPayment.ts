import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

export type PaymentCurrency = 'SOL' | 'SKR' | 'USDC';

export async function verifyPayment(args: {
  signature: string;
  rpcUrl: string;
  treasury: string; // treasury wallet address
  currency: PaymentCurrency;
  mint?: string; // required for SPL
  minAtomic: bigint;
}) {
  const connection = new Connection(args.rpcUrl, { commitment: 'confirmed' });

  const statuses = await connection.getSignatureStatuses([args.signature]);
  const status = statuses.value[0];

  const tx = await connection.getParsedTransaction(args.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });

  if (!tx) {
    return { ok: false as const, error: 'Transaction not found' };
  }

  const confirmed = Boolean(status && status.confirmationStatus);
  const instructions = tx.transaction.message.instructions as any[];

  if (!confirmed) {
    return { ok: false as const, error: 'Payment not confirmed yet', confirmed };
  }

  if (args.currency === 'SOL') {
    let matchedLamports = 0n;
    for (const ix of instructions) {
      if (ix?.program === 'system' && ix?.parsed?.type === 'transfer') {
        const info = ix.parsed.info;
        if (info?.destination === args.treasury) {
          const lamports = BigInt(String(info?.lamports ?? '0'));
          if (lamports > matchedLamports) matchedLamports = lamports;
        }
      }
    }

    if (matchedLamports < args.minAtomic) {
      return {
        ok: false as const,
        error: `Underpaid: ${matchedLamports.toString()} < ${args.minAtomic.toString()}`,
        matchedAtomic: matchedLamports,
        confirmed,
      };
    }

    return { ok: true as const, matchedAtomic: matchedLamports, confirmed };
  }

  if (!args.mint) {
    return { ok: false as const, error: 'Missing mint for SPL payment', confirmed };
  }

  let expectedAta: string;
  try {
    expectedAta = getAssociatedTokenAddressSync(new PublicKey(args.mint), new PublicKey(args.treasury), false).toBase58();
  } catch {
    return { ok: false as const, error: 'Unable to compute treasury token account (ATA)', confirmed };
  }

  let matchedAtomic = 0n;
  for (const ix of instructions) {
    if (ix?.program === 'spl-token' && (ix?.parsed?.type === 'transfer' || ix?.parsed?.type === 'transferChecked')) {
      const info = ix.parsed.info;
      const destination = info?.destination;
      const mint = info?.mint;
      const rawAmount = info?.tokenAmount?.amount ?? info?.amount ?? '0';

      let amount = 0n;
      try {
        amount = BigInt(String(rawAmount));
      } catch {
        amount = 0n;
      }

      if (destination === expectedAta && mint === args.mint) {
        if (amount > matchedAtomic) matchedAtomic = amount;
      }
    }
  }

  if (matchedAtomic < args.minAtomic) {
    return {
      ok: false as const,
      error: `Underpaid: ${matchedAtomic.toString()} < ${args.minAtomic.toString()}`,
      matchedAtomic,
      confirmed,
      treasuryTokenAccount: expectedAta,
    };
  }

  return { ok: true as const, matchedAtomic, confirmed, treasuryTokenAccount: expectedAta };
}
