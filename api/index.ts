import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

type Loader = () => Promise<{ default: Handler }>;

// Lazy-load handlers so one failing import doesn't take down the entire API router.
const routes: Record<string, Loader> = {
  // Health
  'GET /health': () => import('./health'),

  // Content
  'GET /content/featured': () => import('./content/featured'),
  'GET /content/ads': () => import('./content/ads'),
  'GET /content/social': () => import('./content/social'),

  // Legacy SNS name routes (kept)
  'POST /name/lookup': () => import('./name/lookup'),
  'POST /name/register': () => import('./name/register'),
  'POST /name/mint': () => import('./name/mint'),

  // Payments
  'GET /payments/meta': () => import('./payments/meta'),
  'POST /payments/quote': () => import('./payments/quote'),
  'POST /payments/receipt': () => import('./payments/receipt'),
  'POST /payments/stripe-session': () => import('./payments/stripe-session'),
  'POST /payments/stripe-verify': () => import('./payments/stripe-verify'),

  // SMNS
  'POST /smns/lookup': () => import('./smns/lookup'),
  'POST /smns/challenge': () => import('./smns/challenge'),
  'POST /smns/register': () => import('./smns/register'),
  'POST /smns/reverse': () => import('./smns/reverse'),
  'POST /smns/set-primary': () => import('./smns/set-primary'),

  // Vanity
  'POST /vanity/request': () => import('./vanity/request'),
  'POST /vanity/status': () => import('./vanity/status'),
  'POST /vanity/challenge': () => import('./vanity/challenge'),
  'POST /vanity/reveal': () => import('./vanity/reveal'),

  // Badge service
  'POST /badges/challenge': () => import('./badges/challenge'),
  'POST /badges/request': () => import('./badges/request'),
};

function getPath(req: VercelRequest) {
  // Prefer explicit routing param from vercel.json rewrite.
  const fromQuery = typeof (req.query as any)?.path === 'string' ? String((req.query as any).path) : null;
  if (fromQuery) return '/' + fromQuery.replace(/^\/+/, '');

  const rawUrl = req.url ?? '/';
  const url = new URL(rawUrl, 'http://local');
  const pathname = url.pathname;
  if (pathname === '/api' || pathname === '/api/') return '/';
  if (pathname.startsWith('/api/')) return pathname.slice('/api'.length);
  return pathname;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  const key = `${req.method?.toUpperCase?.() ?? 'GET'} ${path}`;

  const load = routes[key];
  if (!load) {
    return res.status(404).json({
      error: 'Not found',
      path,
      method: req.method,
      hint: 'This deployment uses a consolidated /api router to stay under Vercel Hobby function limits.',
    });
  }

  try {
    const mod = await load();
    return await mod.default(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled error';
    return res.status(500).json({ error: message });
  }
}
