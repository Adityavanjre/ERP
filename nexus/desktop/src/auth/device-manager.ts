import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

let deviceId: string | null = null;
let deviceName: string | null = null;

export function getDeviceId(): string {
  if (deviceId) return deviceId;

  const dataPath = app.getPath('userData');
  const deviceFilePath = path.join(dataPath, 'device-identity.json');

  if (fs.existsSync(deviceFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(deviceFilePath, 'utf8'));
      if (data.deviceId) {
        deviceId = data.deviceId;
        deviceName = data.deviceName || os.hostname();
        return deviceId!;
      }
    } catch (e) {
      console.error('Failed to read device-identity.json', e);
    }
  }

  deviceId = crypto.randomUUID();
  deviceName = os.hostname();
  
  fs.writeFileSync(deviceFilePath, JSON.stringify({ deviceId, deviceName }, null, 2), 'utf8');
  
  return deviceId;
}

export function getDeviceName(): string {
  if (!deviceName) getDeviceId();
  return deviceName!;
}
