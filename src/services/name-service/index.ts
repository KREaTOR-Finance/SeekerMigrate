/**
 * Seeker Name Service
 *
 * A decentralized name service for the SEEKER dAPP ecosystem on Solana Mobile.
 * Supports three TLDs: .skr, .Seeker, .Seismic
 *
 * This service allows users to:
 * - Register human-readable names for their Solana wallets
 * - Resolve names to wallet addresses
 * - Manage name metadata (avatar, bio, social links)
 */

import {
  SeekerName,
  SeekerNameTLD,
  SeekerNameMetadata,
  NameLookupResult,
  NameRegistrationRequest,
  NameRegistrationResult,
  SEEKER_NAME_TLDS,
} from '../types.js';

/**
 * Name validation rules
 */
const NAME_RULES = {
  minLength: 3,
  maxLength: 32,
  // Alphanumeric, hyphens, underscores (no spaces, no special chars)
  validPattern: /^[a-zA-Z0-9_-]+$/,
  // Cannot start or end with hyphen/underscore
  invalidStartEnd: /^[-_]|[-_]$/,
  // Reserved names that cannot be registered
  reserved: [
    'admin', 'administrator', 'seeker', 'solana', 'sol', 'wallet',
    'official', 'support', 'help', 'system', 'root', 'moderator',
    'mod', 'staff', 'team', 'dev', 'developer', 'api', 'www',
    'mail', 'email', 'ftp', 'ssh', 'test', 'demo', 'example',
  ],
};

/**
 * Seeker Name Service class
 *
 * Provides name registration, lookup, and management functionality
 * for the SEEKER dAPP on Solana Mobile.
 */
export class SeekerNameService {
  private cluster: 'mainnet-beta' | 'devnet' | 'testnet';
  private programId: string;

  // In-memory cache for demo/local testing
  // In production, this would query the Solana blockchain
  private localRegistry: Map<string, SeekerName> = new Map();

