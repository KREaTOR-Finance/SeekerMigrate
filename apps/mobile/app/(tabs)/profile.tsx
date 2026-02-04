import { useMemo, useState } from 'react';
import { Button, Card, Checkbox, H2, Input, Paragraph, XStack, YStack } from 'tamagui';
import * as Linking from 'expo-linking';
import bs58 from 'bs58';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { useWallet } from '../../src/wallet/WalletContext';
import { getJson, postJson } from '../../src/config/api';
import { explorerTxUrl } from '../../src/config/explorer';
import { buildTransactionsFromInstructions } from '../../src/wallet/tx';
import { signAndSendWithMwa, signMessageWithMwa } from '../../src/wallet/mwa';
import { badgeChallenge, badgeRequest } from '../../src/config/badges';

type ProfileDraft = {
  displayName: string;
  projectName: string;
  tagline: string;
  description: string;
  website: string;
  email: string;
  x: string;
  telegram: string;
  discord: string;
  store: string;
};

export default function Profile() {
  const wallet = useWallet();
  const [status, setStatus] = useState('');

  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: '',
    projectName: '',
    tagline: '',
    description: '',
    website: '',
    email: '',
    x: '',
    telegram: '',
    discord: '',
    store: '',
  });

  const profileJson = useMemo(() => {
    return {
      schema: 'seekermigrate.profile.v1',
      wallet: wallet.publicKey ?? undefined,
      displayName: draft.displayName || undefined,
      projectName: draft.projectName || undefined,
      tagline: draft.tagline || undefined,
      description: draft.description || undefined,
      links: {
        website: draft.website || undefined,
        email: draft.email || undefined,
        x: draft.x || undefined,
        telegram: draft.telegram || undefined,
        discord: draft.discord || undefined,
        seekerStore: draft.store || undefined,
      },
      updatedAt: new Date().toISOString(),
      note:
        'This is your app-side profile tied to your connected wallet. Optional add-on: request a Profile Badge (on-chain business card) as a service.',
    };
  }, [draft, wallet.publicKey]);

  const profileJsonText = useMemo(() => JSON.stringify(profileJson, null, 2), [profileJson]);

  // Badge service
  const [badgeAck, setBadgeAck] = useState(false);
  const [badgeStatus, setBadgeStatus] = useState('');
  const [badgePaymentSig, setBadgePaymentSig] = useState<string | null>(null);
  const [badgeRequestId, setBadgeRequestId] = useState<string | null>(null);

  async function requestBadgeService() {
    setBadgeStatus('');
    setBadgePaymentSig(null);
    setBadgeRequestId(null);

    try {
      if (!wallet.publicKey) throw new Error('Connect wallet first');
      if (!badgeAck) throw new Error('Confirm you understand this creates an on-chain badge request.');

      // 1) Treasury
      setBadgeStatus('Loading treasury...');
      const meta = await getJson<{ treasuryAddress: string | null; merchantAddress: string | null }>('/api/payments/meta');
      const treasury = (meta.treasuryAddress ?? meta.merchantAddress ?? '').trim();
      if (!treasury) throw new Error('Treasury not configured');

      // 2) Quote $25 in SOL
      setBadgeStatus('Fetching quote...');
      const quote = await postJson<{ atomicAmount: number }>('/api/payments/quote', { usd: 25, currency: 'SOL' });
      const lamports = Number(quote.atomicAmount);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error('Invalid quote');

      // 3) Pay treasury
      setBadgeStatus('Sending payment...');
      const ix = SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet.publicKey),
        toPubkey: new PublicKey(treasury),
        lamports,
      });

      const txs = await buildTransactionsFromInstructions({
        instructions: [
          {
            programId: ix.programId.toBase58(),
            keys: ix.keys.map((k) => ({
              pubkey: k.pubkey.toBase58(),
              isSigner: k.isSigner,
              isWritable: k.isWritable,
            })),
            dataBase64: Buffer.from(ix.data).toString('base64'),
          },
        ],
        feePayer: wallet.publicKey,
        rpcUrl: 'https://api.mainnet-beta.solana.com',
      });

      const send = await signAndSendWithMwa({
        authToken: wallet.authToken,
        cluster: 'mainnet-beta',
        transactions: txs,
        options: { commitment: 'confirmed', skipPreflight: false },
      });

      const paymentSignature = send.signatures?.[0] ?? null;
      if (!paymentSignature) throw new Error('Payment signature missing');
      setBadgePaymentSig(paymentSignature);

      // 4) Challenge (server binds profile hash)
      setBadgeStatus('Preparing badge request...');
      const ch = await badgeChallenge({ owner: wallet.publicKey, profileJson });

      // 5) Sign message
      setBadgeStatus('Signing message...');
      const msgBytes = new TextEncoder().encode(ch.message);
      const signed = await signMessageWithMwa({
        authToken: wallet.authToken,
        cluster: 'mainnet-beta',
        message: msgBytes,
      });
      const messageSignature = bs58.encode(signed.signature);

      // 6) Submit request
      setBadgeStatus('Submitting request...');
      const resp = await badgeRequest({
        owner: wallet.publicKey,
        cluster: 'mainnet-beta',
        nonce: ch.nonce,
        message: ch.message,
        messageSignature,
        paymentSignature,
        profileJson,
      });

      setBadgeRequestId(resp.requestId);
      setBadgeStatus('Badge request submitted.');
    } catch (e) {
      setBadgeStatus(e instanceof Error ? e.message : 'Badge request failed');
    }
  }

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <H2>Profile</H2>
      <Paragraph opacity={0.85}>
        This is your in-app profile tied to your connected wallet. Profile Badges are an optional paid service (on-chain
        business card) — not required.
      </Paragraph>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Wallet</Paragraph>
          <Paragraph opacity={0.8}>{wallet.connected ? wallet.publicKey : 'Not connected'}</Paragraph>
          <Paragraph opacity={0.7}>Wallet connect/disconnect lives in the Wallet tab.</Paragraph>
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Profile details</Paragraph>

          <Input
            value={draft.displayName}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, displayName: v }))}
            placeholder="Display name (e.g. yourname.sm)"
            autoCapitalize="none"
          />
          <Input
            value={draft.projectName}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, projectName: v }))}
            placeholder="Project / app name"
          />
          <Input
            value={draft.tagline}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, tagline: v }))}
            placeholder="Tagline"
          />
          <Input
            value={draft.description}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, description: v }))}
            placeholder="Description"
          />

          <Input
            value={draft.website}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, website: v }))}
            placeholder="Website (https://)"
            autoCapitalize="none"
          />
          <Input
            value={draft.email}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, email: v }))}
            placeholder="Contact email"
            autoCapitalize="none"
          />
          <Input
            value={draft.x}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, x: v }))}
            placeholder="X (Twitter)"
            autoCapitalize="none"
          />
          <Input
            value={draft.telegram}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, telegram: v }))}
            placeholder="Telegram"
            autoCapitalize="none"
          />
          <Input
            value={draft.discord}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, discord: v }))}
            placeholder="Discord"
            autoCapitalize="none"
          />
          <Input
            value={draft.store}
            onChangeText={(v: string) => setDraft((p) => ({ ...p, store: v }))}
            placeholder="Seeker / dApp Store URL"
            autoCapitalize="none"
          />

          <Button
            theme="active"
            onPress={() => {
              setStatus('Saved (local demo).');
            }}
          >
            Save profile
          </Button>

          {status ? <Paragraph opacity={0.8}>{status}</Paragraph> : null}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Profile Badge (service)</Paragraph>
          <Paragraph opacity={0.8}>
            Optional: request a Profile Badge (on-chain business card) as a service.
          </Paragraph>

          <XStack gap="$2" alignItems="center">
            <Checkbox checked={badgeAck} onCheckedChange={(v: any) => setBadgeAck(!!v)} size="$3" />
            <Paragraph opacity={0.8} flex={1}>
              I understand this creates an on-chain badge request and requires payment.
            </Paragraph>
          </XStack>

          <Button theme="active" disabled={!badgeAck || !wallet.connected} onPress={requestBadgeService}>
            Pay & request badge ($25)
          </Button>

          {badgeStatus ? <Paragraph opacity={0.8}>{badgeStatus}</Paragraph> : null}
          {badgePaymentSig ? <Paragraph opacity={0.75}>Payment: {badgePaymentSig}</Paragraph> : null}
          {badgePaymentSig ? (
            <Button size="$3" onPress={() => Linking.openURL(explorerTxUrl(badgePaymentSig, 'mainnet-beta'))}>
              View payment on Explorer
            </Button>
          ) : null}
          {badgeRequestId ? <Paragraph opacity={0.75}>Request ID: {badgeRequestId}</Paragraph> : null}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Preview JSON</Paragraph>
          <Paragraph opacity={0.75}>This payload is used by the badge service request.</Paragraph>
          <Paragraph fontFamily="$mono" fontSize={12} opacity={0.9}>
            {profileJsonText}
          </Paragraph>
        </YStack>
      </Card>
    </YStack>
  );
}
