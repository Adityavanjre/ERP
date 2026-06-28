import { app } from 'electron';
import { execFileSync, spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';

export class LocalFrontendServer {
  private child: ChildProcess | null = null;
  private portalBaseUrl: string | null = null;

  constructor(private readonly backendUrl?: string) {}

  async start(): Promise<string> {
    if (this.portalBaseUrl) {
      return this.portalBaseUrl;
    }

    const frontendRoot = resolveFrontendRoot();
    const serverEntry = path.join(frontendRoot, 'server.js');

    if (!fs.existsSync(serverEntry)) {
      throw new Error(`Bundled frontend entrypoint not found at ${serverEntry}`);
    }

    const port = await findFreePort(3130);
    const processCwd = normalizePathForWindowsRuntime(frontendRoot);
    const processServerEntry = normalizePathForWindowsRuntime(serverEntry);

    const child = spawn(process.execPath, [processServerEntry], {
      cwd: processCwd,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        HOSTNAME: '0.0.0.0',
        KLYPSO_BACKEND_URL: this.backendUrl || process.env.KLYPSO_BACKEND_URL || 'https://nexus-backend-3ukg.onrender.com',
        NODE_ENV: 'production',
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.unref();
    this.child = child;

    const portalBaseUrl = `http://127.0.0.1:${port}/portal`;

    try {
      await waitForHttpReady(`${portalBaseUrl}/login`, child);
    } catch (error) {
      this.stop();
      throw error;
    }

    this.portalBaseUrl = portalBaseUrl;
    return portalBaseUrl;
  }

  stop() {
    if (this.child && !this.child.killed) {
      this.child.kill();
    }

    this.child = null;
    this.portalBaseUrl = null;
  }
}

function resolveFrontendRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'nexus', 'frontend');
  }

  const bundledFrontend = path.resolve(__dirname, '..', 'bundled-frontend', 'nexus', 'frontend');
  if (fs.existsSync(path.join(bundledFrontend, 'server.js'))) {
    return bundledFrontend;
  }

  return path.resolve(__dirname, '..', '..', 'frontend', '.next', 'standalone', 'nexus', 'frontend');
}

function normalizePathForWindowsRuntime(targetPath: string): string {
  if (!process.execPath.endsWith('.exe') || !targetPath.startsWith('/mnt/')) {
    return targetPath;
  }

  try {
    return execFileSync('wslpath', ['-w', targetPath], { encoding: 'utf8' }).trim();
  } catch {
    return targetPath;
  }
}

async function findFreePort(preferredPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', () => {
      server.close();
      resolve(findFreePort(0));
    });

    server.once('listening', () => {
      const address = server.address();
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        if (!address || typeof address === 'string') {
          reject(new Error('Unable to determine local frontend port'));
          return;
        }

        resolve(address.port);
      });
    });

    server.listen(preferredPort, '0.0.0.0');
  });
}

async function waitForHttpReady(url: string, child: ChildProcess): Promise<void> {
  const timeoutAt = Date.now() + 90000; // Increased to 90s for reliability
  const logPath = path.join(app.getPath('userData'), 'frontend-startup.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  logStream.write(`\n--- Startup Attempt: ${new Date().toISOString()} ---\n`);
  
  if (child.stdout) {
    child.stdout.on('data', (data) => logStream.write(`[STDOUT] ${data}`));
  }
  if (child.stderr) {
    child.stderr.on('data', (data) => logStream.write(`[STDERR] ${data}`));
  }

  while (Date.now() < timeoutAt) {
    const exited = child.exitCode !== null;
    if (exited) {
      logStream.write(`[ERROR] Server exited with code ${child.exitCode}\n`);
      logStream.end();
      throw new Error(`Bundled frontend server exited before becoming ready (code ${child.exitCode ?? 'unknown'}). Check logs at ${logPath}`);
    }

    const ready = await canReach(url);
    if (ready) {
      logStream.write(`[SUCCESS] Server ready at ${url}\n`);
      logStream.end();
      return;
    }

    await delay(500);
  }

  logStream.write(`[TIMEOUT] Server failed to become ready within 90s\n`);
  logStream.end();
  throw new Error(`Timed out while waiting for the bundled frontend server to start. Check logs at ${logPath}`);
}

async function canReach(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve((response.statusCode || 500) < 500);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(2000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
