import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { Button, Card, H2, Input, Paragraph, Select, XStack, YStack } from 'tamagui';

export default function Identity() {
  const router = useRouter();

  const [tld, setTld] = useState<'sol' | 'skr' | 'seeker' | 'seismic'>('skr');
  const [name, setName] = useState('');
  const [suffix, setSuffix] = useState('');

  return (
    <ImageBackground
      source={require('../assets/images/splash.brand.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <View style={styles.overlay} />
      <YStack flex={1} padding="$5" gap="$4">
        <H2>Identity</H2>
        <Paragraph opacity={0.85}>
          Start here. Claim a name and reserve a vanity wallet. Pay in SOL or SKR.
        </Paragraph>

        <Card padded elevate>
          <YStack gap="$3">
            <Paragraph fontWeight="700">Vanity wallet (4–6 character suffix)</Paragraph>
            <Paragraph opacity={0.8}>
              Choose a suffix (letters/numbers). We generate a wallet that ends with it.
            </Paragraph>
            <Input
              value={suffix}
              onChangeText={setSuffix}
              placeholder="ABCD"
              autoCapitalize="characters"
              maxLength={6}
            />
            <Button disabled>Check price & ETA (wiring next)</Button>
          </YStack>
        </Card>

        <Card padded elevate>
          <YStack gap="$3">
            <Paragraph fontWeight="700">Name service</Paragraph>
            <Paragraph opacity={0.8}>
              Register: .sol, .skr, .seeker, .seismic
            </Paragraph>
            <XStack gap="$3" flexWrap="wrap" alignItems="center">
              <Input
                width={220}
                value={name}
                onChangeText={setName}
                placeholder="yourname"
                autoCapitalize="none"
              />
              <Select value={tld} onValueChange={(v) => setTld(v as any)}>
                <Select.Trigger width={160}>
                  <Select.Value placeholder="TLD" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item index={0} value="sol"><Select.ItemText>.sol</Select.ItemText></Select.Item>
                  <Select.Item index={1} value="skr"><Select.ItemText>.skr</Select.ItemText></Select.Item>
                  <Select.Item index={2} value="seeker"><Select.ItemText>.seeker</Select.ItemText></Select.Item>
                  <Select.Item index={3} value="seismic"><Select.ItemText>.seismic</Select.ItemText></Select.Item>
                </Select.Content>
              </Select>
            </XStack>
            <Paragraph opacity={0.75}>Preview: {name ? `${name}.${tld}` : `—.${tld}`}</Paragraph>
            <Button disabled>Check availability (wiring next)</Button>
          </YStack>
        </Card>

        <Card padded elevate>
          <YStack gap="$2">
            <Paragraph fontWeight="700">Continue to DevKit</Paragraph>
            <Paragraph opacity={0.8}>
              Next: submit your project and receive the migration deliverables.
            </Paragraph>
            <Button theme="active" onPress={() => router.push('/devkit')}>Continue</Button>
            <Button chromeless onPress={() => router.push('/devkit')}>Skip identity for now</Button>
          </YStack>
        </Card>
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
