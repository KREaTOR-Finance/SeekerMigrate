import { useRouter } from 'expo-router';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { Button, H2, Paragraph, YStack } from 'tamagui';

export default function SeekerIntro() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../assets/images/splash.brand.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <View style={styles.overlay} />
      <YStack flex={1} justifyContent="flex-end" padding="$6" gap="$4">
        <H2>What is Seeker?</H2>
        <Paragraph opacity={0.9}>
          Seeker is Solana Mobiles device + ecosystem. It includes a dApp Store built for web3 and an economy powered by SKR.
        </Paragraph>
        <Paragraph opacity={0.8}>
          SeekerMigrate helps app developers move off iOS/Google store lock-in and ship to Solana Mobile.
        </Paragraph>

        <YStack gap="$2">
          <Button theme="active" size="$5" onPress={() => router.push('/wallet')}>
            Continue
          </Button>
          <Button chromeless size="$5" onPress={() => router.push('/wallet')}>
            Skip
          </Button>
        </YStack>
      </YStack>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
