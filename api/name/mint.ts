import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey } from '@solana/web3.js';
import { registerDomainNameV2 } from '@bonfida/spl-name-service';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const DEFAULT_NAME_SPACE = Number(process.env.NAME_ACCOUNT_SPACE ?? 2000);
const connection = new Connection(SOLANA_RPC, { commitment: 'confirmed' });

type MintPayload = {
  name: string;
  buyer: string;
  buyerTokenAccount: string;
  space?: number;
};

function stripSolSuffix(name: string) {
  const trimmed = name.trim().toLowerCase();
  return trimmed.endsWith('.sol') ? trimmed.slice(0, -4) : trimmed;
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

  const payload = req.body as Partial<MintPayload> | undefined;
  if (!payload?.name || !payload?.buyer || !payload?.buyerTokenAccount) {
    return res.status(400).json({
      error: 'name, buyer, and buyerTokenAccount are required',
    });
  }

  const name = stripSolSuffix(payload.name);
  if (name.length < 2) {
    return res.status(400).json({ error: 'name must be at least 2 characters' });
  }

  try {
    const buyer = new PublicKey(payload.buyer);
    const buyerTokenAccount = new PublicKey(payload.buyerTokenAccount);
    const space = Math.max(Number(payload.space ?? DEFAULT_NAME_SPACE), 512);

    const instructions = await registerDomainNameV2(
      connection,
      name,
      space,
      buyer,
      buyerTokenAccount
    );

    return res.status(200).json({
      name: `${name}.sol`,
      space,
      instructionCount: instructions.length,
      instructions: instructions.map(serializeInstruction),
      rpc: SOLANA_RPC,
      note:
        'Sign and send these instructions from the buyer wallet. The backend does not custody keys.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to build mint instructions';
    return res.status(502).json({ error: message });
  }
}

