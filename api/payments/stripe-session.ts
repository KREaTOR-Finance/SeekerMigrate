import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

type StripeSessionPayload = {
  amountUsd: number;
  label?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

const MIN_USD = 0.5;
const MAX_USD = 10000;

function parsePayload(body: unknown): StripeSessionPayload | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const raw = body as Partial<StripeSessionPayload>;
  if (typeof raw.amountUsd !== 'number' || Number.isNaN(raw.amountUsd)) {
    return null;
  }
  return {
    amountUsd: raw.amountUsd,
    label: typeof raw.label === 'string' ? raw.label : undefined,
    successUrl: typeof raw.successUrl === 'string' ? raw.successUrl : undefined,
    cancelUrl: typeof raw.cancelUrl === 'string' ? raw.cancelUrl : undefined,
    metadata:
      raw.metadata && typeof raw.metadata === 'object'
        ? (raw.metadata as Record<string, string>)
        : undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  }

  const payload = parsePayload(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const amountUsd = Math.min(Math.max(payload.amountUsd, MIN_USD), MAX_USD);
  const amountCents = Math.round(amountUsd * 100);
  if (amountCents < MIN_USD * 100 || amountCents > MAX_USD * 100) {
    return res.status(422).json({ error: 'Amount out of range' });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-12-15.clover',
  });

  const successUrl =
    payload.successUrl ??
    process.env.STRIPE_SUCCESS_URL ??
    'https://example.com/payments/success?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl = payload.cancelUrl ?? process.env.STRIPE_CANCEL_URL ?? 'https://example.com/';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: payload.label ?? 'SeekerMigrate upgrade',
              description: 'Developer tooling for Solana Mobile migrations',
            },
          },
        },
      ],
      metadata: payload.metadata,
      allow_promotion_codes: true,
    });

    return res.status(200).json({
      status: 'ready',
      provider: 'stripe',
      sessionId: session.id,
      checkoutUrl: session.url,
      amountUsd,
      amountCents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe session failed';
    return res.status(502).json({ error: message });
  }
}
