export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

export function explorerClusterParam(cluster: SolanaCluster) {
  if (cluster === 'devnet') return 'devnet';
  if (cluster === 'testnet') return 'testnet';
  return null;
}

export function explorerTxUrl(signature: string, cluster: SolanaCluster) {
  const base = `https://explorer.solana.com/tx/${signature}`;
  const param = explorerClusterParam(cluster);
  return param ? `${base}?cluster=${param}` : base;
}

export function explorerAddressUrl(address: string, cluster: SolanaCluster) {
  const base = `https://explorer.solana.com/address/${address}`;
  const param = explorerClusterParam(cluster);
  return param ? `${base}?cluster=${param}` : base;
}
