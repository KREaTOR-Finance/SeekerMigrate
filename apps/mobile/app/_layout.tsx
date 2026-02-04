import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { WalletProvider } from '../src/wallet/WalletContext';
import { HeaderConnectButton } from '../src/wallet/HeaderConnectButton';

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <WalletProvider>
        <Stack
          initialRouteName="disclosure"
          screenOptions={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: '',
            headerRight: () => <HeaderConnectButton />,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="disclosure" options={{ headerShown: false }} />
          <Stack.Screen name="wallet" options={{ headerTitle: 'Wallet' }} />
          <Stack.Screen name="identity" options={{ headerTitle: 'Identity' }} />
          <Stack.Screen name="devkit" options={{ headerTitle: 'DevKit' }} />
          <Stack.Screen name="profile" options={{ headerTitle: 'Profile' }} />
          {/* Legacy tabs kept for now; we’ll remove once this flow is confirmed. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </WalletProvider>
    </TamaguiProvider>
  );
}
