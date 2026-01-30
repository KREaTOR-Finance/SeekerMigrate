import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_supabase';

const fallback = [
  {
    id: 'placeholder-1',
    title: 'Placeholder dApp One',
    tagline: 'New on Seeker',
    category: 'New on Seeker',
    status: ['new', 'trending'],
    url: '',
    image_url: null,
    rank: 10,
  },
  {
    id: 'placeholder-2',
    title: 'Placeholder dApp Two',
    tagline: 'Recently migrated (iOS)',
    category: 'Migration',
    status: ['migrated_ios', 'new'],
    url: '',
    image_url: null,
    rank: 20,
  },
  {
    id: 'placeholder-3',
    title: 'Placeholder dApp Three',
    tagline: 'Upcoming release (Android)',
    category: 'Upcoming',
    status: ['upcoming', 'migrated_android'],
    url: '',
    image_url: null,
    rank: 30,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.status(200).json({ source: 'fallback', items: fallback });
  }

  const { data, error } = await sb
    .from('featured_dapps')
    .select('id,title,tagline,category,status,url,image_url,rank')
    .eq('active', true)
    .order('rank', { ascending: true })
    .limit(50);

  if (error) {
    return res.status(200).json({ source: 'fallback', warning: error.message, items: fallback });
  }

  return res.status(200).json({ source: 'supabase', items: data ?? [] });
}
