/**
 * Name service helper template
 *
 * Generates a component that looks up a Solana name (SNS or similar)
 * and optionally initiates a mint request through your name service backend.
 */

import type { TemplateContext } from '../types.js';

export function generateNameService(context: TemplateContext): string {
  const { projectName, useTypeScript } = context;
  const typeDefinitions = useTypeScript
    ? `
interface NameServiceProps {
  rpcUrl: string;
  apiKey?: string;
  namespace?: string;
  onLookup?: (result: NameServiceLookupResult) => void;
  onMint?: (result: NameServiceMintResult) => void;
}

interface NameServiceLookupResult {
  name: string;
  owner?: string;
  expiresAt?: string;
  available: boolean;
}

interface NameServiceMintResult {
  name: string;
  signature?: string;
  expiresAt?: string;
}`
    : '';

  const propAnnotation = useTypeScript ? ': NameServiceProps' : '';
  const resultState = useTypeScript ? '<NameServiceLookupResult | null>' : '';

  return `/**
 * NameServiceLookup
 *
 * Queries a name service backend and exposes minting controls.
 * Generated for ${projectName}
 * @generated
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

${typeDefinitions}

export function NameServiceLookup({
  rpcUrl = '/api/name',
  apiKey,
  namespace = 'sns',
  onLookup,
  onMint,
}${propAnnotation}) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'minting' | 'ready' | 'error'>('idle');
  const [lookupResult, setLookupResult] = useState${resultState}(null);
  const [mintSignature, setMintSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = useCallback(async () => {
    if (!name) {
      setError('Enter a name before searching.');
      return;
    }

    setStatus('searching');
    setError(null);

    try {
      const response = await fetch(rpcUrl + '/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({ name, namespace }),
      });

      if (!response.ok) {
        throw new Error('Name lookup failed');
      }

      const payload = await response.json();
      const result = {
        name,
        owner: payload.owner,
        expiresAt: payload.expiresAt,
        available: Boolean(payload.available),
      };

      setLookupResult(result);
      onLookup?.(result);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setStatus('error');
    }
  }, [apiKey, name, namespace, onLookup, rpcUrl]);

  const handleMint = useCallback(async () => {
    if (!lookupResult?.name || !lookupResult.available) {
      setError('Name is not available for minting.');
      return;
    }

    setStatus('minting');
    setError(null);

    try {
      const response = await fetch(rpcUrl + '/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({ name: lookupResult.name, namespace }),
      });

      if (!response.ok) {
        throw new Error('Name mint request failed');
      }

      const payload = await response.json();
      setMintSignature(payload.signature ?? null);
      onMint?.({
        name: lookupResult.name,
        signature: payload.signature,
        expiresAt: payload.expiresAt,
      });
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      setStatus('error');
    }
  }, [apiKey, lookupResult, namespace, onMint, rpcUrl]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Name Service Lookup</Text>
      <Text style={styles.subtitle}>Search SNS, Bonk, or other Solana naming services.</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Username (e.g., youralias)"
        placeholderTextColor="#888"
        autoCapitalize="none"
      />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, status === 'searching' && styles.buttonDisabled]}
          onPress={handleLookup}
          disabled={status === 'searching'}
          activeOpacity={0.8}
        >
          {status === 'searching' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Search</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            (status === 'minting' || lookupResult?.available === false) && styles.buttonDisabled,
          ]}
          onPress={handleMint}
          disabled={status === 'minting' || lookupResult?.available === false}
          activeOpacity={0.8}
        >
          {status === 'minting' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Mint</Text>
          )}
        </TouchableOpacity>
      </View>

      {lookupResult && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {lookupResult.available ? 'Available:' : 'Taken:'}
          </Text>
          <Text style={styles.cardValue}>{lookupResult.name}</Text>
          {lookupResult.owner && <Text style={styles.detail}>Owner: {lookupResult.owner}</Text>}
          {lookupResult.expiresAt && (
            <Text style={styles.detail}>Expires at: {lookupResult.expiresAt}</Text>
          )}
        </View>
      )}

      {mintSignature && (
        <Text style={styles.success}>Mint signature: {mintSignature}</Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
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
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1c6dd0',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#151515',
  },
  cardLabel: {
    color: '#888',
    fontSize: 12,
  },
  cardValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    color: '#aaa',
    fontSize: 13,
  },
  success: {
    color: '#14F195',
    fontSize: 13,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 13,
  },
});

export default NameServiceLookup;
`;
}
