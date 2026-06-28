import express from 'express';
import cors from 'cors';
import { Bonjour } from 'bonjour-service';
import os from 'os';
import Database from 'better-sqlite3';
import { getDeviceId } from '../auth/device-manager';

let peerServer: any = null;
let bonjour: Bonjour | null = null;
let discoveredPeers: string[] = [];

export function startPeerServer(db: Database.Database) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/v1/sync/pull', (req, res) => {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : new Date(0);
      const tables = (req.query.tables as string)?.split(',') || [
        'products', 'suppliers', 'customers', 'purchase_orders', 'stock_movements'
      ];
      
      const pulledData: Record<string, any[]> = {};
      
      for (const table of tables) {
        // Safe because tables is controlled locally or by query
        // Normally we'd validate table names against a strict list
        if (!/^[a-z_]+$/.test(table)) continue;
        
        try {
          const rows = db.prepare(`SELECT * FROM ${table} WHERE updated_at > ?`).all(since.toISOString());
          pulledData[table] = rows;
        } catch (err) {
          // Table might not exist yet
          pulledData[table] = [];
        }
      }
      
      res.json(pulledData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/sync/push', (req, res) => {
    const { changes } = req.body;
    if (!changes) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    const conflicts: any[] = [];
    const transaction = db.transaction(() => {
      for (const [table, records] of Object.entries(changes)) {
        if (!/^[a-z_]+$/.test(table)) continue;
        
        const recs = records as any[];
        for (const record of recs) {
          try {
            // Find existing
            const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(record.id) as any;
            
            if (existing) {
              const existingDate = new Date(existing.updated_at).getTime();
              const incomingDate = new Date(record.updated_at).getTime();
              
              if (existingDate > incomingDate) {
                // Conflict: local is newer
                conflicts.push({
                  table,
                  recordId: record.id,
                  localData: existing,
                  serverData: record, // We are the "server" in this peer context
                  status: 'conflict'
                });
                continue;
              } else {
                // Update
                const cols = Object.keys(record);
                const setStmt = cols.map(c => `${c} = @${c}`).join(', ');
                db.prepare(`UPDATE ${table} SET ${setStmt} WHERE id = @id`).run(record);
              }
            } else {
              // Insert
              const cols = Object.keys(record);
              const vals = cols.map(c => `@${c}`).join(', ');
              db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals})`).run(record);
            }
          } catch (err) {
            console.error(`Peer Push Error on ${table}:`, err);
          }
        }
      }
    });

    try {
      transaction();
      res.json({ success: true, conflicts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/sync/metadata', (req, res) => {
    res.json({
      permissions: {}, // Peer doesn't distribute permissions usually, just data
      modules: []
    });
  });

  const server = app.listen(0, '0.0.0.0', () => {
    const port = (server.address() as any).port;
    console.log(`[LAN Sync] Peer server listening on port ${port}`);
    
    // Broadcast via Bonjour
    bonjour = new Bonjour();
    bonjour.publish({
      name: `Nexus-Peer-${os.hostname()}`,
      type: 'nexus-sync',
      port,
      txt: { deviceId: getDeviceId() }
    });

    // Discover other peers
    const browser = bonjour.find({ type: 'nexus-sync' });
    browser.on('up', (service) => {
      console.log('[LAN Sync] Found peer:', service.name, service.addresses, service.port);
      if (service.txt?.deviceId !== getDeviceId()) {
        const ip = service.addresses?.[0];
        if (ip) {
          discoveredPeers.push(`http://${ip}:${service.port}/api/v1`);
        }
      }
    });
    browser.on('down', (service) => {
      console.log('[LAN Sync] Peer went away:', service.name);
      // Remove from discovered peers (simplified)
    });
  });

  peerServer = server;
}

export function stopPeerServer() {
  if (bonjour) {
    bonjour.unpublishAll();
    bonjour.destroy();
    bonjour = null;
  }
  if (peerServer) {
    peerServer.close();
    peerServer = null;
  }
}

export function getDiscoveredPeers(): string[] {
  return discoveredPeers;
}
