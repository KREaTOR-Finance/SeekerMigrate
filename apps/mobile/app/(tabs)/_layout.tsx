import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Start' }} />
      <Tabs.Screen name="devkit" options={{ title: 'DevKit' }} />
      <Tabs.Screen name="identity" options={{ title: 'Identity' }} />
      <Tabs.Screen name="unlock" options={{ title: 'Pay' }} />
    </Tabs>
  );
}
