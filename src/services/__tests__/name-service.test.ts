/**
 * Seeker Name Service - Comprehensive Test Suite
 *
 * Tests all functionality of the Name Service including:
 * - Name validation
 * - TLD support (.skr, .Seeker, .Seismic)
 * - Availability checking
 * - Registration
 * - Lookup and resolution
 * - Pricing calculations
 * - Edge cases and error handling
 */

import { SeekerNameService } from '../name-service/index.js';
import {
  SEEKER_NAME_TLDS,
  SeekerNameTLD,
} from '../types.js';

// Test logger for friendly output
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

describe('SeekerNameService', () => {
  let service: SeekerNameService;

  beforeAll(() => {
    log.section('SEEKER NAME SERVICE TEST SUITE');
    console.log('  Testing .skr, .Seeker, .Seismic name registration');
  });

  beforeEach(() => {
    service = new SeekerNameService({ cluster: 'devnet' });
  });

  // ============================================
  // Name Validation Tests
  // ============================================
  describe('Name Validation', () => {
    beforeAll(() => log.section('NAME VALIDATION TESTS'));

    test('should accept valid names', () => {
      log.test('Valid name acceptance');

      const validNames = ['alice', 'bob123', 'my-wallet', 'test_user', 'a1b2c3'];

      for (const name of validNames) {
        const result = service.validateName(name, '.skr');
        if (result.valid) {
          log.pass(`"${name}" is valid`);
        } else {
          log.fail(`"${name}" should be valid`, result.error);
        }
        expect(result.valid).toBe(true);
      }
    });

    test('should reject names that are too short', () => {
      log.test('Minimum length enforcement (3 chars)');

      const shortNames = ['a', 'ab'];

      for (const name of shortNames) {
        const result = service.validateName(name, '.skr');
        if (!result.valid && result.error?.includes('at least 3')) {
          log.pass(`"${name}" rejected - too short`);
        } else {
          log.fail(`"${name}" should be rejected for being too short`);
        }
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least 3');
      }
    });

    test('should reject names that are too long', () => {
      log.test('Maximum length enforcement (32 chars)');

      const longName = 'a'.repeat(33);
      const result = service.validateName(longName, '.skr');

      if (!result.valid && result.error?.includes('32')) {
        log.pass(`33-char name rejected`);
      } else {
        log.fail(`33-char name should be rejected`);
      }

      expect(result.valid).toBe(false);
      expect(result.error).toContain('32');
    });

    test('should reject names with invalid characters', () => {
      log.test('Invalid character rejection');

      const invalidNames = ['hello world', 'test@name', 'foo.bar', 'name#1', 'user!'];

      for (const name of invalidNames) {
        const result = service.validateName(name, '.skr');
        if (!result.valid) {
          log.pass(`"${name}" rejected - invalid chars`);
        } else {
          log.fail(`"${name}" should be rejected for invalid characters`);
        }
        expect(result.valid).toBe(false);
      }
    });

    test('should reject names starting or ending with hyphen/underscore', () => {
      log.test('Boundary character rules');

      const invalidBoundaryNames = ['-start', 'end-', '_start', 'end_'];

      for (const name of invalidBoundaryNames) {
        const result = service.validateName(name, '.skr');
        if (!result.valid) {
          log.pass(`"${name}" rejected - bad boundary`);
        } else {
          log.fail(`"${name}" should be rejected`);
        }
        expect(result.valid).toBe(false);
      }
    });

    test('should reject reserved names', () => {
      log.test('Reserved name protection');

      const reservedNames = ['admin', 'solana', 'seeker', 'support', 'official'];

      for (const name of reservedNames) {
        const result = service.validateName(name, '.skr');
        if (!result.valid && result.error?.includes('reserved')) {
          log.pass(`"${name}" rejected - reserved`);
        } else {
          log.fail(`"${name}" should be reserved`);
        }
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved');
      }
    });

    test('should support all TLDs', () => {
      log.test('TLD support verification');

      for (const tld of SEEKER_NAME_TLDS) {
        const result = service.validateName('testname', tld);
        if (result.valid) {
          log.pass(`TLD "${tld}" supported`);
        } else {
          log.fail(`TLD "${tld}" should be supported`);
        }
        expect(result.valid).toBe(true);
      }
    });

    test('should reject unsupported TLDs', () => {
      log.test('Unsupported TLD rejection');

      const invalidTLDs = ['.com', '.sol', '.xyz', '.invalid'];

      for (const tld of invalidTLDs) {
        const result = service.validateName('testname', tld as SeekerNameTLD);
        if (!result.valid) {
          log.pass(`TLD "${tld}" rejected`);
        } else {
          log.fail(`TLD "${tld}" should be rejected`);
        }
        expect(result.valid).toBe(false);
      }
    });
  });

  // ============================================
  // Name Building and Parsing Tests
  // ============================================
  describe('Name Building and Parsing', () => {
    beforeAll(() => log.section('NAME BUILDING & PARSING TESTS'));

    test('should build full names correctly', () => {
      log.test('Full name construction');

      const testCases = [
        { name: 'alice', tld: '.skr' as SeekerNameTLD, expected: 'alice.skr' },
        { name: 'bob', tld: '.Seeker' as SeekerNameTLD, expected: 'bob.Seeker' },
        { name: 'charlie', tld: '.Seismic' as SeekerNameTLD, expected: 'charlie.Seismic' },
      ];

      for (const { name, tld, expected } of testCases) {
        const result = service.buildFullName(name, tld);
        if (result === expected) {
          log.pass(`${name} + ${tld} = ${result}`);
        } else {
          log.fail(`Expected ${expected}, got ${result}`);
        }
        expect(result).toBe(expected);
      }
    });

    test('should parse full names correctly', () => {
      log.test('Full name parsing');

      const testCases = [
        { fullName: 'alice.skr', expectedName: 'alice', expectedTLD: '.skr' },
        { fullName: 'bob.Seeker', expectedName: 'bob', expectedTLD: '.Seeker' },
        { fullName: 'charlie.Seismic', expectedName: 'charlie', expectedTLD: '.Seismic' },
      ];

      for (const { fullName, expectedName, expectedTLD } of testCases) {
        const result = service.parseName(fullName);
        if (result && result.name === expectedName && result.tld === expectedTLD) {
          log.pass(`"${fullName}" → name: "${result.name}", tld: "${result.tld}"`);
        } else {
          log.fail(`Failed to parse "${fullName}"`);
        }
        expect(result).not.toBeNull();
        expect(result?.name).toBe(expectedName);
        expect(result?.tld).toBe(expectedTLD);
      }
    });

    test('should return null for unparseable names', () => {
      log.test('Invalid name parsing');

      const invalidNames = ['noextension', 'invalid.com', 'test.sol'];

      for (const name of invalidNames) {
        const result = service.parseName(name);
        if (result === null) {
          log.pass(`"${name}" correctly returned null`);
        } else {
          log.fail(`"${name}" should return null`);
        }
        expect(result).toBeNull();
      }
    });
  });

  // ============================================
  // Availability and Registration Tests
  // ============================================
  describe('Availability and Registration', () => {
    beforeAll(() => log.section('AVAILABILITY & REGISTRATION TESTS'));

    test('should report unregistered names as available', async () => {
      log.test('Availability check for new names');

      const result = await service.checkAvailability('newname123', '.skr');

      log.result('Status', result.status);
      if (result.status === 'available') {
        log.pass('Unregistered name shows as available');
      } else {
        log.fail(`Expected "available", got "${result.status}"`);
      }

      expect(result.status).toBe('available');
      expect(result.exists).toBe(false);
    });

    test('should register names successfully', async () => {
      log.test('Name registration flow');

      const testOwner = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const testName = 'myuniquename';

      const result = await service.register({
        name: testName,
        tld: '.skr',
        owner: testOwner,
        durationYears: 1,
      });

      log.result('Registration result', { success: result.success, fullName: result.record?.fullName });

      if (result.success && result.record) {
        log.pass(`Registered "${result.record.fullName}"`);
        log.info(`Owner: ${result.record.owner}`);
        log.info(`Tx: ${result.transactionSignature}`);
      } else {
        log.fail(`Registration failed: ${result.error}`);
      }

      expect(result.success).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record?.fullName).toBe(`${testName}.skr`);
      expect(result.record?.owner).toBe(testOwner);
    });

    test('should prevent duplicate registration', async () => {
      log.test('Duplicate registration prevention');

      const testOwner = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const testName = 'duplicatetest';

      // First registration
      await service.register({
        name: testName,
        tld: '.skr',
        owner: testOwner,
        durationYears: 1,
      });
      log.info('First registration completed');

      // Second registration attempt
      const result = await service.register({
        name: testName,
        tld: '.skr',
        owner: 'differentowner123',
        durationYears: 1,
      });

      if (!result.success) {
        log.pass('Duplicate registration prevented');
        log.info(`Error: ${result.error}`);
      } else {
        log.fail('Duplicate registration should fail');
      }

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    test('should lookup registered names', async () => {
      log.test('Name lookup');

      const testOwner = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const testName = 'lookuptest';

      // Register first
      await service.register({
        name: testName,
        tld: '.Seeker',
        owner: testOwner,
        durationYears: 1,
      });

      // Lookup
      const result = await service.lookup(`${testName}.Seeker`);

      log.result('Lookup result', { exists: result.exists, status: result.status });

      if (result.exists && result.record) {
        log.pass(`Found "${result.record.fullName}"`);
        log.info(`Owner: ${result.record.owner}`);
        log.info(`Resolves to: ${result.record.resolvedAddress}`);
      } else {
        log.fail('Lookup should find registered name');
      }

      expect(result.exists).toBe(true);
      expect(result.record?.fullName).toBe(`${testName}.Seeker`);
    });

    test('should resolve names to addresses', async () => {
      log.test('Name resolution');

      const testOwner = '9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const testName = 'resolvetest';

      await service.register({
        name: testName,
        tld: '.Seismic',
        owner: testOwner,
        durationYears: 1,
      });

      const address = await service.resolve(`${testName}.Seismic`);

      log.result('Resolved address', address);

      if (address === testOwner) {
        log.pass('Name resolved to correct address');
      } else {
        log.fail(`Expected ${testOwner}, got ${address}`);
      }

      expect(address).toBe(testOwner);
    });

    test('should return null for unregistered names', async () => {
      log.test('Resolution of unregistered names');

      const address = await service.resolve('nonexistent.skr');

      if (address === null) {
        log.pass('Unregistered name returns null');
      } else {
        log.fail(`Should return null, got ${address}`);
      }

      expect(address).toBeNull();
    });
  });

  // ============================================
  // Pricing Tests
  // ============================================
  describe('Pricing Calculations', () => {
    beforeAll(() => log.section('PRICING CALCULATION TESTS'));

    test('should calculate correct prices by TLD', () => {
      log.test('TLD-based pricing');

      const prices = {
        '.skr': 0.05,
        '.Seeker': 0.10,
        '.Seismic': 0.15,
      };

      for (const [tld, expectedBase] of Object.entries(prices)) {
        const result = service.getRegistrationPrice('longenoughname', tld as SeekerNameTLD, 1);

        log.result(`${tld} price`, `${result.priceSOL} SOL`);

        if (result.priceSOL === expectedBase) {
          log.pass(`${tld} base price correct`);
        } else {
          log.fail(`Expected ${expectedBase}, got ${result.priceSOL}`);
        }

        expect(result.priceSOL).toBe(expectedBase);
      }
    });

    test('should apply length-based premium pricing', () => {
      log.test('Length-based premium pricing');

      const testCases = [
        { name: 'abc', multiplier: 10, description: '3 chars = 10x' },
        { name: 'abcd', multiplier: 5, description: '4 chars = 5x' },
        { name: 'abcde', multiplier: 2, description: '5 chars = 2x' },
        { name: 'abcdef', multiplier: 1, description: '6+ chars = 1x' },
      ];

      const baseTLD: SeekerNameTLD = '.skr';
      const basePrice = 0.05;

      for (const { name, multiplier, description } of testCases) {
        const result = service.getRegistrationPrice(name, baseTLD, 1);
        const expected = basePrice * multiplier;

        log.result(description, `${result.priceSOL} SOL (expected: ${expected})`);

        if (result.priceSOL === expected) {
          log.pass(`${description} - correct`);
        } else {
          log.fail(`Expected ${expected}, got ${result.priceSOL}`);
        }

        expect(result.priceSOL).toBe(expected);
      }
    });

    test('should calculate multi-year pricing', () => {
      log.test('Multi-year duration pricing');

      const years = [1, 2, 5];
      const baseTLD: SeekerNameTLD = '.skr';
      const name = 'multiyear';

      const baseYearPrice = service.getRegistrationPrice(name, baseTLD, 1).priceSOL;

      for (const year of years) {
        const result = service.getRegistrationPrice(name, baseTLD, year);
        const expected = baseYearPrice * year;

        log.result(`${year} year(s)`, `${result.priceSOL} SOL`);

        if (result.priceSOL === expected) {
          log.pass(`${year}-year price correct`);
        } else {
          log.fail(`Expected ${expected}, got ${result.priceSOL}`);
        }

        expect(result.priceSOL).toBe(expected);
      }
    });
  });

  // ============================================
  // Service Info Tests
  // ============================================
  describe('Service Information', () => {
    beforeAll(() => log.section('SERVICE INFORMATION TESTS'));

    test('should return correct service info', () => {
      log.test('Service info retrieval');

      const info = service.getServiceInfo();

      log.result('Service name', info.name);
      log.result('Version', info.version);
      log.result('Supported TLDs', info.supportedTLDs);
      log.result('Features count', info.features.length);

      expect(info.name).toBe('Seeker Name Service');
      expect(info.version).toBe('1.0.0');
      expect(info.supportedTLDs).toEqual(SEEKER_NAME_TLDS);
      expect(info.features.length).toBeGreaterThan(0);

      log.pass('Service info complete');
    });
  });

  afterAll(() => {
    log.section('NAME SERVICE TESTS COMPLETE');
    console.log('  All tests executed\n');
  });
});
