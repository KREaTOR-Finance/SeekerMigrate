import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection } from '@solana/web3.js';
import { ErrorType, SNSError, resolve } from '@bonfida/spl-name-service';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, { commitment: 'confirmed' });

type LookupPayload = {
  name: string;
  namespace?: string;
};

function normalizeDomain(name: string) {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }
  return trimmed.endsWith('.sol') ? trimmed : `${trimmed}.sol`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<LookupPayload> | undefined;
  const domain = normalizeDomain(payload?.name ?? '');
  if (!domain) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const owner = await resolve(connection, domain);
    return res.status(200).json({
      name: domain,
      owner: owner.toBase58(),
      available: false,
      namespace: payload?.namespace ?? 'sns',
      rpc: SOLANA_RPC,
    });
  } catch (error) {
    if (error instanceof SNSError) {
      const isMissing =
        error.type === ErrorType.AccountDoesNotExist ||
        error.type === ErrorType.NoAccountData ||
        error.type === ErrorType.SymbolNotFound;
      if (isMissing) {
        return res.status(200).json({
          name: domain,
          owner: null,
          available: true,
          namespace: payload?.namespace ?? 'sns',
          rpc: SOLANA_RPC,
        });
      }
    }

    const message = error instanceof Error ? error.message : 'Lookup failed';
    return res.status(502).json({ error: message });
  }
}

