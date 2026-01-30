import { useRouter } from 'expo-router';
import { Button, H2, Paragraph, YStack, XStack } from 'tamagui';
import * as SecureStore from 'expo-secure-store';

const KEY = 'seekermigrate.disclosure.accepted';

export default function Disclosure() {
  const router = useRouter();

  async function accept() {
    await SecureStore.setItemAsync(KEY, 'yes');
    router.replace('/(tabs)/home');
  }

  async function decline() {
    await SecureStore.deleteItemAsync(KEY);
    // Keep user on disclosure.
  }

  return (
    <YStack flex={1} justifyContent="center" padding="$6" gap="$4">
      <H2>Welcome to SeekerMigrate</H2>
      <Paragraph opacity={0.85}>
        SeekerMigrate helps professional teams ship Solana Mobile compatible apps.
      </Paragraph>
      <Paragraph opacity={0.85}>
        Never paste seed phrases or private keys. All signing happens in-wallet on device.
      </Paragraph>
      <XStack gap="$3" marginTop="$2">
        <Button theme="active" onPress={accept}>
          Accept and Continue
        </Button>
        <Button chromeless onPress={decline}>
          Decline
        </Button>
      </XStack>
    </YStack>
  );
}
