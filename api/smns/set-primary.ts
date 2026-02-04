import type { VercelRequest, VercelResponse } from '@vercel/node';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { getSupabaseAdmin } from '../_utils/supabase';
import { parseSmnsName } from './_names';

type Payload = {
  owner?: string;
  name?: string;
  tld?: string;
  nonce?: string;
  message?: string;
  messageSignature?: string;
};

function verifyMessage(owner: string, message: string, sig58: string) {
  const sig = bs58.decode(sig58);
  const pk = bs58.decode(owner);
  const msg = new TextEncoder().encode(message);
  return nacl.sign.detached.verify(msg, sig, pk);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).' });
  }

  const payload = (req.body ?? {}) as Payload;
  const owner = (payload.owner ?? '').toString().trim();
  const nonce = (payload.nonce ?? '').toString().trim();
  const message = (payload.message ?? '').toString();
  const messageSignature = (payload.messageSignature ?? '').toString().trim();

  if (!owner) return res.status(400).json({ error: 'owner is required' });
  if (!nonce) return res.status(400).json({ error: 'nonce is required' });
  if (!message || !messageSignature) return res.status(400).json({ error: 'message and messageSignature are required' });

  const parsed = parseSmnsName(payload.name ?? '', payload.tld);
  if (!parsed) return res.status(400).json({ error: 'Invalid name (min 2 chars).' });

  const { data: nonceRow, error: nonceErr } = await supabase
    .from('smns_nonces')
    .select('*')
    .eq('nonce', nonce)
    .maybeSingle();

  if (nonceErr) return res.status(502).json({ error: nonceErr.message });
  if (!nonceRow) return res.status(400).json({ error: 'Invalid nonce' });
  if (nonceRow.used_at) return res.status(409).json({ error: 'Nonce already used' });
  if (nonceRow.owner !== owner) return res.status(403).json({ error: 'Nonce owner mismatch' });
  if (nonceRow.name !== parsed.canonicalName) return res.status(403).json({ error: 'Nonce name mismatch' });
  if (nonceRow.action !== 'set-primary') return res.status(403).json({ error: 'Nonce action mismatch' });
  if (nonceRow.expires_at && Date.parse(nonceRow.expires_at) < Date.now()) return res.status(410).json({ error: 'Nonce expired' });

  try {
    if (!verifyMessage(owner, message, messageSignature)) {
      return res.status(403).json({ error: 'Invalid wallet signature' });
    }
  } catch {
    return res.status(400).json({ error: 'Unable to verify signature' });
  }

  if (!message.includes('SMNS_CHALLENGE') || !message.includes(`action=set-primary`) || !message.includes(`owner=${owner}`) || !message.includes(`name=${parsed.canonicalName}`)) {
    return res.status(403).json({ error: 'Signed message does not match request' });
  }

  // Ensure owner owns the name
  const { data: nameRow, error: nameErr } = await supabase
    .from('smns_names')
    .select('owner,status,canonical_name,display_name,mirror_name')
    .eq('canonical_name', parsed.canonicalName)
    .maybeSingle();

  if (nameErr) return res.status(502).json({ error: nameErr.message });
  if (!nameRow || nameRow.status !== 'active') return res.status(404).json({ error: 'Name not registered' });
  if (nameRow.owner !== owner) return res.status(403).json({ error: 'Not name owner' });

  const { error: upErr } = await supabase.from('smns_primary').upsert(
    {
      owner,
      canonical_name: nameRow.canonical_name,
      display_name: nameRow.display_name,
      mirror_name: nameRow.mirror_name,
    },
    { onConflict: 'owner' }
  );

  if (upErr) return res.status(502).json({ error: upErr.message });

  await supabase.from('smns_nonces').update({ used_at: new Date().toISOString() }).eq('nonce', nonce);

  return res.status(200).json({
    ok: true,
    owner,
    primary: {
      name: nameRow.display_name,
      canonicalName: nameRow.canonical_name,
      mirrorName: nameRow.mirror_name,
    },
  });
}
