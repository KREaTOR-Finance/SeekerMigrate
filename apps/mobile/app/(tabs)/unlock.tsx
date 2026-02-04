import { useState } from 'react';
import { Button, Card, H2, Paragraph, YStack } from 'tamagui';
import { postJson } from '../../src/config/api';

type StripeResponse = {
  checkoutUrl?: string;
};

export default function Unlock() {
  const [status, setStatus] = useState<string>('');

  async function startStripe() {
    setStatus('');
    try {
      setStatus('Creating checkout...');
      const stripe = await postJson<StripeResponse>('/api/payments/stripe-session', {
        amountUsd: 50,
        label: 'SeekerMigrate DevKit ($50)',
        metadata: { kind: 'devkit', usd: '50' },
      });
      if (stripe.checkoutUrl) {
        setStatus('Checkout created. Open the link on web to complete payment.');
      } else {
        setStatus('Checkout URL missing (backend not configured yet).');
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Checkout failed');
    }
  }

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <H2>Pay / Unlock</H2>
      <Paragraph opacity={0.85}>
        Unlock DevKit for <strong>$50 per wallet</strong>. Payment can be SOL or SKR (and optionally card).
      </Paragraph>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Option 1: Pay with SOL / SKR</Paragraph>
          <Paragraph opacity={0.8}>
            This is the default path on Solana Mobile. Well show a quote + a pay address and then verify the receipt.
          </Paragraph>
          <Button disabled>Pay with wallet (wiring next)</Button>
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Option 2: Pay with card</Paragraph>
          <Paragraph opacity={0.8}>
            Stripe checkout (optional). Useful for teams that still need card rails.
          </Paragraph>
          <Button theme="active" onPress={startStripe}>Create card checkout</Button>
          {status ? <Paragraph opacity={0.8}>{status}</Paragraph> : null}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">What unlock includes</Paragraph>
          <Paragraph opacity={0.8}>
            Auth migration scaffolds, Solana wallet connect, payment module, vanity generator integration, and name service components.
          </Paragraph>
        </YStack>
      </Card>
    </YStack>
  );
}
