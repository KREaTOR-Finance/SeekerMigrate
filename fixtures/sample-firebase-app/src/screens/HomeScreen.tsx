/**
 * Home Screen - Shown after successful authentication
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function HomeScreen(): React.JSX.Element {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <Text style={styles.cardText}>Email: {user?.email}</Text>
        <Text style={styles.cardText}>
          Verified: {user?.emailVerified ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.cardText}>UID: {user?.uid}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  email: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  cardText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  logoutButton: {
    height: 50,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
