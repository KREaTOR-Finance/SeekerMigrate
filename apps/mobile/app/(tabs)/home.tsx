import { H2, Paragraph, YStack, Card, Button } from 'tamagui';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <H2>SeekerMigrate</H2>
      <Paragraph opacity={0.8}>
        Mainnet-only onboarding & services for Seeker. Run free AUTH migration, then unlock full DevKit.
      </Paragraph>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Free DevKit</Paragraph>
          <Paragraph opacity={0.8}>AUTH conversion + migration report (free forever).</Paragraph>
          <Button onPress={() => router.push('/(tabs)/unlock')}>Unlock options</Button>
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Profile badge</Paragraph>
          <Paragraph opacity={0.8}>
            One profile per wallet. Business card data will live in decentralized NFT metadata.
          </Paragraph>
          <Button chromeless onPress={() => router.push('/(tabs)/profile')}>
            View profile tools
          </Button>
        </YStack>
      </Card>
    </YStack>
  );
}
