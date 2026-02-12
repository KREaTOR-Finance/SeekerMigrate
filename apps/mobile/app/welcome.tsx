import { Redirect, useRouter } from 'expo-router';
import { Image, ImageBackground, StyleSheet, View } from 'react-native';
import { Checkbox, Paragraph, XStack, YStack } from 'tamagui';
import { useState } from 'react';

import { useOnboarding } from '../src/onboarding/OnboardingContext';
import { triggerHaptic } from '../src/onboarding/feedback';
import { enforceMinFeedbackWindow } from '../src/onboarding/motion';
import { ActionButton, StateNotice } from './ui';

export default function WelcomeDisclosureScreen() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const [confirmed, setConfirmed] = useState(false);

  if (!onboarding.ready) {
    return (
      <YStack flex={1} justifyContent="center" padding="$5">
        <StateNotice title="Loading" body="Preparing your setup..." />
      </YStack>
    );
  }

  if (onboarding.status.disclosureAccepted) {
    if (!onboarding.status.tutorialSeen) return <Redirect href="/tutorial" />;
    return <Redirect href="/wallet" />;
  }

  async function acceptAndContinue() {
    if (!confirmed) {
      void triggerHaptic('warning');
      return;
    }

    const startedAt = Date.now();
    await onboarding.setDisclosureAccepted(true);
    await enforceMinFeedbackWindow(startedAt);
    void triggerHaptic('success');

    if (!onboarding.status.tutorialSeen) {
      router.replace('/tutorial');
      return;
    }
    router.replace('/wallet');
  }

  return (
    <ImageBackground source={require('../assets/images/splash.brand.png')} resizeMode="cover" style={styles.bg}>
      <View style={styles.overlay} />
      <YStack flex={1} justifyContent="center" padding="$5" gap="$4">
        <Image source={require('../assets/images/wordmark.jpg')} style={styles.wordmark} resizeMode="contain" />

        <StateNotice
          title="Welcome to SeekerMigrate"
          body="Move to a wallet-first Solana Mobile flow with guided setup for wallet, identity, and migration."
        >
          <Paragraph color="$gray11">You stay in control of your wallet and keys at every step.</Paragraph>

          <XStack gap="$2" alignItems="center" marginTop="$2">
            <Checkbox
              size="$4"
              checked={confirmed}
              onCheckedChange={(v) => {
                const checked = Boolean(v);
                setConfirmed(checked);
                void triggerHaptic(checked ? 'selection' : 'impact-light');
              }}
              accessibilityLabel="Confirm terms"
            />
            <Paragraph color="$gray11" flex={1}>
              I understand and accept these terms to continue.
            </Paragraph>
          </XStack>

          <ActionButton
            marginTop="$2"
            theme="active"
            size="$5"
            disabled={!confirmed}
            onPress={acceptAndContinue}
            haptic={confirmed ? 'success' : 'warning'}
            accessibilityLabel="Accept terms and continue"
          >
            Accept and continue
          </ActionButton>
        </StateNotice>
      </YStack>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  wordmark: {
    width: 280,
    height: 140,
    alignSelf: 'center',
  },
});
