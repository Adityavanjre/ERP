import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const SESSION_FILE = 'nexus-local-session.json';

export interface LocalSessionRecord {
  mode: 'offline';
  userId: string;
  fullName: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  industry: string;
  createdAt: string;
  lastOpenedAt: string;
}

export class LocalSessionStore {
  private readonly sessionPath: string;

  constructor() {
    this.sessionPath = path.join(app.getPath('userData'), SESSION_FILE);
  }

  get(): LocalSessionRecord | null {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        return null;
      }

      return JSON.parse(fs.readFileSync(this.sessionPath, 'utf8')) as LocalSessionRecord;
    } catch {
      return null;
    }
  }

  set(session: LocalSessionRecord): LocalSessionRecord {
    const nextSession = {
      ...session,
      lastOpenedAt: new Date().toISOString(),
    };

    fs.writeFileSync(this.sessionPath, JSON.stringify(nextSession, null, 2));
    return nextSession;
  }

  clear(): void {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
      }
    } catch {
      // Ignore cleanup failures.
    }
  }
}
