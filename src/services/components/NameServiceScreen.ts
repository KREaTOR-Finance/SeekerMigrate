/**
 * Seeker Name Service Screen Component
 *
 * React Native component for the SEEKER dAPP Name Service.
 * Allows users to register and manage .skr, .Seeker, .Seismic names.
 */

// This is a template that will be generated for the SEEKER dAPP

export const NameServiceScreenTemplate = `
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useWalletAuth } from './WalletAuthContext';

// Supported TLDs
const TLDS = ['.skr', '.Seeker', '.Seismic'] as const;
type TLD = typeof TLDS[number];

interface NameRecord {
  fullName: string;
  name: string;
  tld: TLD;
  owner: string;
  resolvedAddress: string;
}

export function NameServiceScreen() {
  const { user, isAuthenticated } = useWalletAuth();
  const [name, setName] = useState('');
  const [selectedTLD, setSelectedTLD] = useState<TLD>('.skr');
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [availability, setAvailability] = useState<'available' | 'taken' | 'invalid' | null>(null);
  const [myNames, setMyNames] = useState<NameRecord[]>([]);
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  // Validation rules
  const validateName = (input: string): { valid: boolean; error?: string } => {
    if (input.length < 3) {
      return { valid: false, error: 'Name must be at least 3 characters' };
    }
    if (input.length > 32) {
      return { valid: false, error: 'Name cannot exceed 32 characters' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
      return { valid: false, error: 'Only letters, numbers, hyphens, and underscores allowed' };
    }
    if (/^[-_]|[-_]$/.test(input)) {
      return { valid: false, error: 'Cannot start or end with hyphen or underscore' };
    }
    return { valid: true };
  };

  // Check name availability
  const checkAvailability = useCallback(async () => {
    const validation = validateName(name);
    if (!validation.valid) {
      Alert.alert('Invalid Name', validation.error);
      setAvailability('invalid');
      return;
    }

    setIsChecking(true);
    try {
      // In production, this would call the Name Service on-chain
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock availability check (random for demo)
      const isAvailable = Math.random() > 0.3;
      setAvailability(isAvailable ? 'available' : 'taken');
    } catch (error) {
      Alert.alert('Error', 'Failed to check availability');
    } finally {
      setIsChecking(false);
    }
  }, [name]);

  // Register name
  const registerName = useCallback(async () => {
    if (!isAuthenticated || !user) {
      Alert.alert('Connect Wallet', 'Please connect your wallet first');
      return;
    }

    if (availability !== 'available') {
      Alert.alert('Unavailable', 'Please check availability first');
      return;
    }

    setIsRegistering(true);
    try {
      // In production, this would create a Solana transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newRecord: NameRecord = {
        fullName: name + selectedTLD,
        name,
        tld: selectedTLD,
        owner: user.publicKey,
        resolvedAddress: user.publicKey,
      };

      setMyNames(prev => [...prev, newRecord]);
      Alert.alert('Success!', \`Registered \${newRecord.fullName}\`);
      setName('');
      setAvailability(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to register name');
    } finally {
      setIsRegistering(false);
    }
  }, [name, selectedTLD, availability, isAuthenticated, user]);

  // Lookup name
  const lookupName = useCallback(async (fullName: string) => {
    try {
      // In production, this would query the Name Service
      await new Promise(resolve => setTimeout(resolve, 500));
      setLookupResult('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'); // Mock address
    } catch {
      setLookupResult(null);
    }
  }, []);

  // Get pricing
  const getPrice = () => {
    const basePrices = { '.skr': 0.05, '.Seeker': 0.10, '.Seismic': 0.15 };
    const lengthMultiplier = name.length <= 3 ? 10 : name.length <= 4 ? 5 : name.length <= 5 ? 2 : 1;
    return (basePrices[selectedTLD] * lengthMultiplier).toFixed(3);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Seeker Name Service</Text>
        <Text style={styles.subtitle}>Connect your wallet to register names</Text>
        <View style={styles.tldShowcase}>
          {TLDS.map(tld => (
            <View key={tld} style={styles.tldBadge}>
              <Text style={styles.tldText}>{tld}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Seeker Name Service</Text>
      <Text style={styles.subtitle}>Register your .skr, .Seeker, or .Seismic name</Text>

      {/* TLD Selector */}
      <View style={styles.tldSelector}>
        {TLDS.map(tld => (
          <TouchableOpacity
            key={tld}
            style={[styles.tldButton, selectedTLD === tld && styles.tldButtonActive]}
            onPress={() => setSelectedTLD(tld)}
          >
            <Text style={[styles.tldButtonText, selectedTLD === tld && styles.tldButtonTextActive]}>
              {tld}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Name Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={(text) => {
            setName(text.toLowerCase());
            setAvailability(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.tldPreview}>{selectedTLD}</Text>
      </View>

      {/* Availability Status */}
      {availability && (
        <View style={[styles.statusBadge, styles[\`status_\${availability}\`]]}>
          <Text style={styles.statusText}>
            {availability === 'available' ? '✓ Available' :
             availability === 'taken' ? '✗ Already Registered' : '⚠ Invalid Name'}
          </Text>
        </View>
      )}

      {/* Price Display */}
      {name.length >= 3 && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Registration Price:</Text>
          <Text style={styles.priceValue}>{getPrice()} SOL / year</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.checkButton]}
          onPress={checkAvailability}
          disabled={isChecking || name.length < 3}
        >
          {isChecking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Check Availability</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.registerButton, availability !== 'available' && styles.buttonDisabled]}
          onPress={registerName}
          disabled={isRegistering || availability !== 'available'}
        >
          {isRegistering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* My Names */}
      {myNames.length > 0 && (
        <View style={styles.myNamesSection}>
          <Text style={styles.sectionTitle}>My Names</Text>
          {myNames.map((record, index) => (
            <View key={index} style={styles.nameCard}>
              <Text style={styles.nameCardTitle}>{record.fullName}</Text>
              <Text style={styles.nameCardAddress}>
                → {record.resolvedAddress.slice(0, 8)}...{record.resolvedAddress.slice(-8)}
              </Text>
            </View>
          ))}
        </View>
      )}
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
    marginBottom: 24,
  },
  tldShowcase: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  tldBadge: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#9945FF',
  },
  tldText: {
    color: '#9945FF',
    fontWeight: '600',
  },
  tldSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  tldButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
  },
  tldButtonActive: {
    backgroundColor: '#9945FF',
    borderColor: '#9945FF',
  },
  tldButtonText: {
    color: '#888',
    fontWeight: '600',
  },
  tldButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tldPreview: {
    color: '#9945FF',
    fontSize: 18,
    fontWeight: '600',
    paddingRight: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  status_available: {
    backgroundColor: 'rgba(20, 241, 149, 0.15)',
    borderWidth: 1,
    borderColor: '#14F195',
  },
  status_taken: {
    backgroundColor: 'rgba(255, 99, 99, 0.15)',
    borderWidth: 1,
    borderColor: '#ff6363',
  },
  status_invalid: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceLabel: {
    color: '#888',
    fontSize: 14,
  },
  priceValue: {
    color: '#14F195',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButton: {
    backgroundColor: '#333',
  },
  registerButton: {
    backgroundColor: '#9945FF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  myNamesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  nameCard: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  nameCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  nameCardAddress: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default NameServiceScreen;
`;

export default NameServiceScreenTemplate;