  constructor(options?: {
    cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
    programId?: string;
  }) {
    this.cluster = options?.cluster ?? 'devnet';
    // Placeholder program ID - would be actual deployed program address
    this.programId = options?.programId ?? 'SKRnamesXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  }

  /**
   * Validate a name for registration
   */
  validateName(name: string, tld: SeekerNameTLD): { valid: boolean; error?: string } {
    // Check TLD is supported
    if (!SEEKER_NAME_TLDS.includes(tld)) {
      return { valid: false, error: `Unsupported TLD: ${tld}. Supported: ${SEEKER_NAME_TLDS.join(', ')}` };
    }

    // Check length
    if (name.length < NAME_RULES.minLength) {
      return { valid: false, error: `Name must be at least ${NAME_RULES.minLength} characters` };
    }
    if (name.length > NAME_RULES.maxLength) {
      return { valid: false, error: `Name cannot exceed ${NAME_RULES.maxLength} characters` };
    }

    // Check pattern
    if (!NAME_RULES.validPattern.test(name)) {
      return { valid: false, error: 'Name can only contain letters, numbers, hyphens, and underscores' };
    }

    // Check start/end
    if (NAME_RULES.invalidStartEnd.test(name)) {
      return { valid: false, error: 'Name cannot start or end with a hyphen or underscore' };
    }

    // Check reserved
    if (NAME_RULES.reserved.includes(name.toLowerCase())) {
      return { valid: false, error: 'This name is reserved and cannot be registered' };
    }

    return { valid: true };
  }

  /**
   * Build full name from name and TLD
   */
  buildFullName(name: string, tld: SeekerNameTLD): string {
    return `${name}${tld}`;
  }

  /**
   * Parse a full name into components
   */
  parseName(fullName: string): { name: string; tld: SeekerNameTLD } | null {
    for (const tld of SEEKER_NAME_TLDS) {
      if (fullName.endsWith(tld)) {
        const name = fullName.slice(0, -tld.length);
        return { name, tld };
      }
    }
    return null;
  }

  /**
   * Check if a name is available for registration
   */
  async checkAvailability(name: string, tld: SeekerNameTLD): Promise<NameLookupResult> {
    const validation = this.validateName(name, tld);
    if (!validation.valid) {
      return {
        exists: false,
        status: 'invalid',
      };
    }

    const fullName = this.buildFullName(name, tld);

    // Check local registry (in production, would query blockchain)
    if (this.localRegistry.has(fullName.toLowerCase())) {
      const record = this.localRegistry.get(fullName.toLowerCase());
      return {
        exists: true,
        record,
        status: 'registered',
      };
    }

    return {
      exists: false,
      status: 'available',
    };
  }

  /**
   * Lookup a name and return its record
   */
  async lookup(fullName: string): Promise<NameLookupResult> {
    const parsed = this.parseName(fullName);
    if (!parsed) {
      return { exists: false, status: 'invalid' };
    }

    return this.checkAvailability(parsed.name, parsed.tld);
  }

  /**
   * Resolve a name to a wallet address
   */
  async resolve(fullName: string): Promise<string | null> {
    const result = await this.lookup(fullName);
    if (result.exists && result.record) {
      return result.record.resolvedAddress;
    }
    return null;
  }

  /**
   * Reverse lookup - find names owned by an address
   */
  async reverseResolve(address: string): Promise<SeekerName[]> {
    const names: SeekerName[] = [];
    for (const record of this.localRegistry.values()) {
      if (record.owner === address || record.resolvedAddress === address) {
        names.push(record);
      }
    }
    return names;
  }

  /**
   * Register a new name
   *
   * In production, this would create a Solana transaction
   * that the user signs with their wallet.
   */
  async register(request: NameRegistrationRequest): Promise<NameRegistrationResult> {
    const { name, tld, owner, durationYears, metadata } = request;

    // Validate name
    const validation = this.validateName(name, tld);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check availability
    const availability = await this.checkAvailability(name, tld);
    if (availability.status !== 'available') {
      return { success: false, error: `Name is not available: ${availability.status}` };
    }

    const fullName = this.buildFullName(name, tld);
    const now = Date.now();

    // Create name record
    const record: SeekerName = {
      fullName,
      name,
      tld,
      owner,
      registeredAt: now,
      expiresAt: durationYears === 0 ? 0 : now + (durationYears * 365 * 24 * 60 * 60 * 1000),
      resolvedAddress: owner, // Default to owner's address
      metadata,
    };

    // Store in local registry (in production, this would be a blockchain transaction)
    this.localRegistry.set(fullName.toLowerCase(), record);

    // Generate a mock transaction signature
    const mockTxSig = `mock_${Buffer.from(fullName).toString('base64').slice(0, 32)}`;

    return {
      success: true,
      record,
      transactionSignature: mockTxSig,
    };
  }

  /**
   * Update the resolved address for a name
   */
  async updateResolvedAddress(
    fullName: string,
    newAddress: string,
    _ownerSignature: string
  ): Promise<{ success: boolean; error?: string }> {
    const lookup = await this.lookup(fullName);
    if (!lookup.exists || !lookup.record) {
      return { success: false, error: 'Name not found' };
    }

    // In production, verify ownerSignature matches the owner
    lookup.record.resolvedAddress = newAddress;
    this.localRegistry.set(fullName.toLowerCase(), lookup.record);

    return { success: true };
  }

  /**
   * Update metadata for a name
   */
  async updateMetadata(
    fullName: string,
    metadata: Partial<SeekerNameMetadata>,
    _ownerSignature: string
  ): Promise<{ success: boolean; error?: string }> {
    const lookup = await this.lookup(fullName);
    if (!lookup.exists || !lookup.record) {
      return { success: false, error: 'Name not found' };
    }

    // Merge metadata
    lookup.record.metadata = {
      ...lookup.record.metadata,
      ...metadata,
    };
    this.localRegistry.set(fullName.toLowerCase(), lookup.record);

    return { success: true };
  }

  /**
   * Transfer name ownership to a new owner
   */
  async transfer(
    fullName: string,
    newOwner: string,
    _ownerSignature: string
  ): Promise<{ success: boolean; error?: string; transactionSignature?: string }> {
    const lookup = await this.lookup(fullName);
    if (!lookup.exists || !lookup.record) {
      return { success: false, error: 'Name not found' };
    }

    // In production, verify signature and create transfer transaction
    lookup.record.owner = newOwner;
    lookup.record.resolvedAddress = newOwner; // Update resolved address too
    this.localRegistry.set(fullName.toLowerCase(), lookup.record);

    const mockTxSig = `transfer_${Buffer.from(fullName + newOwner).toString('base64').slice(0, 32)}`;

    return { success: true, transactionSignature: mockTxSig };
  }

  /**
   * Get all names for a specific TLD
   */
  async getNamesByTLD(tld: SeekerNameTLD): Promise<SeekerName[]> {
    const names: SeekerName[] = [];
    for (const record of this.localRegistry.values()) {
      if (record.tld === tld) {
        names.push(record);
      }
    }
    return names;
  }

  /**
   * Get registration price estimate
   */
  getRegistrationPrice(name: string, tld: SeekerNameTLD, durationYears: number): {
    priceSOL: number;
    priceUSD: number;
    breakdown: { base: number; length: number; duration: number };
  } {
    // Pricing model:
    // - Base price varies by TLD
    // - Shorter names cost more (premium)
    // - Price per year

    const basePrices: Record<SeekerNameTLD, number> = {
      '.skr': 0.05,      // Most affordable
      '.Seeker': 0.10,   // Mid-tier
      '.Seismic': 0.15,  // Premium
    };

    const lengthMultiplier = name.length <= 3 ? 10 : // 3 chars = 10x
                             name.length <= 4 ? 5 :  // 4 chars = 5x
                             name.length <= 5 ? 2 :  // 5 chars = 2x
                             1;                       // 6+ chars = 1x

    const basePrice = basePrices[tld] ?? 0.10;
    const lengthPrice = basePrice * lengthMultiplier;
    const totalPrice = lengthPrice * durationYears;

    // Estimate USD (would use oracle in production)
    const solPriceUSD = 150; // Placeholder

    return {
      priceSOL: totalPrice,
      priceUSD: totalPrice * solPriceUSD,
      breakdown: {
        base: basePrice,
        length: lengthMultiplier,
        duration: durationYears,
      },
    };
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      name: 'Seeker Name Service',
      version: '1.0.0',
      supportedTLDs: SEEKER_NAME_TLDS,
      cluster: this.cluster,
      programId: this.programId,
      features: [
        'Name registration (.skr, .Seeker, .Seismic)',
        'Name-to-address resolution',
        'Reverse lookup (address to names)',
        'Profile metadata (avatar, bio, social)',
        'Name transfers',
        'Expiration management',
      ],
    };
  }
}

// Export singleton instance for convenience
export const seekerNameService = new SeekerNameService();

// Re-export types
export * from '../types.js';
