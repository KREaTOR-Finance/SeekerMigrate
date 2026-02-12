import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

export type PaymentCurrency = 'SOL' | 'SKR' | 'USDC';

export type PaymentMeta = {
  treasuryAddress: string | null;
  merchantAddress: string | null;
  merchantLabel?: string;
  skrMint: string;
  usdcMint: string;
};

export type QuoteResponse = {
  status: string;
  usd: number;
  currency: PaymentCurrency;
  mint: string;
  priceUsd: number;
  decimals: number;
  tokenAmount: number;
  atomicAmount: number;
  expiresAt: string;
};

export async function fetchPaymentMeta(): Promise<PaymentMeta> {
  const res = await fetch('/api/payments/meta');
  if (!res.ok) throw new Error('Unable to load payment metadata');
  return (await res.json()) as PaymentMeta;
}

export async function fetchQuote(usd: number, currency: PaymentCurrency): Promise<QuoteResponse> {
  const res = await fetch('/api/payments/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usd, currency }),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.error ?? `Quote failed (${res.status})`);
  return data as QuoteResponse;
}

export async function sendPayment(args: {
  provider: any;
  owner: string;
  currency: PaymentCurrency;
  mint: string;
  decimals: number;
  atomicAmount: number;
  destinationWallet: string;
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
}) {
  const connection = new Connection(clusterRpc(args.cluster), { commitment: 'confirmed' });
  const { blockhash } = await connection.getLatestBlockhash('finalized');

  const tx = new Transaction();
  tx.feePayer = new PublicKey(args.owner);
  tx.recentBlockhash = blockhash;

  if (args.currency === 'SOL') {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(args.owner),
        toPubkey: new PublicKey(args.destinationWallet),
        lamports: args.atomicAmount,
      })
    );
  } else {
    const mint = new PublicKey(args.mint);
    const owner = new PublicKey(args.owner);
    const destination = new PublicKey(args.destinationWallet);

    const payerAta = getAssociatedTokenAddressSync(mint, owner, false);
    const destAta = getAssociatedTokenAddressSync(mint, destination, false);

    tx.add(
      createTransferCheckedInstruction(
        payerAta,
        mint,
        destAta,
        owner,
        BigInt(args.atomicAmount),
        args.decimals
      )
    );
  }

  const sent = await args.provider.signAndSendTransaction(tx);
  const signature = sent?.signature ?? sent;
  if (!signature) throw new Error('No signature returned from wallet');

  await connection.confirmTransaction(signature, 'confirmed');
  return signature as string;
}

export async function verifyReceipt(args: {
  signature: string;
  currency: PaymentCurrency;
  mint: string;
  merchantAddress: string;
  amountAtomic: number;
}) {
  const res = await fetch('/api/payments/receipt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      signature: args.signature,
      currency: args.currency,
      mint: args.currency === 'SOL' ? undefined : args.mint,
      merchantAddress: args.merchantAddress,
      amountAtomic: args.amountAtomic,
    }),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.error ?? `Receipt failed (${res.status})`);
  return data;
}

export function clusterRpc(cluster: 'mainnet-beta' | 'devnet' | 'testnet') {
  if (cluster === 'devnet') return 'https://api.devnet.solana.com';
  if (cluster === 'testnet') return 'https://api.testnet.solana.com';
  return 'https://api.mainnet-beta.solana.com';
}
