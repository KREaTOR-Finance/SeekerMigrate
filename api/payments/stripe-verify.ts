import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

type Payload = {
  sessionId?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  }

  const payload = (req.body ?? {}) as Payload;
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '';
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-12-15.clover',
  });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.status(200).json({
      ok: true,
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
      paid: session.payment_status === 'paid',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe verification failed';
    return res.status(502).json({ error: message });
  }
}
