import { Card, Checkbox, Input, Paragraph, Select, XStack, YStack } from 'tamagui';
import { useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';

import { useWallet } from '../../src/wallet/WalletContext';
import { explorerAddressUrl, explorerTxUrl } from '../../src/config/explorer';
import { getJson, postJson } from '../../src/config/api';
import { buildTransactionsFromInstructions, type SerializedInstruction } from '../../src/wallet/tx';
import { signAndSendWithMwa, signMessageWithMwa } from '../../src/wallet/mwa';
import {
  getVanityRevealChallenge,
  getVanityStatus,
  requestVanity,
  revealVanitySecret,
  type VanityStatusResponse,
} from '../../src/config/vanity';
import {
  smnsChallenge,
  smnsLookup,
  smnsRegister,
  type SmnsLookupResponse,
  type SmnsRegisterResponse,
} from '../../src/config/smns';
import { triggerHaptic } from '../src/onboarding/feedback';
import { ActionButton, FlowScreen, StateNotice } from './ui';

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

type PaymentsMeta = {
  treasuryAddress: string | null;
  merchantAddress: string | null;
  merchantLabel: string;
  skrMint: string;
};

type QuoteResponse = {
  status: string;
  usd: number;
  currency: 'SOL' | 'SKR';
  mint: string;
  priceUsd: number;
  decimals: number;
  tokenAmount: number;
  atomicAmount: number;
  expiresAt: string;
};

function formatEta(seconds: number | null) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function rpcForCluster(cluster: 'mainnet-beta' | 'devnet' | 'testnet') {
  if (cluster === 'devnet') return 'https://api.devnet.solana.com';
  if (cluster === 'testnet') return 'https://api.testnet.solana.com';
  return 'https://api.mainnet-beta.solana.com';
}

function serializeIx(ix: import('@solana/web3.js').TransactionInstruction): SerializedInstruction {
  return {
    programId: ix.programId.toBase58(),
    keys: ix.keys.map((k) => ({
      pubkey: k.pubkey.toBase58(),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    dataBase64: Buffer.from(ix.data).toString('base64'),
  };
}

export default function Identity() {
  const wallet = useWallet();

  const [cluster, setCluster] = useState<'mainnet-beta' | 'devnet' | 'testnet'>('mainnet-beta');

  // SMNS
  const [tld, setTld] = useState<'sm' | 'skr' | 'seeker' | 'seismic'>('skr');
  const [name, setName] = useState('');
  const [lookupStatus, setLookupStatus] = useState('');
  const [lookupResult, setLookupResult] = useState<SmnsLookupResponse | null>(null);

  const [registerStatus, setRegisterStatus] = useState('');
  const [paymentSig, setPaymentSig] = useState<string | null>(null);
  const [registerResult, setRegisterResult] = useState<SmnsRegisterResponse | null>(null);

  // Vanity
  const [vanitySuffix, setVanitySuffix] = useState('');
  const [vanityRequestId, setVanityRequestId] = useState<string | null>(null);
  const [vanityStatus, setVanityStatus] = useState<VanityStatusResponse | null>(null);
  const [vanityMessage, setVanityMessage] = useState('');
  const [vanityLoading, setVanityLoading] = useState(false);
  const [vanitySecret, setVanitySecret] = useState<string | null>(null);
  const [vanityRevealStatus, setVanityRevealStatus] = useState<string>('');
  const [vanityAckReveal, setVanityAckReveal] = useState(false);

  const vanityValidation = useMemo(() => {
    const suffix = vanitySuffix.trim();
    if (!suffix) return { ok: false, message: 'Enter a 4-6 character Base58 suffix.' };
    if (suffix.length < 4 || suffix.length > 6) return { ok: false, message: 'Suffix must be 4-6 characters.' };
    if (!BASE58_RE.test(suffix)) return { ok: false, message: 'Use Base58 characters only (no 0, O, I, l).' };
    return { ok: true, message: `Looks good. We will search for an address ending in ${suffix}.` };
  }, [vanitySuffix]);

  useEffect(() => {
    let timer: any = null;
    let cancelled = false;

    async function tick() {
      if (!vanityRequestId) return;
      try {
        const status = await getVanityStatus({ requestId: vanityRequestId });
        if (cancelled) return;
        setVanityStatus(status);
        if (status.status === 'done' || status.status === 'complete' || status.status === 'success') {
          setVanityMessage('Vanity address ready.');
        } else if (status.status === 'failed' || status.status === 'error') {
          setVanityMessage('Vanity generation failed. Try a different suffix.');
        } else {
          setVanityMessage('Generating vanity address...');
        }
      } catch (e) {
        if (cancelled) return;
        setVanityMessage(e instanceof Error ? e.message : 'Unable to fetch vanity status');
      }
    }

    if (vanityRequestId) {
      tick();
      timer = setInterval(tick, 2500);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [vanityRequestId]);

  async function handleLookup() {
    setLookupStatus('');
    setLookupResult(null);
    setRegisterStatus('');
    setPaymentSig(null);
    setRegisterResult(null);

    try {
      if (!name.trim()) throw new Error('Enter a name');
      setLookupStatus('Looking up SMNS...');
      const result = await smnsLookup({ name: name.trim(), tld });
      setLookupResult(result);
      setLookupStatus(result.available ? 'Available' : 'Registered');
      void triggerHaptic(result.available ? 'success' : 'warning');
    } catch (e) {
      setLookupStatus(e instanceof Error ? e.message : 'Lookup failed');
      void triggerHaptic('error');
    }
  }

  async function handlePayAndRegister() {
    setRegisterStatus('');
    setPaymentSig(null);
    setRegisterResult(null);

    try {
      if (!wallet.publicKey) throw new Error('Connect wallet first');
      if (!lookupResult) throw new Error('Run lookup first');
      if (!lookupResult.available) throw new Error('Name is not available');

      // 1) Fetch treasury
      setRegisterStatus('Loading treasury...');
      const meta = await getJson<PaymentsMeta>('/api/payments/meta');
      const treasury = (meta.treasuryAddress ?? meta.merchantAddress ?? '').trim();
      if (!treasury) throw new Error('Treasury not configured');

      // 2) Quote SOL amount for $25
      setRegisterStatus('Fetching quote...');
      const quote = await postJson<QuoteResponse>('/api/payments/quote', { usd: 25, currency: 'SOL' });
      const lamports = Number(quote.atomicAmount);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error('Invalid quote');

      // 3) Build + send SOL transfer
      setRegisterStatus('Sending payment...');
      const ix = SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet.publicKey),
        toPubkey: new PublicKey(treasury),
        lamports,
      });

      const txs = await buildTransactionsFromInstructions({
        instructions: [serializeIx(ix)],
        feePayer: wallet.publicKey,
        rpcUrl: rpcForCluster(cluster),
      });

      const send = await signAndSendWithMwa({
        authToken: wallet.authToken,
        cluster,
        transactions: txs,
        options: { commitment: 'confirmed', skipPreflight: false },
      });

      const sig = send.signatures?.[0] ?? null;
      setPaymentSig(sig);
      if (!sig) throw new Error('Payment submitted but signature missing');

      // 4) Get SMNS challenge + sign message
      setRegisterStatus('Authorizing SMNS registration...');
      const challenge = await smnsChallenge({
        owner: wallet.publicKey,
        action: 'register',
        name: name.trim(),
        tld,
      });

      const msgBytes = new TextEncoder().encode(challenge.message);
      const signed = await signMessageWithMwa({ authToken: wallet.authToken, cluster, message: msgBytes });
      const messageSignature = bs58.encode(signed.signature);

      // 5) Register in SMNS (server verifies payment + signature)
      setRegisterStatus('Registering name in SMNS...');
      const reg = await smnsRegister({
        owner: wallet.publicKey,
        name: name.trim(),
        tld,
        cluster,
        nonce: challenge.nonce,
        message: challenge.message,
        messageSignature,
        paymentSignature: sig,
        product: 'smns_name',
      });

      setRegisterResult(reg);
      setRegisterStatus('Registered.');
      void triggerHaptic('success');
    } catch (e) {
      setRegisterStatus(e instanceof Error ? e.message : 'Register failed');
      void triggerHaptic('error');
    }
  }

  async function handleVanityRequest() {
    setVanityMessage('');
    setVanityStatus(null);
    setVanitySecret(null);
    setVanityRevealStatus('');
    setVanityAckReveal(false);

    try {
      if (!wallet.publicKey) throw new Error('Connect a wallet first (requester required).');
      if (!vanityValidation.ok) throw new Error(vanityValidation.message);

      setVanityLoading(true);
      setVanityMessage('Submitting request...');
      const resp = await requestVanity({ suffix: vanitySuffix.trim(), requester: wallet.publicKey, cluster });

      setVanityRequestId(resp.requestId);
      setVanityStatus({
        requestId: resp.requestId ?? 'unknown',
        status: resp.status ?? 'queued',
        etaSeconds: resp.etaSeconds ?? null,
        attempts: resp.attempts ?? null,
        address: resp.address ?? null,
        updatedAt: new Date().toISOString(),
      });
      setVanityMessage(resp.requestId ? 'Request queued. Polling status...' : 'Request sent.');
      void triggerHaptic('success');
    } catch (e) {
      setVanityMessage(e instanceof Error ? e.message : 'Vanity request failed');
      void triggerHaptic('error');
    } finally {
      setVanityLoading(false);
    }
  }

  async function handleVanityReveal() {
    setVanityRevealStatus('');

    try {
      if (!wallet.publicKey) throw new Error('Connect wallet first');
      if (!vanityRequestId) throw new Error('No requestId');
      if (!vanityStatus?.address) throw new Error('Vanity address not ready');
      if (!vanityAckReveal) throw new Error('Confirm you understand the risk before revealing the secret.');

      setVanityRevealStatus('Preparing reveal...');
      const ch = await getVanityRevealChallenge({ requestId: vanityRequestId, requester: wallet.publicKey });

      setVanityRevealStatus('Signing reveal message...');
      const msgBytes = new TextEncoder().encode(ch.message);
      const signed = await signMessageWithMwa({ authToken: wallet.authToken, cluster, message: msgBytes });
      const messageSignature = bs58.encode(signed.signature);

      setVanityRevealStatus('Revealing secret (one-time)...');
      const reveal = await revealVanitySecret({
        requestId: vanityRequestId,
        requester: wallet.publicKey,
        message: ch.message,
        messageSignature,
      });

      setVanitySecret(reveal.secretKeyBase58);
      setVanityRevealStatus('Secret revealed. Save it now.');
      void triggerHaptic('warning');
    } catch (e) {
      setVanityRevealStatus(e instanceof Error ? e.message : 'Reveal failed');
      void triggerHaptic('error');
    }
  }

  return (
    <FlowScreen
      title="Identity"
      subtitle="Reserve your name and optional vanity wallet. We'll guide each step and show status as you go."
    >
      <StateNotice
        title="Trust note"
        body="SMNS is the SeekerMigrate Name Service. Optional SNS mirror publishes under *.seekermigrate.sol."
      />

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Cluster</Paragraph>
          <Select value={cluster} onValueChange={(v) => setCluster(v as any)}>
            <Select.Trigger width={220}>
              <Select.Value placeholder="Cluster" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item index={0} value="mainnet-beta">
                <Select.ItemText>mainnet-beta</Select.ItemText>
              </Select.Item>
              <Select.Item index={1} value="devnet">
                <Select.ItemText>devnet</Select.ItemText>
              </Select.Item>
              <Select.Item index={2} value="testnet">
                <Select.ItemText>testnet</Select.ItemText>
              </Select.Item>
            </Select.Content>
          </Select>
          <Paragraph opacity={0.7}>Wallet: {wallet.connected ? wallet.publicKey : 'not connected'}</Paragraph>
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">SMNS Name</Paragraph>
          <XStack gap="$3" alignItems="center" flexWrap="wrap">
            <Input
              width={220}
              value={name}
              onChangeText={setName}
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Select value={tld} onValueChange={(v) => setTld(v as any)}>
              <Select.Trigger width={160}>
                <Select.Value placeholder="TLD" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item index={0} value="sm">
                  <Select.ItemText>.sm</Select.ItemText>
                </Select.Item>
                <Select.Item index={1} value="skr">
                  <Select.ItemText>.skr</Select.ItemText>
                </Select.Item>
                <Select.Item index={2} value="seeker">
                  <Select.ItemText>.seeker</Select.ItemText>
                </Select.Item>
                <Select.Item index={3} value="seismic">
                  <Select.ItemText>.seismic</Select.ItemText>
                </Select.Item>
              </Select.Content>
            </Select>
          </XStack>

          <Paragraph opacity={0.75}>Preview: {name ? `${name}.${tld}` : `—.${tld}`}</Paragraph>

          <ActionButton theme="active" size="$5" haptic="selection" onPress={handleLookup} accessibilityLabel="Check name availability">
            Check availability
          </ActionButton>

          {lookupStatus ? <Paragraph opacity={0.8}>{lookupStatus}</Paragraph> : null}

          {lookupResult ? (
            <YStack gap="$2">
              <Paragraph opacity={0.8}>Canonical: {lookupResult.canonicalName}</Paragraph>
              <Paragraph opacity={0.8}>Mirror (SNS): {lookupResult.mirrorName}</Paragraph>
              <Paragraph opacity={0.8}>Owner: {lookupResult.owner ?? '—'}</Paragraph>

              {lookupResult.owner ? (
                <ActionButton
                  size="$3"
                  onPress={() => Linking.openURL(explorerAddressUrl(lookupResult.owner as string, cluster))}
                >
                  View owner on Explorer
                </ActionButton>
              ) : null}

              {lookupResult.available ? (
                <YStack gap="$2" paddingTop="$2">
                  <Paragraph opacity={0.85}>$25 to register. Payment goes to SeekerMigrate treasury.</Paragraph>
                  <ActionButton
                    theme="active"
                    size="$5"
                    disabled={!wallet.connected}
                    haptic="impact-medium"
                    onPress={handlePayAndRegister}
                    accessibilityLabel="Pay and register name"
                  >
                    Pay & Register
                  </ActionButton>
                  {registerStatus ? <Paragraph opacity={0.8}>{registerStatus}</Paragraph> : null}

                  {paymentSig ? (
                    <ActionButton size="$3" onPress={() => Linking.openURL(explorerTxUrl(paymentSig, cluster))}>
                      View payment tx
                    </ActionButton>
                  ) : null}

                  {registerResult ? (
                    <YStack gap="$2">
                      <Paragraph opacity={0.8}>Registered: {registerResult.name}</Paragraph>
                      <Paragraph opacity={0.75}>Canonical: {registerResult.canonicalName}</Paragraph>
                      <Paragraph opacity={0.75}>Mirror: {registerResult.mirrorName}</Paragraph>
                    </YStack>
                  ) : null}
                </YStack>
              ) : null}
            </YStack>
          ) : null}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Vanity wallet</Paragraph>
          <Paragraph opacity={0.8}>Pick a Base58 suffix (4-6 chars). 4 is fastest.</Paragraph>

          <Input
            width={240}
            value={vanitySuffix}
            onChangeText={setVanitySuffix}
            placeholder="ABCD"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />

          <Paragraph opacity={0.8}>{vanityValidation.message}</Paragraph>

          <ActionButton
            theme="active"
            size="$5"
            disabled={!wallet.connected || !vanityValidation.ok || vanityLoading}
            haptic="impact-medium"
            onPress={handleVanityRequest}
            accessibilityLabel="Request vanity wallet"
          >
            {vanityLoading ? 'Requesting…' : 'Request vanity'}
          </ActionButton>

          {vanityMessage ? <Paragraph opacity={0.8}>{vanityMessage}</Paragraph> : null}

          {vanityRequestId ? (
            <YStack gap="$2">
              <Paragraph opacity={0.75}>Request ID: {vanityRequestId}</Paragraph>
              <Paragraph opacity={0.75}>Status: {vanityStatus?.status ?? 'queued'}</Paragraph>
              <Paragraph opacity={0.75}>ETA: {formatEta(vanityStatus?.etaSeconds ?? null)}</Paragraph>
              <Paragraph opacity={0.75}>Attempts: {vanityStatus?.attempts ?? '—'}</Paragraph>
              {vanityStatus?.address ? (
                <YStack gap="$2">
                  <ActionButton
                    size="$3"
                    onPress={() => Linking.openURL(explorerAddressUrl(vanityStatus.address as string, cluster))}
                  >
                    View address on Explorer
                  </ActionButton>

                  <XStack gap="$2" alignItems="center">
                    <Checkbox
                      size="$3"
                      checked={vanityAckReveal}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        setVanityAckReveal(checked);
                        void triggerHaptic(checked ? 'selection' : 'impact-light');
                      }}
                    />
                    <Paragraph opacity={0.8} flex={1}>
                      I understand: revealing the secret key will show it once. Anyone with it controls the wallet.
                    </Paragraph>
                  </XStack>

                  <ActionButton size="$3" theme="active" haptic="warning" onPress={handleVanityReveal} disabled={!vanityAckReveal}>
                    Reveal secret (one-time)
                  </ActionButton>

                  {vanityRevealStatus ? <Paragraph opacity={0.8}>{vanityRevealStatus}</Paragraph> : null}

                  {vanitySecret ? (
                    <YStack gap="$2">
                      <Paragraph fontWeight="700">Secret key (base58)</Paragraph>
                      <Paragraph opacity={0.9} selectable>
                        {vanitySecret}
                      </Paragraph>
                      <Paragraph opacity={0.75}>
                        Store this securely. Anyone with this secret controls the vanity wallet.
                      </Paragraph>
                    </YStack>
                  ) : null}
                </YStack>
              ) : null}
            </YStack>
          ) : null}
        </YStack>
      </Card>
    </FlowScreen>
  );
}
