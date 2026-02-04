import { Connection, PublicKey } from '@solana/web3.js';

export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

export function normalizeCluster(input: unknown): SolanaCluster {
  const raw = String(input ?? '').trim().toLowerCase();
  if (raw === 'devnet') return 'devnet';
  if (raw === 'testnet') return 'testnet';
  return 'mainnet-beta';
}

export function getRpcUrl(cluster: SolanaCluster): string {
  const envKey =
    cluster === 'devnet'
      ? 'SOLANA_RPC_DEVNET'
      : cluster === 'testnet'
        ? 'SOLANA_RPC_TESTNET'
        : 'SOLANA_RPC_MAINNET';

  const envValue = process.env[envKey];
  if (envValue) return envValue;

  // Backwards compatible single var: only applies to mainnet.
  if (cluster === 'mainnet-beta' && process.env.SOLANA_RPC) return process.env.SOLANA_RPC;

  if (cluster === 'devnet') return 'https://api.devnet.solana.com';
  if (cluster === 'testnet') return 'https://api.testnet.solana.com';
  return 'https://api.mainnet-beta.solana.com';
}

export function getConnection(cluster: SolanaCluster) {
  return new Connection(getRpcUrl(cluster), { commitment: 'confirmed' });
}

export function getUsdcMint(cluster: SolanaCluster) {
  // Allow overrides for non-standard setups.
  const envKey =
    cluster === 'devnet'
      ? 'USDC_MINT_DEVNET'
      : cluster === 'testnet'
        ? 'USDC_MINT_TESTNET'
        : 'USDC_MINT_MAINNET';

  const override = process.env[envKey];
  if (override) return new PublicKey(override);

  // Defaults:
  // - Mainnet USDC
  // - Devnet USDC (Circle) mint
  if (cluster === 'mainnet-beta') {
    return new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }
  // devnet/testnet default
  return new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
}
