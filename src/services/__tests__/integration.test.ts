/**
 * SEEKER dAPP Services - Integration Test Suite
 *
 * Tests the complete integration of all services including:
 * - Service registry
 * - Cross-service functionality
 * - Export validation
 * - Component generation
 */

import {
  SeekerNameService,
  VanityWalletGenerator,
  seekerNameService,
  vanityWalletGenerator,
  getAvailableServices,
  getServiceById,
  getOfflineServices,
  SEEKER_DAPP_INFO,
  SEEKER_SERVICES,
  SEEKER_NAME_TLDS,
  BASE58_ALPHABET,
  VANITY_MAX_CHARS,
} from '../index.js';

import {
  generateServiceComponents,
  SERVICE_SCREENS,
} from '../components/index.js';

// Test logger
const log = {
  section: (name: string) => console.log(`\n${'='.repeat(60)}\n  ${name}\n${'='.repeat(60)}`),
  test: (name: string) => console.log(`\n  TEST: ${name}`),
  pass: (msg: string) => console.log(`    ✅ PASS: ${msg}`),
  fail: (msg: string, error?: any) => {
    console.log(`    ❌ FAIL: ${msg}`);
    if (error) console.log(`       Error: ${error}`);
  },
  info: (msg: string) => console.log(`    ℹ️  ${msg}`),
  result: (label: string, value: any) => console.log(`    📋 ${label}: ${JSON.stringify(value)}`),
};

