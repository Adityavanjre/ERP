import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/RootNavigator';
import { initMobileDb } from './src/db/mobile-db';
import { Theme } from './src/constants/theme';

// FIX CRIT-002: Initialize database on app startup
function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize SQLite database with schema
        await initMobileDb();
        console.log('[App] Mobile database initialized successfully');
        setIsReady(true);
      } catch (error) {
        console.error('[App] Failed to initialize database:', error);
        setInitError(error instanceof Error ? error.message : 'Database initialization failed');
      }
    };

    initialize();
  }, []);

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <Text style={styles.errorHint}>Please restart the app or contact support.</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Nexus...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AppInitializer>
      <AppNavigator />
      <StatusBar style="light" />
    </AppInitializer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: Theme.colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    padding: 24,
  },
  errorTitle: {
    color: Theme.colors.destructive,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  errorMessage: {
    color: Theme.colors.foreground,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: Theme.colors.mutedForeground,
    fontSize: 12,
    textAlign: 'center',
  },
});
