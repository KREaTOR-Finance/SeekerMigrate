import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { WalletProvider } from '../src/wallet/WalletContext';
import { HeaderConnectButton } from '../src/wallet/HeaderConnectButton';
import { OnboardingProvider } from '../src/onboarding/OnboardingContext';

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <WalletProvider>
        <OnboardingProvider>
          <Stack
            initialRouteName="index"
            screenOptions={{
              headerShown: true,
              headerTransparent: true,
              headerTitle: '',
              headerRight: () => <HeaderConnectButton />,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="disclosure" options={{ headerShown: false }} />
            <Stack.Screen name="tutorial" options={{ headerTitle: 'Quick setup' }} />
            <Stack.Screen name="wallet" options={{ headerTitle: 'Wallet setup' }} />
            <Stack.Screen name="identity" options={{ headerTitle: 'Identity setup' }} />
            <Stack.Screen name="migrate" options={{ headerTitle: 'Migration plan' }} />
            <Stack.Screen name="devkit" options={{ headerTitle: 'Migration tools' }} />
          </Stack>
        </OnboardingProvider>
      </WalletProvider>
    </TamaguiProvider>
  );
}
