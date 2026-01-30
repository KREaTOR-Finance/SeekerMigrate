import { useState } from 'react';
import { Button, Card, H2, Paragraph, Select, XStack, YStack, Input } from 'tamagui';
import { postJson } from '../../src/config/api';

type QuoteResponse = {
  usd: number;
  currency: 'SOL' | 'SKR';
  tokenAmount: number;
  atomicAmount: number;
  priceUsd: number;
  expiresAt: string;
};

type StripeResponse = {
  checkoutUrl?: string;
};

export default function Unlock() {
  const [usd, setUsd] = useState('50');
  const [currency, setCurrency] = useState<'USD' | 'SOL' | 'SKR'>('USD');
  const [status, setStatus] = useState<string>('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  const usdNumber = Math.max(Number(usd) || 0, 0);
  const reward = Math.round(usdNumber * 100);

  async function startDonation() {
    setStatus('');
    setQuote(null);

    if (!usdNumber) {
      setStatus('Enter a donation amount.');
      return;
    }

    try {
      if (currency === 'USD') {
        setStatus('Creating Stripe checkout...');
        const stripe = await postJson<StripeResponse>('/api/payments/stripe-session', {
          amountUsd: usdNumber,
          label: 'SeekerMigrate donation',
          metadata: { kind: 'donation', usd: String(usdNumber) },
        });
        if (stripe.checkoutUrl) {
          setStatus('Stripe checkout ready (open on web in-app later).');
          // For now, just show the URL.
        } else {
          setStatus('Stripe checkout URL missing');
        }
        return;
      }

      setStatus('Fetching on-chain quote...');
      const q = await postJson<QuoteResponse>('/api/payments/quote', {
        usd: usdNumber,
        currency,
      });
      setQuote(q);
      setStatus('Quote ready. Next: pay and verify receipt (wiring next).');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Donation failed');
    }
  }

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <H2>Unlock full DevKit</H2>
      <Paragraph opacity={0.85}>
        Full DevKit unlocks when you purchase Name Registration + Vanity Address ($25 each) or donate ($50+).
      </Paragraph>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Donation</Paragraph>
          <XStack gap="$3" alignItems="center" flexWrap="wrap">
            <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
              <Select.Trigger width={180}>
                <Select.Value placeholder="Currency" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item index={0} value="USD">
                  <Select.ItemText>USD (Stripe)</Select.ItemText>
                </Select.Item>
                <Select.Item index={1} value="SOL">
                  <Select.ItemText>SOL</Select.ItemText>
                </Select.Item>
                <Select.Item index={2} value="SKR">
                  <Select.ItemText>SKR</Select.ItemText>
                </Select.Item>
              </Select.Content>
            </Select>
            <Input width={140} value={usd} onChangeText={setUsd} keyboardType="numeric" />
          </XStack>
          <Paragraph opacity={0.8}>Reward: {reward.toLocaleString()} SKRm (N × 100)</Paragraph>
          <Button theme="active" onPress={startDonation}>
            Start donation
          </Button>
          {status ? <Paragraph opacity={0.8}>{status}</Paragraph> : null}
          {quote ? (
            <Paragraph opacity={0.8}>
              Quote: {quote.tokenAmount.toFixed(6)} {quote.currency} (expires {quote.expiresAt})
            </Paragraph>
          ) : null}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Path A (recommended)</Paragraph>
          <Paragraph opacity={0.8}>Buy Name Registration + Vanity Address ($25 each) to unlock.</Paragraph>
          <Button chromeless disabled>
            Wiring next
          </Button>
        </YStack>
      </Card>
    </YStack>
  );
}
