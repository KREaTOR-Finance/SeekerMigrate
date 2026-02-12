import type { VercelRequest, VercelResponse } from '@vercel/node';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { getSupabaseAdmin } from '../_utils/supabase';
import { getRpcUrl, normalizeCluster, type SolanaCluster } from '../_utils/solana';
import { parseSmnsName } from './_names';
import { getUsdPrice, type SmnsProduct } from './_pricing';
import { verifyPayment, type PaymentCurrency } from './_verifyPayment';
import { quoteUsd, DEFAULT_SKR_MINT, USDC_MINT, SOL_MINT } from '../payments/_quote';

type Payload = {
  name?: string;
  tld?: string;
  owner?: string;
  cluster?: SolanaCluster;
  nonce?: string;
  message?: string;
  messageSignature?: string; // base58
  paymentSignature?: string; // tx sig
  paymentCurrency?: PaymentCurrency; // SOL | SKR | USDC
  paymentMint?: string; // optional override for SPL
  product?: SmnsProduct;
};

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

  const parsed = parseSmnsName(payload.name ?? '', payload.tld);
  if (!parsed) return res.status(400).json({ error: 'Invalid name (min 2 chars).' });

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
  if (nonceRow.name !== parsed.canonicalName) return res.status(403).json({ error: 'Nonce name mismatch' });
  if (nonceRow.action !== 'register') return res.status(403).json({ error: 'Nonce action mismatch' });
  if (nonceRow.expires_at && Date.parse(nonceRow.expires_at) < Date.now()) return res.status(410).json({ error: 'Nonce expired' });

  // Verify wallet signature
  try {
    if (!verifyMessage(owner, message, messageSignature)) {
      return res.status(403).json({ error: 'Invalid wallet signature' });
    }
  } catch {
    return res.status(400).json({ error: 'Unable to verify signature' });
  }

  // Ensure the signed message actually matches this action
  if (!message.includes('SMNS_CHALLENGE') || !message.includes(`owner=${owner}`) || !message.includes(`name=${parsed.canonicalName}`)) {
    return res.status(403).json({ error: 'Signed message does not match request' });
  }

  const cluster = normalizeCluster(payload.cluster);
  const rpcUrl = getRpcUrl(cluster);
  const treasury = (process.env.PAYMENT_TREASURY_ADDRESS ?? process.env.TREASURY_ADDRESS ?? '').trim();
  if (!treasury) {
    return res.status(500).json({ error: 'Missing PAYMENT_TREASURY_ADDRESS (or TREASURY_ADDRESS).' });
  }

  const product: SmnsProduct = payload.product ?? 'smns_name';
  const usd = getUsdPrice(product);
  const currency: PaymentCurrency = payload.paymentCurrency ?? 'SOL';

  const skrMint = (process.env.SKR_MINT ?? DEFAULT_SKR_MINT).trim();
  const mint = (payload.paymentMint ?? (currency === 'SOL' ? SOL_MINT : currency === 'USDC' ? USDC_MINT : skrMint)).trim();

  try {
    const quoted = await quoteUsd({ usd, currency, skrMint });
    const minAtomic = BigInt(String(quoted.atomicAmount));

    const payment = await verifyPayment({
      signature: paymentSignature,
      rpcUrl,
      treasury,
      currency,
      mint: currency === 'SOL' ? undefined : mint,
      minAtomic,
    });

    if (!payment.ok) {
      return res.status(402).json({
        error: payment.error,
        matchedAtomic: (payment as any).matchedAtomic?.toString?.() ?? null,
        treasuryTokenAccount: (payment as any).treasuryTokenAccount ?? null,
      });
    }

    // Check availability
    const { data: existing, error: existingErr } = await supabase
      .from('smns_names')
      .select('status')
      .eq('canonical_name', parsed.canonicalName)
      .maybeSingle();

    if (existingErr) return res.status(502).json({ error: existingErr.message });
    if (existing && existing.status === 'active') {
      return res.status(409).json({ error: 'Name already registered' });
    }

    // Insert registration
    const { error: insertErr } = await supabase.from('smns_names').upsert(
      {
        canonical_name: parsed.canonicalName,
        display_name: parsed.displayName,
        mirror_name: parsed.mirrorName,
        label: parsed.label,
        tld: parsed.tld,
        owner,
        status: 'active',
      },
      { onConflict: 'canonical_name' }
    );

    if (insertErr) return res.status(502).json({ error: insertErr.message });

    // Mark nonce as used
    await supabase.from('smns_nonces').update({ used_at: new Date().toISOString() }).eq('nonce', nonce);

    // Record entitlement
    await supabase.from('smns_entitlements').insert({
      owner,
      product,
      payment_signature: paymentSignature,
      usd,
      matched_lamports: currency === 'SOL' ? Number((payment as any).matchedAtomic ?? 0n) : null,
      cluster,
    });

    const paidAtomic = (payment as any).matchedAtomic?.toString?.() ?? null;

    return res.status(200).json({
      ok: true,
      product,
      name: parsed.displayName,
      canonicalName: parsed.canonicalName,
      mirrorName: parsed.mirrorName,
      owner,
      treasury,
      paymentSignature,
      // Back-compat: old fields for SOL-only clients.
      paidLamports: currency === 'SOL' ? Number(paidAtomic ?? 0) : null,
      requiredLamports: currency === 'SOL' ? Number(minAtomic) : null,
      paymentCurrency: currency,
      paymentMint: currency === 'SOL' ? SOL_MINT : mint,
      paidAtomic,
      requiredAtomic: minAtomic.toString(),
      cluster,
      rpc: rpcUrl,
      note: 'SMNS registration completed. SNS mirror publishing can be handled asynchronously when enabled.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return res.status(502).json({ error: message });
  }
}
