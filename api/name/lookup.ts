import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ErrorType, SNSError, getDomainKeySync, resolve } from '@bonfida/spl-name-service';
import { getConnection, getRpcUrl, normalizeCluster, type SolanaCluster } from '../_utils/solana';

type LookupPayload = {
  name?: string;
  tld?: string;
  domain?: string;
  namespace?: string;
  cluster?: SolanaCluster;
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

  const cluster = normalizeCluster(payload?.cluster);
  const connection = getConnection(cluster);

  const nameAccount = getDomainKeySync(names.onChainName).pubkey;

  try {
    const owner = await resolve(connection, names.onChainName);
    return res.status(200).json({
      name: names.displayName,
      onChainName: names.onChainName,
      nameAccount: nameAccount.toBase58(),
      tld: names.tld,
      owner: owner.toBase58(),
      available: false,
      namespace: payload?.namespace ?? 'sns',
      cluster,
      rpc: getRpcUrl(cluster),
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
          nameAccount: nameAccount.toBase58(),
          tld: names.tld,
          owner: null,
          available: true,
          namespace: payload?.namespace ?? 'sns',
          cluster,
          rpc: getRpcUrl(cluster),
        });
      }
    }

    const message = error instanceof Error ? error.message : 'Lookup failed';
    return res.status(502).json({ error: message });
  }
}
