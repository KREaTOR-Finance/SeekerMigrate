import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_utils/supabase';

type Payload = {
  owner?: string;
  profileJson?: unknown;
};

const TTL_MS = 5 * 60 * 1000;

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

  if (!owner) return res.status(400).json({ error: 'owner is required' });
  if (!payload.profileJson) return res.status(400).json({ error: 'profileJson is required' });

  const profileHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload.profileJson))
    .digest('hex');

  const nonce = crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  const message = [
    'SMNS_BADGE_CHALLENGE',
    'action=badge-request',
    `owner=${owner}`,
    `profileHash=${profileHash}`,
    `nonce=${nonce}`,
    `issuedAt=${issuedAt}`,
    `expiresAt=${expiresAt}`,
  ].join('\n');

  const { error } = await supabase.from('smns_nonces').insert({
    nonce,
    owner,
    action: 'badge-request',
    name: `profileHash:${profileHash}`,
    subdomain: null,
    expires_at: expiresAt,
  });

  if (error) return res.status(502).json({ error: error.message });

  return res.status(200).json({
    ok: true,
    owner,
    profileHash,
    nonce,
    issuedAt,
    expiresAt,
    message,
    note: 'Sign this message with your wallet, then submit paymentSignature + messageSignature + profileJson to /api/badges/request.',
  });
}
