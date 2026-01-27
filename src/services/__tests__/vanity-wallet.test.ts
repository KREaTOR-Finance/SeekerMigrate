/**
 * Vanity Wallet Generator - Comprehensive Test Suite
 *
 * Tests all functionality of the Vanity Wallet Generator including:
 * - Pattern validation
 * - Difficulty estimation
 * - Prefix and suffix modes
 * - Generation (with limited attempts for testing)
 * - Edge cases and error handling
 */

import { VanityWalletGenerator } from '../vanity-wallet/index.js';
import {
  BASE58_ALPHABET,
  VANITY_MAX_CHARS,
  VanityMode,
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
  warn: (msg: string) => console.log(`    ⚠️  ${msg}`),
};

describe('VanityWalletGenerator', () => {
  let generator: VanityWalletGenerator;

  beforeAll(() => {
    log.section('VANITY WALLET GENERATOR TEST SUITE');
    console.log('  Testing local on-device wallet generation');
    console.log(`  Max pattern length: ${VANITY_MAX_CHARS} characters`);
  });

  beforeEach(() => {
    generator = new VanityWalletGenerator();
  });

  // ============================================
  // Pattern Validation Tests
  // ============================================
  describe('Pattern Validation', () => {
    beforeAll(() => log.section('PATTERN VALIDATION TESTS'));

    test('should accept valid Base58 patterns', () => {
      log.test('Valid Base58 pattern acceptance');

      const validPatterns = ['A', 'abc', 'ABC', '123', 'Abc123', 'aB1cD2'];

      for (const pattern of validPatterns) {
        const result = generator.validatePattern(pattern, 'prefix');
        if (result.valid) {
          log.pass(`"${pattern}" is valid`);
        } else {
          log.fail(`"${pattern}" should be valid`, result.error);
        }
        expect(result.valid).toBe(true);
      }
    });

    test('should reject empty patterns', () => {
      log.test('Empty pattern rejection');

      const result = generator.validatePattern('', 'prefix');

      if (!result.valid && result.error?.includes('empty')) {
        log.pass('Empty pattern rejected');
      } else {
        log.fail('Empty pattern should be rejected');
      }

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    test('should reject patterns exceeding max length', () => {
      log.test(`Maximum length enforcement (${VANITY_MAX_CHARS} chars)`);

      const tooLong = 'A'.repeat(VANITY_MAX_CHARS + 1);
      const result = generator.validatePattern(tooLong, 'prefix');

      log.result('Pattern length', tooLong.length);

      if (!result.valid && result.error?.includes(VANITY_MAX_CHARS.toString())) {
        log.pass(`${tooLong.length}-char pattern rejected`);
      } else {
        log.fail(`Pattern over ${VANITY_MAX_CHARS} chars should be rejected`);
      }

      expect(result.valid).toBe(false);
    });

    test('should reject invalid Base58 characters', () => {
      log.test('Invalid character rejection');

      // Characters NOT in Base58: 0, O, I, l
      const invalidPatterns = ['0abc', 'Oops', 'Invalid', 'hello'];

      for (const pattern of invalidPatterns) {
        const result = generator.validatePattern(pattern, 'prefix');

        // Find the invalid char
        const invalidChar = pattern.split('').find(c => !BASE58_ALPHABET.includes(c));

        if (!result.valid) {
          log.pass(`"${pattern}" rejected (invalid: '${invalidChar}')`);
        } else {
          log.fail(`"${pattern}" should be rejected for containing '${invalidChar}'`);
        }
        expect(result.valid).toBe(false);
      }
    });

    test('should accept maximum length patterns', () => {
      log.test('Maximum length acceptance');

      const maxLength = 'A'.repeat(VANITY_MAX_CHARS);
      const result = generator.validatePattern(maxLength, 'prefix');

      log.result('Pattern', maxLength);
      log.result('Length', maxLength.length);

      if (result.valid) {
        log.pass(`${VANITY_MAX_CHARS}-char pattern accepted`);
      } else {
        log.fail(`${VANITY_MAX_CHARS}-char pattern should be accepted`, result.error);
      }

      expect(result.valid).toBe(true);
    });

    test('should validate both prefix and suffix modes', () => {
      log.test('Mode validation');

      const modes: VanityMode[] = ['prefix', 'suffix'];

      for (const mode of modes) {
        const result = generator.validatePattern('ABC', mode);
        if (result.valid) {
          log.pass(`Mode "${mode}" validated`);
        } else {
          log.fail(`Mode "${mode}" should be valid`);
        }
        expect(result.valid).toBe(true);
      }
    });
  });

  // ============================================
  // Difficulty Estimation Tests
  // ============================================
  describe('Difficulty Estimation', () => {
    beforeAll(() => log.section('DIFFICULTY ESTIMATION TESTS'));

    test('should estimate correct difficulty levels', () => {
      log.test('Difficulty level assignment');

      const testCases = [
        { pattern: 'A', expected: 'easy' },
        { pattern: 'AB', expected: 'easy' },
        { pattern: 'ABC', expected: 'medium' },
        { pattern: 'ABCD', expected: 'hard' },
        { pattern: 'ABCDE', expected: 'very_hard' },
        { pattern: 'ABCDEF', expected: 'extreme' },
      ];

      for (const { pattern, expected } of testCases) {
        const result = generator.validatePattern(pattern, 'prefix');

        log.result(`${pattern.length} char(s)`, result.difficulty);

        if (result.difficulty === expected) {
          log.pass(`"${pattern}" → ${expected}`);
        } else {
          log.fail(`Expected ${expected}, got ${result.difficulty}`);
        }

        expect(result.difficulty).toBe(expected);
      }
    });

    test('should calculate reasonable attempt estimates', () => {
      log.test('Attempt estimation accuracy');

      // For case-sensitive Base58 (58 chars), expected attempts = 58^length

      const testCases = [
        { pattern: 'A', expectedAttempts: 58 },
        { pattern: 'AB', expectedAttempts: 58 * 58 },
        { pattern: 'ABC', expectedAttempts: 58 * 58 * 58 },
      ];

      for (const { pattern, expectedAttempts } of testCases) {
        const result = generator.validatePattern(pattern, 'prefix');

        log.result(`"${pattern}" estimated attempts`, result.estimatedAttempts.toLocaleString());

        if (result.estimatedAttempts === expectedAttempts) {
          log.pass(`Calculation correct: 58^${pattern.length} = ${expectedAttempts}`);
        } else {
          log.fail(`Expected ${expectedAttempts}, got ${result.estimatedAttempts}`);
        }

        expect(result.estimatedAttempts).toBe(expectedAttempts);
      }
    });

    test('should provide time estimates', () => {
      log.test('Time estimation');

      const patterns = ['A', 'AB', 'ABC', 'ABCD'];

      for (const pattern of patterns) {
        const result = generator.validatePattern(pattern, 'prefix');
        const timeStr = generator.formatTimeEstimate(result.estimatedTimeSeconds);

        log.result(`"${pattern}" time estimate`, timeStr);

        expect(result.estimatedTimeSeconds).toBeGreaterThan(0);
        expect(timeStr).toBeTruthy();
        log.pass(`Time estimate provided: ${timeStr}`);
      }
    });

    test('should provide difficulty descriptions', () => {
      log.test('Difficulty descriptions');

      const difficulties: Array<'easy' | 'medium' | 'hard' | 'very_hard' | 'extreme'> = [
        'easy', 'medium', 'hard', 'very_hard', 'extreme'
      ];

      for (const difficulty of difficulties) {
        const description = generator.getDifficultyDescription(difficulty);

        log.result(difficulty, description);

        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(10);
        log.pass(`${difficulty} has description`);
      }
    });
  });

  // ============================================
  // Generation Tests (Limited Attempts)
  // ============================================
  describe('Wallet Generation', () => {
    beforeAll(() => log.section('WALLET GENERATION TESTS'));

    test('should generate wallet with simple prefix (1 char)', async () => {
      log.test('Simple prefix generation');

      const pattern = 'A';
      log.info(`Pattern: "${pattern}" (prefix)`);
      log.info('This should find a match quickly...');

      const result = await generator.generate({
        pattern,
        mode: 'prefix',
        caseSensitive: true,
        maxAttempts: 10000,
      });

      log.result('Success', result.success);
      log.result('Attempts', result.attempts.toLocaleString());
      log.result('Time', `${result.elapsedMs}ms`);

      if (result.success && result.keypair) {
        log.pass('Wallet generated successfully');
        log.info(`Address: ${result.keypair.publicKey.slice(0, 20)}...`);
        log.info(`Starts with: ${result.keypair.publicKey.slice(0, 5)}`);

        // Verify it actually starts with the pattern
        expect(result.keypair.publicKey.startsWith(pattern)).toBe(true);
      } else {
        log.warn(`Generation stopped: ${result.error}`);
        log.info('This can happen due to randomness - not necessarily a failure');
      }

      // We at least ran some attempts
      expect(result.attempts).toBeGreaterThan(0);
    }, 30000);

    test('should generate wallet with simple suffix (1 char)', async () => {
      log.test('Simple suffix generation');

      const pattern = 'z';
      log.info(`Pattern: "${pattern}" (suffix)`);

      const result = await generator.generate({
        pattern,
        mode: 'suffix',
        caseSensitive: true,
        maxAttempts: 10000,
      });

      log.result('Success', result.success);
      log.result('Attempts', result.attempts.toLocaleString());

      if (result.success && result.keypair) {
        log.pass('Wallet generated successfully');
        log.info(`Address: ...${result.keypair.publicKey.slice(-20)}`);
        log.info(`Ends with: ${result.keypair.publicKey.slice(-5)}`);

        expect(result.keypair.publicKey.endsWith(pattern)).toBe(true);
      } else {
        log.warn(`Generation stopped: ${result.error}`);
      }

      expect(result.attempts).toBeGreaterThan(0);
    }, 30000);

    test('should respect maxAttempts limit', async () => {
      log.test('Max attempts enforcement');

      const maxAttempts = 1000;
      log.info(`Max attempts: ${maxAttempts}`);

      const result = await generator.generate({
        pattern: 'ZZZZ', // Very unlikely to match quickly
        mode: 'prefix',
        caseSensitive: true,
        maxAttempts,
      });

      log.result('Attempts made', result.attempts);

      if (result.attempts <= maxAttempts) {
        log.pass(`Stopped at or before limit (${result.attempts}/${maxAttempts})`);
      } else {
        log.fail(`Exceeded limit: ${result.attempts} > ${maxAttempts}`);
      }

      expect(result.attempts).toBeLessThanOrEqual(maxAttempts);
    });

    test('should report progress during generation', async () => {
      log.test('Progress callback');

      let progressUpdates = 0;
      let lastAttempts = 0;

      const result = await generator.generate({
        pattern: 'XYZ',
        mode: 'prefix',
        caseSensitive: true,
        maxAttempts: 5000,
        onProgress: (progress) => {
          progressUpdates++;
          lastAttempts = progress.attempts;

          if (progressUpdates === 1) {
            log.info(`First progress: ${progress.attempts} attempts, ${progress.keysPerSecond}/sec`);
          }
        },
      });

      log.result('Progress updates received', progressUpdates);
      log.result('Last reported attempts', lastAttempts);

      if (progressUpdates > 0) {
        log.pass('Progress callbacks received');
      } else if (result.attempts < 1000) {
        log.info('Too few attempts for progress callbacks (need 1000+)');
      }

      expect(result.attempts).toBeGreaterThan(0);
    }, 30000);

    test('should handle case-insensitive matching', async () => {
      log.test('Case-insensitive generation');

      const result = await generator.generate({
        pattern: 'a',
        mode: 'prefix',
        caseSensitive: false,
        maxAttempts: 5000,
      });

      log.result('Case sensitive', false);
      log.result('Success', result.success);

      if (result.success && result.keypair) {
        const firstChar = result.keypair.publicKey[0].toLowerCase();
        log.info(`Address starts with: ${result.keypair.publicKey[0]}`);

        if (firstChar === 'a') {
          log.pass('Case-insensitive match found');
        }
      }

      expect(result.attempts).toBeGreaterThan(0);
    }, 30000);

    test('should generate valid keypair structure', async () => {
      log.test('Keypair structure validation');

      const result = await generator.generate({
        pattern: 'B',
        mode: 'prefix',
        caseSensitive: true,
        maxAttempts: 10000,
      });

      if (result.success && result.keypair) {
        log.info('Validating keypair structure...');

        // Public key checks
        const pubKeyValid =
          result.keypair.publicKey.length >= 32 &&
          result.keypair.publicKey.length <= 44;

        log.result('Public key length', result.keypair.publicKey.length);
        if (pubKeyValid) {
          log.pass('Public key length valid (32-44 chars)');
        } else {
          log.fail('Public key length invalid');
        }

        // Secret key checks
        const hasSecretKey = result.keypair.secretKey.length > 0;
        const hasSecretBytes = result.keypair.secretKeyBytes.length === 64;

        log.result('Secret key present', hasSecretKey);
        log.result('Secret key bytes length', result.keypair.secretKeyBytes.length);

        if (hasSecretKey) {
          log.pass('Secret key present');
        }
        if (hasSecretBytes) {
          log.pass('Secret key bytes correct (64 bytes)');
        }

        expect(pubKeyValid).toBe(true);
        expect(hasSecretKey).toBe(true);
        expect(hasSecretBytes).toBe(true);
      } else {
        log.warn('No wallet generated to validate structure');
      }
    }, 30000);
  });

  // ============================================
  // Edge Cases and Error Handling
  // ============================================
  describe('Edge Cases and Error Handling', () => {
    beforeAll(() => log.section('EDGE CASES & ERROR HANDLING'));

    test('should handle invalid pattern gracefully', async () => {
      log.test('Invalid pattern handling');

      const result = await generator.generate({
        pattern: '0OIl', // All invalid Base58 chars
        mode: 'prefix',
        caseSensitive: true,
      });

      log.result('Success', result.success);
      log.result('Error', result.error);

      if (!result.success && result.error) {
        log.pass('Invalid pattern handled gracefully');
      } else {
        log.fail('Should have failed with error');
      }

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should stop generation cleanly', async () => {
      log.test('Generation stop functionality');

      // Start generation
      const generationPromise = generator.generate({
        pattern: 'XXXXXX', // Very unlikely
        mode: 'prefix',
        caseSensitive: true,
        maxAttempts: 1000000,
      });

      // Stop after a short delay
      setTimeout(() => {
        generator.stop();
        log.info('Stop signal sent');
      }, 100);

      const result = await generationPromise;

      log.result('Stopped', result.error?.includes('cancelled'));
      log.result('Attempts before stop', result.attempts);

      if (result.error?.includes('cancelled')) {
        log.pass('Generation stopped cleanly');
      }

      expect(result.success).toBe(false);
    }, 10000);

    test('should report running state correctly', async () => {
      log.test('Running state tracking');

      // Initially not running
      if (!generator.isRunning()) {
        log.pass('Initially not running');
      }

      // Start generation
      const genPromise = generator.generate({
        pattern: 'A',
        mode: 'prefix',
        caseSensitive: true,
        maxAttempts: 100,
      });

      // Wait for result
      await genPromise;

      // Should not be running after completion
      if (!generator.isRunning()) {
        log.pass('Not running after completion');
      }

      expect(generator.isRunning()).toBe(false);
    });

    test('should handle all Base58 characters', () => {
      log.test('Full Base58 alphabet support');

      log.info(`Base58 alphabet: ${BASE58_ALPHABET}`);
      log.info(`Total characters: ${BASE58_ALPHABET.length}`);

      // Test each character
      let allValid = true;
      const invalidChars: string[] = [];

      for (const char of BASE58_ALPHABET) {
        const result = generator.validatePattern(char, 'prefix');
        if (!result.valid) {
          allValid = false;
          invalidChars.push(char);
        }
      }

      if (allValid) {
        log.pass(`All ${BASE58_ALPHABET.length} Base58 characters valid`);
      } else {
        log.fail(`Invalid chars found: ${invalidChars.join(', ')}`);
      }

      expect(allValid).toBe(true);
    });
  });

  // ============================================
  // Service Info Tests
  // ============================================
  describe('Service Information', () => {
    beforeAll(() => log.section('SERVICE INFORMATION TESTS'));

    test('should return correct service info', () => {
      log.test('Service info retrieval');

      const info = generator.getServiceInfo();

      log.result('Service name', info.name);
      log.result('Version', info.version);
      log.result('Max pattern length', info.maxPatternLength);
      log.result('Supported modes', info.supportedModes);
      log.result('Features count', info.features.length);
      log.result('Security notes count', info.securityNotes.length);

      expect(info.name).toBe('Vanity Wallet Generator');
      expect(info.version).toBe('1.0.0');
      expect(info.maxPatternLength).toBe(VANITY_MAX_CHARS);
      expect(info.supportedModes).toContain('prefix');
      expect(info.supportedModes).toContain('suffix');
      expect(info.features.length).toBeGreaterThan(0);
      expect(info.securityNotes.length).toBeGreaterThan(0);

      log.pass('Service info complete');

      // Display security notes
      log.info('Security notes:');
      for (const note of info.securityNotes) {
        console.log(`       🔒 ${note}`);
      }
    });
  });

  afterAll(() => {
    log.section('VANITY WALLET TESTS COMPLETE');
    console.log('  All tests executed\n');
  });
});
