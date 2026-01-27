/**
 * SEEKER dAPP Services
 *
 * Core services for the SeekerMigrate dAPP on Solana Mobile.
 * These services are offered as part of the SKR (SEEKER) ecosystem.
 *
 * Available Services:
 * 1. Name Service - Register .skr, .Seeker, .Seismic domain names
 * 2. Vanity Wallet Generator - Create custom wallet addresses locally
 * 3. Auth Bridge - Migrate from Firebase to Solana wallet auth
 */

// Export all types
export * from './types.js';

// Export Name Service
export { SeekerNameService, seekerNameService } from './name-service/index.js';

// Export Vanity Wallet Generator
export { VanityWalletGenerator, vanityWalletGenerator } from './vanity-wallet/index.js';

// Service registry for dAPP
import { SEEKER_SERVICES, SeekerService, SeekerServiceId } from './types.js';

/**
 * Get all available SEEKER dAPP services
 */
export function getAvailableServices(): SeekerService[] {
  return SEEKER_SERVICES;
}

/**
 * Get a specific service by ID
 */
export function getServiceById(id: SeekerServiceId): SeekerService | undefined {
  return SEEKER_SERVICES.find(service => service.id === id);
}

/**
 * Get all offline-capable services (work without network)
 */
export function getOfflineServices(): SeekerService[] {
  return SEEKER_SERVICES.filter(service => service.offlineCapable);
}

/**
 * SEEKER dAPP information
 */
export const SEEKER_DAPP_INFO = {
  name: 'SeekerMigrate',
  version: '1.0.0',
  description: 'SEEKER dAPP services for Solana Mobile',
  platform: 'Solana Mobile (Seeker)',
  token: 'SKR',
  services: SEEKER_SERVICES,
  features: [
    'Seeker Name Service (.skr, .Seeker, .Seismic)',
    'Vanity Wallet Generator (local, secure)',
    'Firebase to Solana Auth Migration',
  ],
  supportedClusters: ['mainnet-beta', 'devnet', 'testnet'],
};
