import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_utils/supabase';
import { parseSmnsName } from './_names';

type Payload = {
  owner?: string;
  action?: 'register' | 'set-primary' | 'create-subdomain';
  name?: string;
  tld?: string;
  subdomain?: string;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

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
  const action = payload.action ?? 'register';

  if (!owner) return res.status(400).json({ error: 'owner is required' });

  const parsed = parseSmnsName(payload.name ?? '', payload.tld);
  if (!parsed) return res.status(400).json({ error: 'Invalid name' });

  const nonce = crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS).toISOString();

  const message = [
    'SMNS_CHALLENGE',
    `action=${action}`,
    `owner=${owner}`,
    `name=${parsed.canonicalName}`,
    payload.subdomain ? `subdomain=${payload.subdomain}` : null,
    `nonce=${nonce}`,
    `issuedAt=${issuedAt}`,
    `expiresAt=${expiresAt}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { error } = await supabase.from('smns_nonces').insert({
    nonce,
    owner,
    action,
    name: parsed.canonicalName,
    subdomain: payload.subdomain ?? null,
    expires_at: expiresAt,
  });

  if (error) {
    return res.status(502).json({ error: error.message });
  }

  return res.status(200).json({
    ok: true,
    action,
    owner,
    displayName: parsed.displayName,
    canonicalName: parsed.canonicalName,
    mirrorName: parsed.mirrorName,
    nonce,
    issuedAt,
    expiresAt,
    message,
    note: 'Sign this message with your wallet and submit signature + nonce to SMNS endpoints.',
  });
}
