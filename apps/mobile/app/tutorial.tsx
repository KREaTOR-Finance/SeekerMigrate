import { useRouter } from 'expo-router';
import { Card, Paragraph, YStack } from 'tamagui';

import { useOnboarding } from '../src/onboarding/OnboardingContext';
import { enforceMinFeedbackWindow } from '../src/onboarding/motion';
import { ActionButton, FlowScreen, StateNotice } from './ui';

const ACTIONS = [
  'Review custody and safety reminders',
  'Connect your wallet',
  'Confirm identity path',
  'Run migration review and unlock delivery',
];

export default function TutorialScreen() {
  const router = useRouter();
  const onboarding = useOnboarding();

  async function continueWith(mode: 'identity-first' | 'migration-only') {
    const startedAt = Date.now();
    await onboarding.setOnboardingMode(mode);
    await onboarding.setTutorialSeen(true);
    await enforceMinFeedbackWindow(startedAt);
    router.replace('/welcome');
  }

  if (!onboarding.ready) {
    return (
      <YStack flex={1} justifyContent="center" padding="$5">
        <StateNotice title="Loading" body="Preparing your onboarding path..." />
      </YStack>
    );
  }

  return (
    <FlowScreen title="Quick setup" subtitle="Pick a path now. You can change it later in settings.">
      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">What happens next</Paragraph>
          {ACTIONS.map((action, index) => (
            <Paragraph key={action} color="$gray11">{`${index + 1}. ${action}`}</Paragraph>
          ))}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Recommended path</Paragraph>
          <Paragraph color="$gray11">Disclosure → Wallet → Identity → Migrate</Paragraph>
          <ActionButton
            theme="active"
            size="$5"
            haptic="success"
            onPress={() => continueWith('identity-first')}
            accessibilityLabel="Start recommended onboarding path"
          >
            Start recommended path
          </ActionButton>
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Migration only</Paragraph>
          <Paragraph color="$gray11">Use this if your identity setup is already done.</Paragraph>
          <ActionButton
            size="$5"
            haptic="warning"
            onPress={() => continueWith('migration-only')}
            accessibilityLabel="Start migration-only path"
          >
            Start migration-only path
          </ActionButton>
        </YStack>
      </Card>
    </FlowScreen>
  );
}
