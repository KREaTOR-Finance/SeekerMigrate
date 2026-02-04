import { useRouter } from 'expo-router';
import { Image, ImageBackground, StyleSheet, View } from 'react-native';
import { Button, Paragraph, YStack } from 'tamagui';

export default function Welcome() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../assets/images/splash.brand.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <View style={styles.overlay} />
      <YStack flex={1} justifyContent="flex-end" padding="$6" gap="$4">
        <View style={styles.wordmarkWrap}>
          <View style={styles.wordmarkFrame}>
            <Image
              source={require('../assets/images/wordmark.jpg')}
              style={styles.wordmark}
              resizeMode="contain"
            />
          </View>
        </View>

        <Paragraph opacity={0.85}>
          Upgrade Kit for Solana Mobile: wallet auth, payments, vanity, and name service.
        </Paragraph>

        <YStack gap="$2">
          <Button size="$5" theme="active" onPress={() => router.push('/seeker')}>
            Get started
          </Button>
          <Button size="$5" chromeless onPress={() => router.push('/seeker')}>
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
  wordmarkWrap: {
    alignItems: 'flex-start',
  },
  wordmarkFrame: {
    width: 320,
    height: 210,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  wordmark: {
    width: '100%',
    height: '100%',
  },
});
