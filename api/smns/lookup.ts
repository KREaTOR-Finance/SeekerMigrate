import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_utils/supabase';
import { parseSmnsName } from './_names';

type Payload = {
  name?: string;
  tld?: string;
};

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
  const parsed = parseSmnsName(payload.name ?? '', payload.tld);
  if (!parsed) return res.status(400).json({ error: 'Invalid name (min 2 chars).', available: false });

  const { data, error } = await supabase
    .from('smns_names')
    .select('owner,status,canonical_name,display_name,mirror_name,created_at,updated_at')
    .eq('canonical_name', parsed.canonicalName)
    .maybeSingle();

  if (error) {
    return res.status(502).json({ error: error.message });
  }

  const active = data && data.status === 'active';

  return res.status(200).json({
    name: parsed.displayName,
    canonicalName: parsed.canonicalName,
    mirrorName: parsed.mirrorName,
    owner: active ? data.owner : null,
    available: !active,
    status: active ? data.status : 'available',
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
    namespace: 'smns',
  });
}
