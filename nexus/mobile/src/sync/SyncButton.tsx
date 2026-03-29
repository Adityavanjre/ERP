import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { mobileSync, mobileSyncStatus } from './mobile-sync';
import type { SyncProgress, SyncStatus } from '../../packages/sync-engine/src';

interface SyncButtonProps {
  onSyncComplete?: (result: SyncProgress) => void;
}

export function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setProgress({ phase: 'pushing', pushedCount: 0, pulledCount: 0, conflictCount: 0 });

    try {
      const result = await mobileSync();
      setProgress(result);
      onSyncComplete?.(result);

      const newStatus = await mobileSyncStatus();
      setStatus(newStatus);
    } catch (err: any) {
      setProgress({ phase: 'error', pushedCount: 0, pulledCount: 0, conflictCount: 0, error: err.message });
    } finally {
      setSyncing(false);
    }
  }, [syncing, onSyncComplete]);

  const getPhaseLabel = () => {
    if (!progress) return 'Sync';
    switch (progress.phase) {
      case 'pushing': return `Pushing... (${progress.pushedCount})`;
      case 'pulling': return `Pulling... (${progress.pulledCount})`;
      case 'complete': return `Synced (${progress.pushedCount}↑ ${progress.pulledCount}↓)`;
      case 'error': return `Error: ${progress.error}`;
      default: return 'Sync';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, syncing && styles.buttonSyncing]}
      onPress={handleSync}
      disabled={syncing}
      activeOpacity={0.7}
    >
      {syncing ? (
        <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
      ) : null}
      <Text style={styles.text}>{getPhaseLabel()}</Text>
      {status && !syncing && status.pendingChanges > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{status.pendingChanges}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonSyncing: {
    backgroundColor: '#6366F1',
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
