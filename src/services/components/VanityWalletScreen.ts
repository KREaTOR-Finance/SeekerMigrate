/**
 * Vanity Wallet Generator Screen Component
 *
 * React Native component for the SEEKER dAPP Vanity Wallet Generator.
 * Allows users to generate custom wallet addresses with prefix or suffix.
 * All generation happens locally on the device.
 */

// This is a template that will be generated for the SEEKER dAPP

export const VanityWalletScreenTemplate = `
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';

// Base58 alphabet for Solana addresses
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const MAX_PATTERN_LENGTH = 6;

type VanityMode = 'prefix' | 'suffix';
type Difficulty = 'easy' | 'medium' | 'hard' | 'very_hard' | 'extreme';

interface GeneratedWallet {
  publicKey: string;
  secretKey: string;
  pattern: string;
  mode: VanityMode;
  attempts: number;
  timeMs: number;
}

interface Progress {
  attempts: number;
  keysPerSecond: number;
  elapsedMs: number;
  bestMatch: number;
}

export function VanityWalletScreen() {
  const [pattern, setPattern] = useState('');
  const [mode, setMode] = useState<VanityMode>('prefix');
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [generatedWallet, setGeneratedWallet] = useState<GeneratedWallet | null>(null);
  const [savedWallets, setSavedWallets] = useState<GeneratedWallet[]>([]);
  const shouldStopRef = useRef(false);

  // Validate pattern
  const validatePattern = (input: string): { valid: boolean; error?: string } => {
    if (input.length === 0) {
      return { valid: false, error: 'Enter a pattern' };
    }
    if (input.length > MAX_PATTERN_LENGTH) {
      return { valid: false, error: \`Maximum \${MAX_PATTERN_LENGTH} characters\` };
    }
    for (const char of input) {
      if (!BASE58_ALPHABET.includes(char)) {
        return { valid: false, error: \`Invalid character '\${char}'. Use Base58: 1-9, A-Z (no O/I), a-z (no l)\` };
      }
    }
    return { valid: true };
  };

  // Calculate difficulty
  const getDifficulty = (): { level: Difficulty; estimate: string; attempts: number } => {
    const len = pattern.length;
    const alphabetSize = caseSensitive ? 58 : 34;
    const attempts = Math.pow(alphabetSize, len);

    let level: Difficulty;
    let estimate: string;

    if (len <= 1) {
      level = 'easy';
      estimate = '< 1 second';
    } else if (len === 2) {
      level = 'easy';
      estimate = '1-5 seconds';
    } else if (len === 3) {
      level = 'medium';
      estimate = '1-5 minutes';
    } else if (len === 4) {
      level = 'hard';
      estimate = '10-30 minutes';
    } else if (len === 5) {
      level = 'very_hard';
      estimate = '2-6 hours';
    } else {
      level = 'extreme';
      estimate = '12+ hours';
    }

    return { level, estimate, attempts };
  };

  // Generate mock keypair (in production, use @solana/web3.js Keypair.generate())
  const generateKeypair = () => {
    let address = '';
    const length = 43 + Math.floor(Math.random() * 2);
    for (let i = 0; i < length; i++) {
      address += BASE58_ALPHABET[Math.floor(Math.random() * 58)];
    }

    // Mock secret key (in production, this comes from actual keypair)
    let secretKey = '';
    for (let i = 0; i < 88; i++) {
      secretKey += BASE58_ALPHABET[Math.floor(Math.random() * 58)];
    }

    return { publicKey: address, secretKey };
  };

  // Check if address matches pattern
  const matchesPattern = (address: string): boolean => {
    const addr = caseSensitive ? address : address.toLowerCase();
    const pat = caseSensitive ? pattern : pattern.toLowerCase();

    if (mode === 'prefix') {
      return addr.startsWith(pat);
    } else {
      return addr.endsWith(pat);
    }
  };

  // Count matching characters
  const countMatching = (address: string): number => {
    const addr = caseSensitive ? address : address.toLowerCase();
    const pat = caseSensitive ? pattern : pattern.toLowerCase();

    let count = 0;
    if (mode === 'prefix') {
      for (let i = 0; i < pat.length && i < addr.length; i++) {
        if (addr[i] === pat[i]) count++;
        else break;
      }
    } else {
      for (let i = 1; i <= pat.length && i <= addr.length; i++) {
        if (addr[addr.length - i] === pat[pat.length - i]) count++;
        else break;
      }
    }
    return count;
  };

  // Main generation function
  const startGeneration = useCallback(async () => {
    const validation = validatePattern(pattern);
    if (!validation.valid) {
      Alert.alert('Invalid Pattern', validation.error);
      return;
    }

    setIsGenerating(true);
    setProgress(null);
    setGeneratedWallet(null);
    shouldStopRef.current = false;

    const startTime = Date.now();
    let attempts = 0;
    let bestMatch = 0;

    try {
      while (!shouldStopRef.current) {
        attempts++;

        const { publicKey, secretKey } = generateKeypair();

        // Check for match
        if (matchesPattern(publicKey)) {
          const wallet: GeneratedWallet = {
            publicKey,
            secretKey,
            pattern,
            mode,
            attempts,
            timeMs: Date.now() - startTime,
          };
          setGeneratedWallet(wallet);
          Alert.alert('Success!', \`Found matching address after \${attempts.toLocaleString()} attempts!\`);
          break;
        }

        // Track best partial match
        const matched = countMatching(publicKey);
        if (matched > bestMatch) {
          bestMatch = matched;
        }

        // Update progress every 1000 attempts
        if (attempts % 1000 === 0) {
          const elapsedMs = Date.now() - startTime;
          const keysPerSecond = Math.round(attempts / (elapsedMs / 1000));

          setProgress({
            attempts,
            keysPerSecond,
            elapsedMs,
            bestMatch,
          });

          // Yield to UI thread
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Safety limit for demo (remove in production)
        if (attempts >= 10000000) {
          Alert.alert('Limit Reached', 'Demo limit of 10M attempts reached');
          break;
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }, [pattern, mode, caseSensitive]);

  // Stop generation
  const stopGeneration = () => {
    shouldStopRef.current = true;
  };

  // Save wallet
  const saveWallet = () => {
    if (generatedWallet) {
      setSavedWallets(prev => [...prev, generatedWallet]);
      Alert.alert('Saved', 'Wallet saved to your collection');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', \`\${label} copied to clipboard\`);
  };

  const difficulty = pattern.length > 0 ? getDifficulty() : null;
  const validation = validatePattern(pattern);

  const difficultyColors: Record<Difficulty, string> = {
    easy: '#14F195',
    medium: '#ffc107',
    hard: '#ff9800',
    very_hard: '#ff5722',
    extreme: '#f44336',
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vanity Wallet Generator</Text>
      <Text style={styles.subtitle}>Generate custom Solana addresses locally on your device</Text>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityText}>
          Keys are generated locally. Your private key never leaves this device.
        </Text>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'prefix' && styles.modeButtonActive]}
          onPress={() => setMode('prefix')}
          disabled={isGenerating}
        >
          <Text style={[styles.modeButtonText, mode === 'prefix' && styles.modeButtonTextActive]}>
            Prefix
          </Text>
          <Text style={styles.modeExample}>ABC...xxx</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, mode === 'suffix' && styles.modeButtonActive]}
          onPress={() => setMode('suffix')}
          disabled={isGenerating}
        >
          <Text style={[styles.modeButtonText, mode === 'suffix' && styles.modeButtonTextActive]}>
            Suffix
          </Text>
          <Text style={styles.modeExample}>xxx...ABC</Text>
        </TouchableOpacity>
      </View>

      {/* Pattern Input */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>
          Pattern ({MAX_PATTERN_LENGTH} chars max, Base58 only)
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter pattern"
            placeholderTextColor="#666"
            value={pattern}
            onChangeText={setPattern}
            maxLength={MAX_PATTERN_LENGTH}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isGenerating}
          />
          <Text style={styles.charCount}>{pattern.length}/{MAX_PATTERN_LENGTH}</Text>
        </View>
        {pattern.length > 0 && !validation.valid && (
          <Text style={styles.errorText}>{validation.error}</Text>
        )}
      </View>

      {/* Case Sensitivity Toggle */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => setCaseSensitive(!caseSensitive)}
        disabled={isGenerating}
      >
        <Text style={styles.toggleLabel}>Case Sensitive</Text>
        <View style={[styles.toggle, caseSensitive && styles.toggleActive]}>
          <View style={[styles.toggleKnob, caseSensitive && styles.toggleKnobActive]} />
        </View>
      </TouchableOpacity>

      {/* Difficulty Indicator */}
      {difficulty && validation.valid && (
        <View style={styles.difficultyContainer}>
          <View style={styles.difficultyRow}>
            <Text style={styles.difficultyLabel}>Difficulty:</Text>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[difficulty.level] + '30' }]}>
              <Text style={[styles.difficultyText, { color: difficultyColors[difficulty.level] }]}>
                {difficulty.level.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.estimateText}>Estimated time: {difficulty.estimate}</Text>
          <Text style={styles.attemptsText}>~{difficulty.attempts.toLocaleString()} attempts expected</Text>
        </View>
      )}

      {/* Progress Display */}
      {isGenerating && progress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Attempts:</Text>
            <Text style={styles.progressValue}>{progress.attempts.toLocaleString()}</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Speed:</Text>
            <Text style={styles.progressValue}>{progress.keysPerSecond.toLocaleString()} keys/sec</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Elapsed:</Text>
            <Text style={styles.progressValue}>{(progress.elapsedMs / 1000).toFixed(1)}s</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Best Match:</Text>
            <Text style={styles.progressValue}>{progress.bestMatch}/{pattern.length} chars</Text>
          </View>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionButton, isGenerating && styles.stopButton]}
        onPress={isGenerating ? stopGeneration : startGeneration}
        disabled={!validation.valid && !isGenerating}
      >
        {isGenerating ? (
          <>
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Stop Generation</Text>
          </>
        ) : (
          <Text style={styles.actionButtonText}>Generate Vanity Wallet</Text>
        )}
      </TouchableOpacity>

      {/* Generated Wallet Display */}
      {generatedWallet && (
        <View style={styles.walletCard}>
          <Text style={styles.walletCardTitle}>Generated Wallet</Text>

          <View style={styles.walletField}>
            <Text style={styles.walletFieldLabel}>Public Key (Address)</Text>
            <TouchableOpacity onPress={() => copyToClipboard(generatedWallet.publicKey, 'Address')}>
              <Text style={styles.walletAddress}>{generatedWallet.publicKey}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.walletField}>
            <Text style={styles.walletFieldLabel}>Private Key (KEEP SECRET!)</Text>
            <TouchableOpacity onPress={() => copyToClipboard(generatedWallet.secretKey, 'Private Key')}>
              <Text style={styles.walletSecret}>
                {generatedWallet.secretKey.slice(0, 20)}...tap to copy
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.walletStats}>
            <Text style={styles.walletStat}>
              Found in {generatedWallet.attempts.toLocaleString()} attempts
            </Text>
            <Text style={styles.walletStat}>
              Time: {(generatedWallet.timeMs / 1000).toFixed(1)}s
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveWallet}>
            <Text style={styles.saveButtonText}>Save Wallet</Text>
          </TouchableOpacity>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ IMPORTANT: Save your private key securely. It cannot be recovered if lost!
            </Text>
          </View>
        </View>
      )}

      {/* Saved Wallets */}
      {savedWallets.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.sectionTitle}>Saved Wallets ({savedWallets.length})</Text>
          {savedWallets.map((wallet, index) => (
            <View key={index} style={styles.savedWalletCard}>
              <Text style={styles.savedWalletPattern}>
                {wallet.mode === 'prefix' ? wallet.pattern + '...' : '...' + wallet.pattern}
              </Text>
              <Text style={styles.savedWalletAddress}>
                {wallet.publicKey.slice(0, 12)}...{wallet.publicKey.slice(-12)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Base58 Reference */}
      <View style={styles.referenceSection}>
        <Text style={styles.referenceTitle}>Valid Characters (Base58)</Text>
        <Text style={styles.referenceChars}>1-9, A-H, J-N, P-Z, a-k, m-z</Text>
        <Text style={styles.referenceNote}>Note: 0, O, I, l are excluded to avoid confusion</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#14F195',
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  securityText: {
    flex: 1,
    color: '#14F195',
    fontSize: 13,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modeButtonActive: {
    backgroundColor: '#9945FF20',
    borderColor: '#9945FF',
  },
  modeButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#9945FF',
  },
  modeExample: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 24,
    fontFamily: 'monospace',
    paddingHorizontal: 16,
    paddingVertical: 16,
    textAlign: 'center',
    letterSpacing: 4,
  },
  charCount: {
    color: '#666',
    fontSize: 12,
    paddingRight: 16,
  },
  errorText: {
    color: '#ff6363',
    fontSize: 12,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#9945FF',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#666',
  },
  toggleKnobActive: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  difficultyContainer: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  difficultyLabel: {
    color: '#888',
    fontSize: 14,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  estimateText: {
    color: '#fff',
    fontSize: 14,
  },
  attemptsText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#888',
    fontSize: 14,
  },
  progressValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#9945FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#ff5722',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  walletCard: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#14F195',
  },
  walletCardTitle: {
    color: '#14F195',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  walletField: {
    marginBottom: 16,
  },
  walletFieldLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  walletAddress: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 8,
  },
  walletSecret: {
    color: '#ff9800',
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 8,
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  walletStat: {
    color: '#666',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#14F195',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  warningText: {
    color: '#ff9800',
    fontSize: 12,
    textAlign: 'center',
  },
  savedSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  savedWalletCard: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savedWalletPattern: {
    color: '#9945FF',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  savedWalletAddress: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  referenceSection: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  referenceTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  referenceChars: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: 4,
  },
  referenceNote: {
    color: '#666',
    fontSize: 11,
  },
});

export default VanityWalletScreen;
`;

export default VanityWalletScreenTemplate;
