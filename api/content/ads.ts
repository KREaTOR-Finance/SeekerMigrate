import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_supabase';

const fallback = [
  {
    id: 'ad-hero-placeholder',
    placement: 'hero',
    title: 'Sponsored placement (placeholder)',
    image_url: null,
    target_url: '',
    active: true,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const placement = typeof req.query.placement === 'string' ? req.query.placement : undefined;

  const sb = getSupabase();
  if (!sb) {
    return res.status(200).json({ source: 'fallback', items: fallback });
  }

  let q = sb
    .from('ads')
    .select('id,placement,title,image_url,target_url,active,starts_at,ends_at')
    .eq('active', true)
    .order('placement', { ascending: true })
    .order('id', { ascending: true })
    .limit(50);

  if (placement) {
    q = q.eq('placement', placement);
  }

  const { data, error } = await q;

  if (error) {
    return res.status(200).json({ source: 'fallback', warning: error.message, items: fallback });
  }

  return res.status(200).json({ source: 'supabase', items: data ?? [] });
}
