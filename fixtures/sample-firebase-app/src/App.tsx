/**
 * Sample React Native App with Firebase Authentication
 * Used as a test fixture for SeekerMigrate
 */

import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { useAuth } from './contexts/AuthContext';

function AppContent(): React.JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return <></>;
  }

  return user ? <HomeScreen /> : <LoginScreen />;
}

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default App;
