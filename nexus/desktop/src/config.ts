import * as path from 'path';
import { app } from 'electron';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env if it exists in the desktop root
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export type AuthMode = 'LOCAL' | 'HYBRID' | 'CLOUD';

export const config = {
  // Default to LOCAL for local-first development
  AUTH_MODE: (process.env.AUTH_MODE as AuthMode) || 'LOCAL',
  
  // Future cloud API URL
  CLOUD_API_URL: process.env.CLOUD_API_URL || 'https://klypso.in/portal/api/v1',
};
