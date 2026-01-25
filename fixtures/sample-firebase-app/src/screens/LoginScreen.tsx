/**
 * Login Screen with Firebase Email Authentication
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen(): React.JSX.Element {
  const { login, register, resetPassword, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegisterMode) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      await resetPassword(email);
      Alert.alert('Success', 'Password reset email sent');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isRegisterMode ? 'Create Account' : 'Welcome Back'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegisterMode ? 'Sign Up' : 'Login'}
          </Text>
        )}
      </TouchableOpacity>

      {!isRegisterMode && (
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)}>
        <Text style={styles.link}>
          {isRegisterMode
            ? 'Already have an account? Login'
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  button: {
    height: 50,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#FF6B35',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
});
