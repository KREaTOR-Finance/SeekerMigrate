/**
 * SEEKER dAPP Services Types
 *
 * Type definitions for SeekerMigrate dAPP services on Solana Mobile.
 * These services are offered as part of the SKR (SEEKER) dAPP ecosystem.
 */

/**
 * Supported Seeker Name Service TLDs (Top Level Domains)
 */
export type SeekerNameTLD = '.skr' | '.Seeker' | '.Seismic';

/**
 * All available TLDs for the Name Service
 */
export const SEEKER_NAME_TLDS: SeekerNameTLD[] = ['.skr', '.Seeker', '.Seismic'];

/**
 * Name registration status
 */
export type NameRegistrationStatus =
  | 'available'
  | 'registered'
  | 'reserved'
  | 'invalid'
  | 'pending';

/**
 * Seeker Name record
 */
export interface SeekerName {
  /** The full name including TLD (e.g., "alice.skr") */
  fullName: string;
  /** The name without TLD */
  name: string;
  /** The TLD extension */
  tld: SeekerNameTLD;
  /** Owner's Solana public key (base58) */
  owner: string;
  /** Registration timestamp */
  registeredAt: number;
  /** Expiration timestamp (0 for permanent) */
  expiresAt: number;
  /** Associated wallet address for resolution */
  resolvedAddress: string;
  /** Optional metadata */
  metadata?: SeekerNameMetadata;
}

/**
 * Optional metadata for Seeker Names
 */
export interface SeekerNameMetadata {
  /** Display avatar URL */
  avatar?: string;
  /** Bio/description */
  bio?: string;
  /** Website URL */
  website?: string;
  /** Twitter/X handle */
  twitter?: string;
  /** Discord username */
  discord?: string;
  /** Custom JSON data */
  customData?: Record<string, string>;
}

/**
 * Name Service lookup result
 */
export interface NameLookupResult {
  /** Whether the name exists */
  exists: boolean;
  /** The name record if found */
  record?: SeekerName;
  /** Current registration status */
  status: NameRegistrationStatus;
}

/**
 * Name registration request
 */
export interface NameRegistrationRequest {
  /** Desired name (without TLD) */
  name: string;
  /** Selected TLD */
  tld: SeekerNameTLD;
  /** Owner's public key */
  owner: string;
  /** Duration in years (0 for permanent if available) */
  durationYears: number;
  /** Optional initial metadata */
  metadata?: SeekerNameMetadata;
}

/**
 * Name registration result
 */
export interface NameRegistrationResult {
  /** Whether registration was successful */
  success: boolean;
  /** The registered name record */
  record?: SeekerName;
  /** Transaction signature if on-chain */
  transactionSignature?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================
// Vanity Wallet Generator Types
// ============================================

/**
 * Vanity wallet generation mode
 */
export type VanityMode = 'prefix' | 'suffix';

/**
 * Maximum allowed characters for vanity pattern
 */
export const VANITY_MAX_CHARS = 6;

/**
 * Valid Base58 characters for Solana addresses
 * (excludes 0, O, I, l to avoid confusion)
 */
export const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Vanity wallet generation request
 */
export interface VanityWalletRequest {
  /** The desired pattern (letters/numbers) */
  pattern: string;
  /** Whether to match prefix or suffix (not both) */
  mode: VanityMode;
  /** Case sensitive matching */
  caseSensitive: boolean;
  /** Maximum attempts before giving up (0 = unlimited) */
  maxAttempts?: number;
  /** Callback for progress updates */
  onProgress?: (progress: VanityProgress) => void;
}

/**
 * Progress update during vanity generation
 */
export interface VanityProgress {
  /** Number of keypairs generated so far */
  attempts: number;
  /** Estimated attempts remaining (based on probability) */
  estimatedRemaining: number;
  /** Current generation rate (keys per second) */
  keysPerSecond: number;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Best partial match found so far */
  bestMatch?: {
    address: string;
    matchedChars: number;
  };
}

/**
 * Vanity wallet generation result
 */
export interface VanityWalletResult {
  /** Whether generation was successful */
  success: boolean;
  /** The generated keypair (if successful) */
  keypair?: {
    /** Public key (base58 address) */
    publicKey: string;
    /** Secret key (base58 encoded) */
    secretKey: string;
    /** Secret key as Uint8Array for Solana SDK */
    secretKeyBytes: number[];
  };
  /** Number of attempts made */
  attempts: number;
  /** Time taken in milliseconds */
  elapsedMs: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Vanity pattern validation result
 */
export interface VanityPatternValidation {
  /** Whether the pattern is valid */
  valid: boolean;
  /** Validation error message if invalid */
  error?: string;
  /** Estimated number of attempts needed */
  estimatedAttempts: number;
  /** Estimated time at 1000 keys/second */
  estimatedTimeSeconds: number;
  /** Difficulty rating */
  difficulty: 'easy' | 'medium' | 'hard' | 'very_hard' | 'extreme';
}

// ============================================
// dAPP Service Configuration
// ============================================

/**
 * SEEKER dAPP service identifiers
 */
export type SeekerServiceId =
  | 'name-service'
  | 'vanity-wallet'
  | 'auth-bridge';

/**
 * Service status
 */
export type ServiceStatus = 'active' | 'maintenance' | 'disabled';

/**
 * SEEKER dAPP service descriptor
 */
export interface SeekerService {
  /** Unique service identifier */
  id: SeekerServiceId;
  /** Display name */
  name: string;
  /** Service description */
  description: string;
  /** Current status */
  status: ServiceStatus;
  /** Whether service works offline/locally */
  offlineCapable: boolean;
  /** Solana cluster requirement */
  requiredCluster?: 'mainnet-beta' | 'devnet' | 'testnet' | 'any';
}

/**
 * All available SEEKER dAPP services
 */
export const SEEKER_SERVICES: SeekerService[] = [
  {
    id: 'name-service',
    name: 'Seeker Name Service',
    description: 'Register .skr, .Seeker, and .Seismic names for your wallet',
    status: 'active',
    offlineCapable: false,
    requiredCluster: 'mainnet-beta',
  },
  {
    id: 'vanity-wallet',
    name: 'Vanity Wallet Generator',
    description: 'Generate custom wallet addresses with your preferred prefix or suffix',
    status: 'active',
    offlineCapable: true, // Works locally on device
    requiredCluster: 'any',
  },
  {
    id: 'auth-bridge',
    name: 'Auth Bridge Migration',
    description: 'Migrate from Firebase authentication to Solana wallet auth',
    status: 'active',
    offlineCapable: true,
    requiredCluster: 'any',
  },
];
