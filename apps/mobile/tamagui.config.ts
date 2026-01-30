import { createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';

// Minimal config wrapper; we can tune tokens/themes to match Phantom/Jupiter as we iterate.
export default createTamagui(config);

export type AppTamaguiConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}