describe('SEEKER dAPP Services Integration', () => {
  beforeAll(() => {
    log.section('INTEGRATION TEST SUITE');
    console.log('  Testing complete SEEKER dAPP service integration');
  });

  // ============================================
  // Export Validation Tests
  // ============================================
  describe('Module Exports', () => {
    beforeAll(() => log.section('MODULE EXPORT VALIDATION'));

    test('should export all service classes', () => {
      log.test('Service class exports');

      expect(SeekerNameService).toBeDefined();
      log.pass('SeekerNameService exported');

      expect(VanityWalletGenerator).toBeDefined();
      log.pass('VanityWalletGenerator exported');
    });

    test('should export singleton instances', () => {
      log.test('Singleton instance exports');

      expect(seekerNameService).toBeInstanceOf(SeekerNameService);
      log.pass('seekerNameService singleton exported');

      expect(vanityWalletGenerator).toBeInstanceOf(VanityWalletGenerator);
      log.pass('vanityWalletGenerator singleton exported');
    });

    test('should export service registry functions', () => {
      log.test('Service registry function exports');

      expect(typeof getAvailableServices).toBe('function');
      log.pass('getAvailableServices exported');

      expect(typeof getServiceById).toBe('function');
      log.pass('getServiceById exported');

      expect(typeof getOfflineServices).toBe('function');
      log.pass('getOfflineServices exported');
    });

    test('should export constants', () => {
      log.test('Constant exports');

      expect(SEEKER_DAPP_INFO).toBeDefined();
      log.pass('SEEKER_DAPP_INFO exported');
      log.result('dAPP name', SEEKER_DAPP_INFO.name);

      expect(SEEKER_SERVICES).toBeDefined();
      log.pass('SEEKER_SERVICES exported');
      log.result('Services count', SEEKER_SERVICES.length);

      expect(SEEKER_NAME_TLDS).toBeDefined();
      log.pass('SEEKER_NAME_TLDS exported');
      log.result('TLDs', SEEKER_NAME_TLDS);

      expect(BASE58_ALPHABET).toBeDefined();
      log.pass('BASE58_ALPHABET exported');
      log.result('Alphabet length', BASE58_ALPHABET.length);

      expect(VANITY_MAX_CHARS).toBeDefined();
      log.pass('VANITY_MAX_CHARS exported');
      log.result('Max chars', VANITY_MAX_CHARS);
    });
  });

  // ============================================
  // Service Registry Tests
  // ============================================
  describe('Service Registry', () => {
    beforeAll(() => log.section('SERVICE REGISTRY TESTS'));

    test('should list all available services', () => {
      log.test('Get all available services');

      const services = getAvailableServices();

      log.result('Services found', services.length);

      for (const service of services) {
        log.info(`${service.id}: ${service.name} (${service.status})`);
      }

      expect(services.length).toBeGreaterThanOrEqual(3);
      log.pass('All services listed');
    });

    test('should get service by ID', () => {
      log.test('Get service by ID');

      const serviceIds = ['name-service', 'vanity-wallet', 'auth-bridge'];

      for (const id of serviceIds) {
        const service = getServiceById(id as any);

        if (service) {
          log.pass(`Found ${id}: ${service.name}`);
        } else {
          log.fail(`Service ${id} not found`);
        }

        expect(service).toBeDefined();
        expect(service?.id).toBe(id);
      }
    });

    test('should return undefined for unknown service ID', () => {
      log.test('Unknown service ID handling');

      const service = getServiceById('unknown-service' as any);

      if (service === undefined) {
        log.pass('Unknown service returns undefined');
      } else {
        log.fail('Should return undefined for unknown service');
      }

      expect(service).toBeUndefined();
    });

    test('should list offline-capable services', () => {
      log.test('Get offline-capable services');

      const offlineServices = getOfflineServices();

      log.result('Offline services', offlineServices.length);

      for (const service of offlineServices) {
        log.info(`${service.id}: ${service.name} (offline: ${service.offlineCapable})`);
        expect(service.offlineCapable).toBe(true);
      }

      // Vanity wallet should be offline-capable
      const hasVanity = offlineServices.some(s => s.id === 'vanity-wallet');
      if (hasVanity) {
        log.pass('Vanity wallet is offline-capable');
      }

      expect(hasVanity).toBe(true);
    });
  });

  // ============================================
  // dAPP Info Tests
  // ============================================
  describe('dAPP Information', () => {
    beforeAll(() => log.section('DAPP INFORMATION TESTS'));

    test('should have complete dAPP info', () => {
      log.test('dAPP info completeness');

      const requiredFields = ['name', 'version', 'description', 'platform', 'token', 'services', 'features'];

      for (const field of requiredFields) {
        if (field in SEEKER_DAPP_INFO) {
          log.pass(`Field "${field}" present`);
        } else {
          log.fail(`Field "${field}" missing`);
        }
        expect(SEEKER_DAPP_INFO).toHaveProperty(field);
      }

      log.result('dAPP name', SEEKER_DAPP_INFO.name);
      log.result('Platform', SEEKER_DAPP_INFO.platform);
      log.result('Token', SEEKER_DAPP_INFO.token);
    });

    test('should have correct service count', () => {
      log.test('Service count validation');

      const infoServices = SEEKER_DAPP_INFO.services;
      const registryServices = SEEKER_SERVICES;

      log.result('Info services', infoServices.length);
      log.result('Registry services', registryServices.length);

      if (infoServices.length === registryServices.length) {
        log.pass('Service counts match');
      } else {
        log.fail('Service counts do not match');
      }

      expect(infoServices.length).toBe(registryServices.length);
    });
  });

  // ============================================
  // Component Generation Tests
  // ============================================
  describe('Component Generation', () => {
    beforeAll(() => log.section('COMPONENT GENERATION TESTS'));

    test('should generate all service components', () => {
      log.test('Component template generation');

      const components = generateServiceComponents();
      const componentNames = Object.keys(components);

      log.result('Components generated', componentNames.length);

      for (const name of componentNames) {
        const content = components[name];
        const hasContent = content && content.length > 100;

        if (hasContent) {
          log.pass(`${name} generated (${content.length} chars)`);
        } else {
          log.fail(`${name} missing or too short`);
        }

        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(100);
      }
    });

    test('should have service screen metadata', () => {
      log.test('Service screen metadata');

      log.result('Screen configs', SERVICE_SCREENS.length);

      for (const screen of SERVICE_SCREENS) {
        const hasRequiredFields =
          screen.id &&
          screen.name &&
          screen.component &&
          screen.icon &&
          screen.description;

        if (hasRequiredFields) {
          log.pass(`${screen.name}: ${screen.component}`);
        } else {
          log.fail(`${screen.id} missing required fields`);
        }

        expect(screen.id).toBeTruthy();
        expect(screen.name).toBeTruthy();
        expect(screen.component).toBeTruthy();
      }
    });

    test('should include React Native imports in templates', () => {
      log.test('Template content validation');

      const components = generateServiceComponents();

      for (const [name, content] of Object.entries(components)) {
        const hasReactImport = content.includes("import React");
        const hasRNImport = content.includes("react-native");
        const hasStyles = content.includes("StyleSheet");

        if (hasReactImport && hasRNImport && hasStyles) {
          log.pass(`${name} has valid React Native structure`);
        } else {
          log.fail(`${name} missing required imports`);
        }

        expect(hasReactImport).toBe(true);
        expect(hasRNImport).toBe(true);
        expect(hasStyles).toBe(true);
      }
    });
  });

  // ============================================
  // Cross-Service Integration Tests
  // ============================================
  describe('Cross-Service Integration', () => {
    beforeAll(() => log.section('CROSS-SERVICE INTEGRATION TESTS'));

    test('should use name service with vanity wallet', async () => {
      log.test('Name registration with vanity wallet');

      // Generate a vanity wallet
      const walletResult = await vanityWalletGenerator.generate({
        pattern: 'A',
        mode: 'prefix',
        caseSensitive: true,
        maxAttempts: 5000,
      });

      if (walletResult.success && walletResult.keypair) {
        log.pass('Generated vanity wallet');
        log.info(`Address: ${walletResult.keypair.publicKey.slice(0, 16)}...`);

        // Register a name for this wallet
        const nameResult = await seekerNameService.register({
          name: 'vanitytest',
          tld: '.skr',
          owner: walletResult.keypair.publicKey,
          durationYears: 1,
        });

        if (nameResult.success && nameResult.record) {
          log.pass('Registered name for vanity wallet');
          log.info(`Name: ${nameResult.record.fullName}`);
          log.info(`Owner: ${nameResult.record.owner.slice(0, 16)}...`);

          // Verify resolution
          const resolved = await seekerNameService.resolve(nameResult.record.fullName);
          if (resolved === walletResult.keypair.publicKey) {
            log.pass('Name resolves to vanity wallet address');
          }
        }
      } else {
        log.info('Vanity generation did not find match in allotted attempts');
      }
    }, 30000);

    test('should validate patterns with correct alphabet', () => {
      log.test('Alphabet consistency');

      // All Base58 chars should be valid for vanity
      let allValid = true;
      for (const char of BASE58_ALPHABET) {
        const result = vanityWalletGenerator.validatePattern(char, 'prefix');
        if (!result.valid) {
          allValid = false;
          log.fail(`Character '${char}' should be valid`);
        }
      }

      if (allValid) {
        log.pass('All Base58 characters valid for vanity patterns');
      }

      expect(allValid).toBe(true);
    });

    test('should handle service info consistently', () => {
      log.test('Service info consistency');

      const nameInfo = seekerNameService.getServiceInfo();
      const vanityInfo = vanityWalletGenerator.getServiceInfo();

      // Both should have version
      if (nameInfo.version && vanityInfo.version) {
        log.pass('Both services have version info');
        log.result('Name Service version', nameInfo.version);
        log.result('Vanity Generator version', vanityInfo.version);
      }

      // Both should have features
      if (nameInfo.features.length > 0 && vanityInfo.features.length > 0) {
        log.pass('Both services have feature lists');
      }

      expect(nameInfo.version).toBeTruthy();
      expect(vanityInfo.version).toBeTruthy();
    });
  });

  afterAll(() => {
    log.section('INTEGRATION TESTS COMPLETE');
    console.log('  All integration tests executed\n');
  });
});
