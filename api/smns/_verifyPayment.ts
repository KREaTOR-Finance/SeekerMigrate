import { Connection } from '@solana/web3.js';

export async function verifySolPayment(args: {
  signature: string;
  rpcUrl: string;
  treasury: string;
  minLamports: number;
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

  const instructions = tx.transaction.message.instructions as any[];

  let matchedLamports = 0;
  for (const ix of instructions) {
    if (ix?.program === 'system' && ix?.parsed?.type === 'transfer') {
      const info = ix.parsed.info;
      if (info?.destination === args.treasury) {
        const lamports = Number(info?.lamports ?? 0);
        matchedLamports = Math.max(matchedLamports, lamports);
      }
    }
  }

  const confirmed = Boolean(status && status.confirmationStatus);

  if (!confirmed) {
    return { ok: false as const, error: 'Payment not confirmed yet', matchedLamports, confirmed };
  }

  if (matchedLamports < args.minLamports) {
    return {
      ok: false as const,
      error: `Underpaid: ${matchedLamports} < ${args.minLamports}`,
      matchedLamports,
      confirmed,
    };
  }

  return { ok: true as const, matchedLamports, confirmed };
}
