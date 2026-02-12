import { Redirect, useRouter } from 'expo-router';
import { Card, Paragraph, YStack } from 'tamagui';

import { getMigrateGuardMessage, migrationPlanSteps } from '../../../packages/migrate/src';
import { useOnboarding } from '../src/onboarding/OnboardingContext';
import { ActionButton, FlowScreen, StateNotice } from './ui';

export default function MigrateScreen() {
  const onboarding = useOnboarding();
  const router = useRouter();

  if (!onboarding.ready) {
    return (
      <YStack flex={1} justifyContent="center" padding="$5">
        <StateNotice title="Loading" body="Preparing migration tools..." />
      </YStack>
    );
  }

  const guardMessage = getMigrateGuardMessage(onboarding.status);
  if (guardMessage) {
    if (!onboarding.status.tutorialSeen) return <Redirect href="/tutorial" />;
    if (!onboarding.status.disclosureAccepted) return <Redirect href="/welcome" />;
    if (!onboarding.status.walletConnected) return <Redirect href="/wallet" />;
    if (onboarding.status.onboardingMode !== 'migration-only') return <Redirect href="/identity" />;
    return <Redirect href="/wallet" />;
  }

  const plan = migrationPlanSteps();

  return (
    <FlowScreen title="Build your migration plan" subtitle="Identity is complete. You're ready to run review and generate your next actions.">
      <StateNotice title="You’re ready" body="Run migration review first, then apply code changes with confidence." tone="positive" />

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">What happens next</Paragraph>
          {plan.map((step, index) => (
            <Paragraph key={step} color="$gray11">{`${index + 1}. ${step}`}</Paragraph>
          ))}
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$3">
          <Paragraph fontWeight="700">Run migration review</Paragraph>
          <Paragraph color="$gray11">Generate your report before making code updates.</Paragraph>
          <ActionButton size="$5" haptic="success" onPress={() => router.push('/devkit')} accessibilityLabel="Open migration tools">
            Open migration tools
          </ActionButton>
        </YStack>
      </Card>
    </FlowScreen>
  );
}
