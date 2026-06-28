import type { TableName, ConflictRecord, ConflictResolution, PushResult } from '../types/sync.types';
import type { DBAdapter } from '../engine/change-tracker';

export class ConflictResolver {
  constructor(private db: DBAdapter) {}

  async recordConflict(
    table: TableName,
    recordId: string,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO _conflicts (table_name, record_id, local_data, server_data, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [table, recordId, JSON.stringify(localData), JSON.stringify(serverData)]
    );
    await this.db.run(
      `UPDATE ${table} SET _conflict = ? WHERE id = ?`,
      [JSON.stringify(serverData), recordId]
    );
  }

  async handleConflictResult(
    table: TableName,
    recordId: string,
    result: PushResult,
    localData: Record<string, unknown>
  ): Promise<void> {
    if (result.status === 'conflict' && result.serverData) {
      await this.recordConflict(table, recordId, localData, result.serverData);
    }
  }

  async getUnresolvedConflicts(): Promise<ConflictRecord[]> {
    return this.db.all<ConflictRecord>(
      `SELECT * FROM _conflicts WHERE resolved_at IS NULL ORDER BY created_at ASC`
    );
  }

  async getConflictCount(): Promise<number> {
    const row = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM _conflicts WHERE resolved_at IS NULL`
    );
    return row?.count ?? 0;
  }

  async resolveConflict(
    conflictId: number,
    resolution: ConflictResolution,
    mergedData?: Record<string, unknown>
  ): Promise<void> {
    const conflict = await this.db.get<ConflictRecord>(
      `SELECT * FROM _conflicts WHERE id = ?`,
      [conflictId]
    );
    if (!conflict) throw new Error(`Conflict ${conflictId} not found`);

    let resolvedData: string;
    if (resolution === 'local_wins') {
      resolvedData = conflict.local_data;
    } else if (resolution === 'server_wins') {
      resolvedData = conflict.server_data;
    } else if (resolution === 'manual' && mergedData) {
      resolvedData = JSON.stringify(mergedData);
    } else {
      throw new Error('Invalid resolution or missing merged data for manual resolution');
    }

    const table = conflict.table_name as TableName;
    const recordId = conflict.record_id;

    await this.db.run(
      `UPDATE _conflicts SET resolution = ?, resolved_data = ?, resolved_at = datetime('now') WHERE id = ?`,
      [resolution, resolvedData, conflictId]
    );

    await this.db.run(
      `UPDATE ${table} SET _conflict = NULL, _dirty = 1, _last_modified = datetime('now') WHERE id = ?`,
      [recordId]
    );

    if (resolution === 'server_wins') {
      const serverRecord = JSON.parse(conflict.server_data) as Record<string, unknown>;
      const columns = Object.keys(serverRecord).filter(k => !k.startsWith('_'));
      const setClauses = columns.map(c => `${this.camelToSnake(c)} = ?`).join(', ');
      const values = columns.map(c => serverRecord[c]);
      await this.db.run(
        `UPDATE ${table} SET ${setClauses} WHERE id = ?`,
        [...values, recordId]
      );
    }
  }

  async resolveAllConflicts(resolution: ConflictResolution): Promise<number> {
    const conflicts = await this.getUnresolvedConflicts();
    for (const conflict of conflicts) {
      await this.resolveConflict(conflict.id!, resolution);
    }
    return conflicts.length;
  }

  async autoResolveConflicts(): Promise<number> {
    const conflicts = await this.getUnresolvedConflicts();
    let resolvedCount = 0;

    for (const conflict of conflicts) {
      try {
        const local = JSON.parse(conflict.local_data) as Record<string, unknown>;
        const server = JSON.parse(conflict.server_data) as Record<string, unknown>;
        
        // Merge strategy: Preserve server changes, apply local non-null changes
        const mergedData = { ...server };
        for (const [key, value] of Object.entries(local)) {
          if (!key.startsWith('_') && value !== null && value !== undefined) {
            // Keep local edits over server, unless it's a critical system field
            if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
              mergedData[key] = value;
            }
          }
        }

        await this.resolveConflict(conflict.id!, 'manual', mergedData);
        resolvedCount++;
      } catch (err) {
        console.error(`Failed to auto-resolve conflict ${conflict.id}:`, err);
      }
    }

    return resolvedCount;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
