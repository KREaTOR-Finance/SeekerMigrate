import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_supabase';

const fallback = [
  { id: 'website', label: 'Website', url: '', sort: 10 },
  { id: 'x', label: 'X', url: '', sort: 20 },
  { id: 'discord', label: 'Discord', url: '', sort: 30 },
  { id: 'telegram', label: 'Telegram', url: '', sort: 40 },
  { id: 'email', label: 'Email', url: '', sort: 50 },
  { id: 'docs', label: 'Docs', url: '', sort: 60 },
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
    .from('social_links')
    .select('id,label,url,sort,active')
    .eq('active', true)
    .order('sort', { ascending: true })
    .limit(50);

  if (error) {
    return res.status(200).json({ source: 'fallback', warning: error.message, items: fallback });
  }

  return res.status(200).json({ source: 'supabase', items: data ?? [] });
}
