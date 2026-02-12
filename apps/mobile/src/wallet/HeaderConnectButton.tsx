import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Paragraph, XStack } from 'tamagui';
import { formatPk, useWallet } from './WalletContext';

export function HeaderConnectButton() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();

  return (
    <Pressable onPress={() => router.push('/wallet')} accessibilityRole="button" accessibilityLabel="Open wallet setup">
      <XStack
        alignItems="center"
        gap="$2"
        paddingHorizontal="$3"
        paddingVertical="$2"
        borderRadius="$6"
        backgroundColor="rgba(10, 14, 26, 0.55)"
        borderWidth={1}
        borderColor="rgba(244, 246, 255, 0.14)"
      >
        <Paragraph fontSize={12} opacity={0.9}>
          {connected && publicKey ? `Wallet ${formatPk(publicKey)}` : 'Connect wallet'}
        </Paragraph>
      </XStack>
    </Pressable>
  );
}
