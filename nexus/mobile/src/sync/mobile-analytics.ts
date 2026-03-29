import { createMobileDbAdapter } from '../db/mobile-db';
import * as Crypto from 'expo-crypto';

let sessionId: string | null = null;

async function getSessionId(): Promise<string> {
  if (!sessionId) {
    sessionId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}`
    );
  }
  return sessionId;
}

export async function trackMobileEvent(
  eventType: string,
  eventName: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const sid = await getSessionId();
    const db = createMobileDbAdapter();
    await db.run(
      `INSERT INTO _analytics (event_type, event_name, metadata, session_id, platform, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        eventName,
        JSON.stringify({ ...metadata, sessionId: sid }),
        sid,
        'android',
        new Date().toISOString(),
      ]
    );
  } catch {
    // Analytics should never block the app
  }
}

export async function getMobileAnalyticsStats(): Promise<{
  totalEvents: number;
  sessions: number;
  syncEvents: number;
  lastActivity: string | null;
}> {
  try {
    const db = createMobileDbAdapter();
    const [total, sessions, syncs, last] = await Promise.all([
      db.get<{ count: number }>(`SELECT COUNT(*) as count FROM _analytics`),
      db.get<{ count: number }>(`SELECT COUNT(DISTINCT session_id) as count FROM _analytics WHERE event_type = 'session'`),
      db.get<{ count: number }>(`SELECT COUNT(*) as count FROM _analytics WHERE event_type = 'sync'`),
      db.get<{ created_at: string }>(`SELECT created_at FROM _analytics ORDER BY created_at DESC LIMIT 1`),
    ]);

    return {
      totalEvents: total?.count ?? 0,
      sessions: sessions?.count ?? 0,
      syncEvents: syncs?.count ?? 0,
      lastActivity: last?.created_at ?? null,
    };
  } catch {
    return { totalEvents: 0, sessions: 0, syncEvents: 0, lastActivity: null };
  }
}
