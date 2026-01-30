import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection } from '@solana/web3.js';
import { ErrorType, SNSError, resolve } from '@bonfida/spl-name-service';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, { commitment: 'confirmed' });

type LookupPayload = {
  name?: string;
  tld?: string;
  domain?: string;
  namespace?: string;
};

const ALLOWED_TLDS = new Set(['sol', 'skr', 'seeker', 'seismic']);

function normalizeTld(input: string | undefined) {
  const raw = (input ?? 'sol').trim().toLowerCase().replace(/^\./, '');
  return ALLOWED_TLDS.has(raw) ? raw : 'sol';
}

function normalizeLabel(name: string) {
  return name.trim().toLowerCase();
}

function buildNames(name: string, rawTld: string | undefined) {
  const normalized = normalizeLabel(name);
  if (!normalized) {
    return null;
  }

  const parts = normalized.split('.');
  const label = parts[0];
  const inferredTld = parts[1];
  const tld = normalizeTld(inferredTld ?? rawTld);

  // Custom TLDs map onto real SNS `.sol` domains.
  const onChainLabel = tld === 'sol' ? label : `${label}-${tld}`;
  const onChainName = `${onChainLabel}.sol`;
  const displayName = `${label}.${tld}`;

  return { label, tld, displayName, onChainName };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<LookupPayload> | undefined;
  const names = buildNames(payload?.name ?? payload?.domain ?? '', payload?.tld);
  if (!names) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (names.label.length < 2) {
    return res.status(400).json({ error: 'name must be at least 2 characters' });
  }

  try {
    const owner = await resolve(connection, names.onChainName);
    return res.status(200).json({
      name: names.displayName,
      onChainName: names.onChainName,
      tld: names.tld,
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
          name: names.displayName,
          onChainName: names.onChainName,
          tld: names.tld,
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
