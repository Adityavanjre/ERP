import type { DBAdapter } from '@nexus/sync-engine';
import { randomUUID } from 'crypto';

export class DesktopAnalytics {
  private sessionId: string;
  private db: DBAdapter;

  constructor(db: DBAdapter) {
    this.db = db;
    this.sessionId = randomUUID();
  }

  async trackEvent(eventType: string, eventName: string, metadata: Record<string, unknown> = {}): Promise<void> {
    try {
      await this.db.run(
        `INSERT INTO _analytics (event_type, event_name, metadata, session_id, platform, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          eventType,
          eventName,
          JSON.stringify({ ...metadata, sessionId: this.sessionId }),
          this.sessionId,
          'windows',
          new Date().toISOString(),
        ]
      );
    } catch {
      // Analytics should never block the app
    }
  }

  async getEvents(since?: string): Promise<Array<{
    event_type: string;
    event_name: string;
    metadata: string;
    created_at: string;
  }>> {
    if (since) {
      return this.db.all(
        `SELECT event_type, event_name, metadata, created_at FROM _analytics WHERE created_at > ? ORDER BY created_at ASC`,
        [since]
      );
    }
    return this.db.all(
      `SELECT event_type, event_name, metadata, created_at FROM _analytics ORDER BY created_at ASC LIMIT 1000`
    );
  }

  async getStats(): Promise<{
    totalEvents: number;
    sessions: number;
    syncEvents: number;
    lastActivity: string | null;
  }> {
    const [total, sessions, syncs, last] = await Promise.all([
      this.db.get<{ count: number }>(`SELECT COUNT(*) as count FROM _analytics`),
      this.db.get<{ count: number }>(`SELECT COUNT(DISTINCT session_id) as count FROM _analytics WHERE event_type = 'session'`),
      this.db.get<{ count: number }>(`SELECT COUNT(*) as count FROM _analytics WHERE event_type = 'sync'`),
      this.db.get<{ created_at: string }>(`SELECT created_at FROM _analytics ORDER BY created_at DESC LIMIT 1`),
    ]);

    return {
      totalEvents: total?.count ?? 0,
      sessions: sessions?.count ?? 0,
      syncEvents: syncs?.count ?? 0,
      lastActivity: last?.created_at ?? null,
    };
  }
}
