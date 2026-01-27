/**
 * SEEKER dAPP Component Templates
 *
 * React Native component templates for the SEEKER dAPP services.
 * These are generated as part of the SeekerMigrate dAPP for Solana Mobile.
 */

import { NameServiceScreenTemplate } from './NameServiceScreen.js';
import { VanityWalletScreenTemplate } from './VanityWalletScreen.js';

export { NameServiceScreenTemplate, VanityWalletScreenTemplate };

/**
 * Generate all dAPP service component templates
 */
export function generateServiceComponents(): Record<string, string> {
  return {
    'NameServiceScreen.tsx': NameServiceScreenTemplate,
    'VanityWalletScreen.tsx': VanityWalletScreenTemplate,
  };
}

/**
 * Service screen metadata for navigation
 */
export const SERVICE_SCREENS = [
  {
    id: 'name-service',
    name: 'Name Service',
    component: 'NameServiceScreen',
    icon: 'tag',
    description: 'Register .skr, .Seeker, .Seismic names',
  },
  {
    id: 'vanity-wallet',
    name: 'Vanity Wallet',
    component: 'VanityWalletScreen',
    icon: 'wallet',
    description: 'Generate custom wallet addresses',
  },
];
