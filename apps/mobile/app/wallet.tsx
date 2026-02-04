import { useRouter } from 'expo-router';
import { Button, Card, H2, Paragraph, YStack } from 'tamagui';
import { useWallet } from '../src/wallet/WalletContext';
import { connectWithMwa } from '../src/wallet/mwa';

export default function WalletSetup() {
  const router = useRouter();
  const { publicKey, authToken, setSession, disconnect } = useWallet();

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <H2>Wallet</H2>
      <Paragraph opacity={0.85}>
        SeekerMigrate is wallet-based. Your wallet can unlock DevKit and can own your identity.
      </Paragraph>
      {publicKey ? (
        <Card padded elevate>
          <YStack gap="$2">
            <Paragraph fontWeight="700">Connected</Paragraph>
            <Paragraph opacity={0.8}>{publicKey}</Paragraph>
            <Button onPress={disconnect}>Disconnect</Button>
          </YStack>
        </Card>
      ) : null}

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Create a new wallet</Paragraph>
          <Paragraph opacity={0.8}>
            Recommended for Seeker devices (Seed Vault). (Wiring MWA next.)
          </Paragraph>
          <Button
            theme="active"
            onPress={async () => {
              const session = await connectWithMwa({ authToken });
              await setSession(session.publicKey, session.authToken);
              router.push('/identity');
            }}
          >
            Create wallet
          </Button>
        </YStack>
      </Card>

      <Card padded elevate>
        <YStack gap="$2">
          <Paragraph fontWeight="700">Use existing wallet</Paragraph>
          <Paragraph opacity={0.8}>
            Connect an existing Solana wallet and continue.
          </Paragraph>
          <Button
            onPress={async () => {
              const session = await connectWithMwa({ authToken });
              await setSession(session.publicKey, session.authToken);
              router.push('/identity');
            }}
          >
            Connect wallet
          </Button>
        </YStack>
      </Card>

      <Button chromeless onPress={() => router.push('/identity')}>Skip for now</Button>

      <Paragraph opacity={0.6} fontSize={12}>
        Uses Solana Mobile Wallet Adapter (Seed Vault / compatible wallets). Requires an Expo dev-client or release build.
      </Paragraph>
    </YStack>
  );
}
