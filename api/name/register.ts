import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey } from '@solana/web3.js';
import { registerDomainNameV2 } from '@bonfida/spl-name-service';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const DEFAULT_NAME_SPACE = Number(process.env.NAME_ACCOUNT_SPACE ?? 2000);
const connection = new Connection(SOLANA_RPC, { commitment: 'confirmed' });

type RegisterPayload = {
  name?: string;
  buyer: string;
  buyerTokenAccount: string;
  space?: number;
  tld?: string;
  domain?: string;
};

const ALLOWED_TLDS = new Set(['sol', 'skr', 'seeker', 'seismic']);

function normalizeTld(input: string | undefined) {
  const raw = (input ?? 'sol').trim().toLowerCase().replace(/^\./, '');
  return ALLOWED_TLDS.has(raw) ? raw : 'sol';
}

function parseName(name: string, rawTld: string | undefined) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const parts = normalized.split('.');
  const label = parts[0];
  const inferredTld = parts[1];
  const tld = normalizeTld(inferredTld ?? rawTld);

  // IMPORTANT: We anchor registrations to SNS `.sol` names so existing resolvers work.
  // Custom name types are represented by a suffix convention on-chain.
  // Example: alice.skr -> alice-skr.sol
  const onChainLabel = tld === 'sol' ? label : `${label}-${tld}`;
  const onChainName = `${onChainLabel}.sol`;
  const displayName = `${label}.${tld}`;
  return { label, tld, onChainLabel, onChainName, displayName };
}

function serializeInstruction(instruction: {
  programId: PublicKey;
  keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[];
  data: Buffer;
}) {
  return {
    programId: instruction.programId.toBase58(),
    keys: instruction.keys.map((k) => ({
      pubkey: k.pubkey.toBase58(),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    dataBase64: instruction.data.toString('base64'),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body as Partial<RegisterPayload> | undefined;
  if (!(payload?.name || payload?.domain) || !payload?.buyer || !payload?.buyerTokenAccount) {
    return res.status(400).json({
      error: 'name, buyer, and buyerTokenAccount are required',
    });
  }

  const parsed = parseName(payload.name ?? payload.domain ?? '', payload.tld);
  if (!parsed) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (parsed.label.length < 2) {
    return res.status(400).json({ error: 'name must be at least 2 characters' });
  }

  try {
    const buyer = new PublicKey(payload.buyer);
    const buyerTokenAccount = new PublicKey(payload.buyerTokenAccount);
    const space = Math.max(Number(payload.space ?? DEFAULT_NAME_SPACE), 512);

    const instructions = await registerDomainNameV2(
      connection,
      parsed.onChainLabel,
      space,
      buyer,
      buyerTokenAccount
    );

    return res.status(200).json({
      name: parsed.displayName,
      onChainName: parsed.onChainName,
      tld: parsed.tld,
      space,
      instructionCount: instructions.length,
      instructions: instructions.map(serializeInstruction),
      rpc: SOLANA_RPC,
      note:
        'Sign and send these instructions from the buyer wallet. The backend does not custody keys.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to build registration transaction';
    return res.status(502).json({ error: message });
  }
}
