import { Redirect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Card, Paragraph, YStack } from 'tamagui';
import { useOnboarding } from '../src/onboarding/OnboardingContext';
import { triggerHaptic } from '../src/onboarding/feedback';
import { enforceMinFeedbackWindow } from '../src/onboarding/motion';
import { useWallet } from '../src/wallet/WalletContext';
import { connectWithMwa } from '../src/wallet/mwa';
import { ActionButton, FlowScreen, StateNotice } from './ui';

const PROMO_URL = 'https://seekermigrate.com';

export default function WalletSetup() {
  const router = useRouter();
  const { publicKey, authToken, connected, setSession, disconnect } = useWallet();
  const onboarding = useOnboarding();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const routeAfterConnect =
    onboarding.status.onboardingMode === 'migration-only' || onboarding.status.identityCompleted
      ? '/migrate'
      : '/identity';

  const continueLabel = routeAfterConnect === '/identity' ? 'Continue to identity' : 'Continue to migration tools';

  if (!onboarding.ready) {
    return (
      <YStack flex={1} justifyContent="center" padding="$5">
        <StateNotice title="Loading" body="Checking your setup status..." />
      </YStack>
    );
  }
  if (!onboarding.status.disclosureAccepted) return <Redirect href="/welcome" />;

  async function handleConnect() {
    try {
      setConnectError(null);
      setIsConnecting(true);
      const startedAt = Date.now();
      const session = await connectWithMwa({ authToken });
      await setSession(session.publicKey, session.authToken);
      await enforceMinFeedbackWindow(startedAt);
      void triggerHaptic('success');
      router.push(routeAfterConnect);
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Could not connect wallet. Please try again.');
      void triggerHaptic('error');
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <FlowScreen title="Wallet setup" subtitle="Connect your wallet to continue. This wallet becomes your account for identity and migration.">
      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Wallet status</Paragraph>
          <Paragraph color="$gray11">{connected && publicKey ? publicKey : 'No wallet connected'}</Paragraph>

          <StateNotice
            title="Next step"
            body={connected ? `Ready. ${continueLabel}.` : 'Connect wallet, then continue to the next step automatically.'}
            tone={connected ? 'positive' : 'neutral'}
          />

          {connected ? (
            <YStack gap="$2">
              <ActionButton
                theme="active"
                size="$5"
                haptic="success"
                onPress={() => router.push(routeAfterConnect)}
                accessibilityLabel={continueLabel}
              >
                {continueLabel}
              </ActionButton>
              <ActionButton size="$5" haptic="warning" onPress={disconnect} accessibilityLabel="Disconnect wallet">
                Disconnect wallet
              </ActionButton>
            </YStack>
          ) : (
            <ActionButton
              theme="active"
              size="$5"
              haptic="impact-medium"
              onPress={handleConnect}
              disabled={isConnecting}
              accessibilityLabel="Connect wallet"
            >
              {isConnecting ? 'Connecting wallet...' : 'Connect wallet'}
            </ActionButton>
          )}

          {connectError ? (
            <StateNotice title="Couldn’t connect" body={connectError} tone="danger">
              <ActionButton size="$4" haptic="warning" onPress={handleConnect}>Try again</ActionButton>
            </StateNotice>
          ) : null}
        </YStack>
      </Card>

      {onboarding.status.onboardingMode === 'migration-only' && !connected ? (
        <ActionButton chromeless haptic="warning" onPress={() => router.push('/migrate')} accessibilityLabel="Continue without wallet">
          Continue without wallet (migration-only)
        </ActionButton>
      ) : null}

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Need help?</Paragraph>
          <Paragraph color="$gray11">If your wallet app didn’t open, unlock your phone and retry.</Paragraph>
          <ActionButton size="$5" haptic="selection" onPress={() => Linking.openURL(PROMO_URL)} accessibilityLabel="Learn more about SeekerMigrate">
            Learn more
          </ActionButton>
        </YStack>
      </Card>
    </FlowScreen>
  );
}
