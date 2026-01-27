/**
 * Vanity wallet generator template
 *
 * Generates a helper component that submits a prefix request to a vanity
 * wallet generator backend and displays the next available addresses.
 */

import type { TemplateContext } from '../types.js';

export function generateVanityGenerator(context: TemplateContext): string {
  const { projectName, useTypeScript } = context;
  const typeDefinitions = useTypeScript
    ? `
interface VanityGeneratorProps {
  serviceUrl: string;
  apiKey?: string;
  defaultPrefix?: string;
  costLamports?: number;
  onRequest?: (payload: VanityGeneratorResult) => void;
}

interface VanityGeneratorResult {
  address: string;
  attempts?: number;
  etaSeconds?: number;
  memo?: string;
}`
    : '';

  const resultStateType = useTypeScript ? '<VanityGeneratorResult | null>' : '';
  const propAnnotation = useTypeScript ? ': VanityGeneratorProps' : '';

  return `/**
 * VanityWalletGenerator
 *
 * Connects to a vanity wallet service and displays the generated address.
 * Generated for ${projectName}
 * @generated
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

${typeDefinitions}

export function VanityWalletGenerator({
  serviceUrl,
  apiKey,
  defaultPrefix = 'sol',
  costLamports = 50000,
  onRequest,
}${propAnnotation}) {
  const [prefix, setPrefix] = useState(defaultPrefix);
    const [result, setResult] = useState${resultStateType}(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const costSol = useMemo(() => (costLamports / 1_000_000_000).toFixed(4), [costLamports]);

  const handleGenerate = useCallback(async () => {
    if (!serviceUrl || prefix.length < 2) {
      setErrorMessage('Provide at least two characters for the prefix.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(serviceUrl + '/vanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
        },
        body: JSON.stringify({
          prefix,
          costLamports,
          network: 'solana',
        }),
      });

      if (!response.ok) {
        throw new Error('Vanity request failed');
      }

      const payload = await response.json();
      const formatted = {
        address: payload.address ?? payload.publicKey ?? 'unknown',
        attempts: payload.attempts,
        etaSeconds: payload.etaSeconds,
        memo: payload.memo,
      };

      setResult(formatted);
      onRequest?.(formatted);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit vanity request'
      );
    }
  }, [apiKey, costLamports, onRequest, prefix, serviceUrl]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vanity Wallet Generator</Text>
      <Text style={styles.subtitle}>
        Request a vanity address (cost ≈ {costSol} SOL)
      </Text>

      <TextInput
        style={styles.input}
        value={prefix}
        onChangeText={setPrefix}
        placeholder="Prefix (e.g., 'sol')"
        placeholderTextColor="#888"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, status === 'loading' && styles.buttonLoading]}
        onPress={handleGenerate}
        disabled={status === 'loading'}
        activeOpacity={0.8}
      >
        {status === 'loading' ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Submit Vanity Request</Text>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>Address</Text>
          <Text style={styles.resultValue}>{result.address}</Text>
          {result.attempts != null && (
            <Text style={styles.detail}>Attempts: {result.attempts}</Text>
          )}
          {result.etaSeconds != null && (
            <Text style={styles.detail}>ETA: {result.etaSeconds} seconds</Text>
          )}
          {result.memo && <Text style={styles.detail}>Memo: {result.memo}</Text>}
        </View>
      )}

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#111',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1c6dd0',
  },
  buttonLoading: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  result: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#222',
  },
  resultLabel: {
    color: '#888',
    fontSize: 12,
  },
  resultValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  detail: {
    color: '#aaa',
    fontSize: 13,
  },
  error: {
    color: '#FF6B6B',
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default VanityWalletGenerator;
`;
}
