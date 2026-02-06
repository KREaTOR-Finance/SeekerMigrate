import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

type Loader = () => Promise<{ default: Handler }>;

// Lazy-load handlers so one failing import doesn't take down the entire API router.
const routes: Record<string, Loader> = {
  // Health
  'GET /health': () => import('./health.js'),

  // Content
  'GET /content/featured': () => import('./content/featured.js'),
  'GET /content/ads': () => import('./content/ads.js'),
  'GET /content/social': () => import('./content/social.js'),

  // Legacy SNS name routes (kept)
  'POST /name/lookup': () => import('./name/lookup.js'),
  'POST /name/register': () => import('./name/register.js'),
  'POST /name/mint': () => import('./name/mint.js'),

  // Payments
  'GET /payments/meta': () => import('./payments/meta.js'),
  'POST /payments/quote': () => import('./payments/quote.js'),
  'POST /payments/receipt': () => import('./payments/receipt.js'),
  'POST /payments/stripe-session': () => import('./payments/stripe-session.js'),
  'POST /payments/stripe-verify': () => import('./payments/stripe-verify.js'),

  // SMNS
  'POST /smns/lookup': () => import('./smns/lookup.js'),
  'POST /smns/challenge': () => import('./smns/challenge.js'),
  'POST /smns/register': () => import('./smns/register.js'),
  'POST /smns/reverse': () => import('./smns/reverse.js'),
  'POST /smns/set-primary': () => import('./smns/set-primary.js'),

  // Vanity
  'POST /vanity/request': () => import('./vanity/request.js'),
  'POST /vanity/status': () => import('./vanity/status.js'),
  'POST /vanity/challenge': () => import('./vanity/challenge.js'),
  'POST /vanity/reveal': () => import('./vanity/reveal.js'),

  // Badge service
  'POST /badges/challenge': () => import('./badges/challenge.js'),
  'POST /badges/request': () => import('./badges/request.js'),
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
