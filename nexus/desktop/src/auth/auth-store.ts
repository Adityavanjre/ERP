import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const TOKEN_FILE = 'nexus-token.json';

export class AuthStore {
  private tokenPath: string;

  constructor() {
    this.tokenPath = path.join(app.getPath('userData'), TOKEN_FILE);
  }

  getToken(): string | null {
    try {
      if (!fs.existsSync(this.tokenPath)) return null;
      const data = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
      return data.token || null;
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    fs.writeFileSync(this.tokenPath, JSON.stringify({ token, updatedAt: new Date().toISOString() }));
  }

  clearToken(): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
    } catch {
      // Ignore
    }
  }
}
