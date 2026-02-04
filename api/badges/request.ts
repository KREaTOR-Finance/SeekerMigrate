import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { getSupabaseAdmin } from '../_utils/supabase';
import { getRpcUrl, normalizeCluster, type SolanaCluster } from '../_utils/solana';
import { getUsdPrice, requiredLamportsForUsd } from '../smns/_pricing';
import { verifySolPayment } from '../smns/_verifyPayment';

type Payload = {
  owner?: string;
  cluster?: SolanaCluster;
  nonce?: string;
  message?: string;
  messageSignature?: string; // base58
  paymentSignature?: string; // tx sig
  profileJson?: unknown;
};

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function verifyMessage(owner: string, message: string, sig58: string) {
  const sig = bs58.decode(sig58);
  const pk = bs58.decode(owner);
  const msg = new TextEncoder().encode(message);
  return nacl.sign.detached.verify(msg, sig, pk);
}

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
  const nonce = (payload.nonce ?? '').toString().trim();
  const message = (payload.message ?? '').toString();
  const messageSignature = (payload.messageSignature ?? '').toString().trim();
  const paymentSignature = (payload.paymentSignature ?? '').toString().trim();

  if (!owner) return res.status(400).json({ error: 'owner is required' });
  if (!nonce) return res.status(400).json({ error: 'nonce is required' });
  if (!message || !messageSignature) return res.status(400).json({ error: 'message and messageSignature are required' });
  if (!paymentSignature) return res.status(400).json({ error: 'paymentSignature is required' });
  if (!payload.profileJson) return res.status(400).json({ error: 'profileJson is required' });

  const profileText = JSON.stringify(payload.profileJson);
  const profileHash = sha256Hex(profileText);

  // Validate nonce
  const { data: nonceRow, error: nonceErr } = await supabase
    .from('smns_nonces')
    .select('*')
    .eq('nonce', nonce)
    .maybeSingle();

  if (nonceErr) return res.status(502).json({ error: nonceErr.message });
  if (!nonceRow) return res.status(400).json({ error: 'Invalid nonce' });
  if (nonceRow.used_at) return res.status(409).json({ error: 'Nonce already used' });
  if (nonceRow.owner !== owner) return res.status(403).json({ error: 'Nonce owner mismatch' });
  if (nonceRow.action !== 'badge-request') return res.status(403).json({ error: 'Nonce action mismatch' });
  if (nonceRow.name !== `profileHash:${profileHash}`) return res.status(403).json({ error: 'Profile hash mismatch' });
  if (nonceRow.expires_at && Date.parse(nonceRow.expires_at) < Date.now()) return res.status(410).json({ error: 'Nonce expired' });

  // Verify wallet signature
  try {
    if (!verifyMessage(owner, message, messageSignature)) {
      return res.status(403).json({ error: 'Invalid wallet signature' });
    }
  } catch {
    return res.status(400).json({ error: 'Unable to verify signature' });
  }

  if (!message.includes('SMNS_BADGE_CHALLENGE') || !message.includes(`owner=${owner}`) || !message.includes(`profileHash=${profileHash}`)) {
    return res.status(403).json({ error: 'Signed message does not match request' });
  }

  const cluster = normalizeCluster(payload.cluster);
  const rpc = getRpcUrl(cluster);
  const treasury = (process.env.PAYMENT_TREASURY_ADDRESS ?? process.env.TREASURY_ADDRESS ?? '').trim();
  if (!treasury) {
    return res.status(500).json({ error: 'Missing PAYMENT_TREASURY_ADDRESS (or TREASURY_ADDRESS).' });
  }

  try {
    const usd = getUsdPrice('profile_badge_service');
    const minLamports = await requiredLamportsForUsd(usd);

    const payment = await verifySolPayment({
      signature: paymentSignature,
      rpcUrl: rpc,
      treasury,
      minLamports,
    });

    if (!payment.ok) {
      return res.status(402).json({ error: payment.error, matchedLamports: (payment as any).matchedLamports ?? null });
    }

    const requestId = crypto.randomUUID();

    const { error: insertErr } = await supabase.from('smns_badge_requests').insert({
      id: requestId,
      owner,
      profile_hash: profileHash,
      profile_json: payload.profileJson,
      payment_signature: paymentSignature,
      cluster,
      status: 'queued',
    });

    if (insertErr) {
      return res.status(502).json({ error: insertErr.message, hint: 'Did you apply docs/BADGE_SCHEMA.sql in Supabase?' });
    }

    await supabase.from('smns_nonces').update({ used_at: new Date().toISOString() }).eq('nonce', nonce);

    // Record entitlement (optional)
    await supabase.from('smns_entitlements').insert({
      owner,
      product: 'profile_badge_service',
      payment_signature: paymentSignature,
      usd,
      matched_lamports: payment.matchedLamports,
      cluster,
    });

    return res.status(200).json({
      ok: true,
      requestId,
      owner,
      profileHash,
      status: 'queued',
      cluster,
      rpc,
      treasury,
      paymentSignature,
      paidLamports: payment.matchedLamports,
      requiredLamports: minLamports,
      note: 'Badge request queued. Minting/publishing is performed as a service asynchronously.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Badge request failed';
    return res.status(502).json({ error: message });
  }
}
