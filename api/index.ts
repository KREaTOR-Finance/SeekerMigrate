import type { VercelRequest, VercelResponse } from '@vercel/node';

import health from './health';

import contentFeatured from './content/featured';
import contentAds from './content/ads';
import contentSocial from './content/social';

import nameLookup from './name/lookup';
import nameRegister from './name/register';
import nameMint from './name/mint';

import paymentsMeta from './payments/meta';
import paymentsQuote from './payments/quote';
import paymentsReceipt from './payments/receipt';
import paymentsStripeSession from './payments/stripe-session';
import paymentsStripeVerify from './payments/stripe-verify';

import smnsLookup from './smns/lookup';
import smnsChallenge from './smns/challenge';
import smnsRegister from './smns/register';
import smnsReverse from './smns/reverse';
import smnsSetPrimary from './smns/set-primary';

import vanityRequest from './vanity/request';
import vanityStatus from './vanity/status';
import vanityChallenge from './vanity/challenge';
import vanityReveal from './vanity/reveal';

import badgeChallenge from './badges/challenge';
import badgeRequest from './badges/request';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

const routes: Record<string, Handler> = {
  // Health
  'GET /health': health,

  // Content
  'GET /content/featured': contentFeatured,
  'GET /content/ads': contentAds,
  'GET /content/social': contentSocial,

  // Legacy SNS name routes (kept)
  'POST /name/lookup': nameLookup,
  'POST /name/register': nameRegister,
  'POST /name/mint': nameMint,

  // Payments
  'GET /payments/meta': paymentsMeta,
  'POST /payments/quote': paymentsQuote,
  'POST /payments/receipt': paymentsReceipt,
  'POST /payments/stripe-session': paymentsStripeSession,
  'POST /payments/stripe-verify': paymentsStripeVerify,

  // SMNS
  'POST /smns/lookup': smnsLookup,
  'POST /smns/challenge': smnsChallenge,
  'POST /smns/register': smnsRegister,
  'POST /smns/reverse': smnsReverse,
  'POST /smns/set-primary': smnsSetPrimary,

  // Vanity
  'POST /vanity/request': vanityRequest,
  'POST /vanity/status': vanityStatus,
  'POST /vanity/challenge': vanityChallenge,
  'POST /vanity/reveal': vanityReveal,

  // Badge service
  'POST /badges/challenge': badgeChallenge,
  'POST /badges/request': badgeRequest,
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

  const route = routes[key];
  if (!route) {
    return res.status(404).json({
      error: 'Not found',
      path,
      method: req.method,
      hint: 'This deployment uses a consolidated /api router to stay under Vercel Hobby function limits.',
    });
  }

  try {
    return await route(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled error';
    return res.status(500).json({ error: message });
  }
}
