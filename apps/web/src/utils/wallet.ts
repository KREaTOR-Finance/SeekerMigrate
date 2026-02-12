export type ProviderKind = 'phantom' | 'solflare';

type WalletProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toBase58?: () => string; toString?: () => string } | null;
  connect?: () => Promise<any>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: Uint8Array, display?: string) => Promise<any>;
  signAndSendTransaction?: (tx: any) => Promise<any>;
};

export function getProvider(kind: ProviderKind): WalletProvider | null {
  if (typeof window === 'undefined') return null;
  if (kind === 'phantom') return (window as any).solana ?? null;
  return (window as any).solflare ?? null;
}

export function detectProviders() {
  const phantom = typeof window !== 'undefined' && (window as any).solana?.isPhantom;
  const solflare = typeof window !== 'undefined' && (window as any).solflare?.isSolflare;
  return { phantom, solflare };
}

export async function connectProvider(kind: ProviderKind) {
  const provider = getProvider(kind);
  if (!provider) throw new Error('Wallet provider not available');
  const resp = await provider.connect?.();
  const pk =
    resp?.publicKey?.toBase58?.() ??
    resp?.publicKey?.toString?.() ??
    provider.publicKey?.toBase58?.() ??
    provider.publicKey?.toString?.();
  if (!pk) throw new Error('Wallet returned no public key');
  return { provider, publicKey: pk };
}

export async function ensureProviderConnected(kind: ProviderKind) {
  const provider = getProvider(kind);
  if (!provider) throw new Error('Wallet provider not available');
  if (!provider.publicKey) {
    await provider.connect?.();
  }
  const pk = provider.publicKey?.toBase58?.() ?? provider.publicKey?.toString?.();
  if (!pk) throw new Error('Wallet returned no public key');
  return { provider, publicKey: pk };
}

export async function disconnectProvider(kind: ProviderKind) {
  const provider = getProvider(kind);
  await provider?.disconnect?.();
}

export async function signMessage(provider: WalletProvider, message: string) {
  if (!provider.signMessage) throw new Error('Wallet does not support message signing');
  const msgBytes = new TextEncoder().encode(message);
  const signed = await provider.signMessage(msgBytes, 'utf8');
  return signed?.signature ?? signed;
}
