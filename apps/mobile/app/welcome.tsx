import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Button, H1, Paragraph, YStack } from 'tamagui';

export default function Welcome() {
  const router = useRouter();

  useEffect(() => {
    // If you later want a timed auto-transition, do it here.
  }, []);

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
      <H1>SeekerMigrate</H1>
      <Paragraph textAlign="center" opacity={0.8}>
        Developer onboarding and services for Solana Mobile (Seeker). Not an app store.
      </Paragraph>
      <Button size="$5" theme="active" onPress={() => router.push('/disclosure')}>
        Get started
      </Button>
    </YStack>
  );
}
