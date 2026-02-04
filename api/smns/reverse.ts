import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_utils/supabase';

type Payload = {
  owner?: string;
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
  const owner = (payload.owner ?? '').toString().trim();
  if (!owner) return res.status(400).json({ error: 'owner is required' });

  const { data, error } = await supabase
    .from('smns_primary')
    .select('canonical_name,display_name,mirror_name,updated_at')
    .eq('owner', owner)
    .maybeSingle();

  if (error) return res.status(502).json({ error: error.message });

  return res.status(200).json({
    owner,
    primary: data
      ? {
          canonicalName: data.canonical_name,
          name: data.display_name,
          mirrorName: data.mirror_name,
          updatedAt: data.updated_at,
        }
      : null,
  });
}
