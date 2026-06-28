import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(desktopDir, '..', 'frontend');
const standaloneRoot = path.join(frontendDir, '.next', 'standalone', 'nexus');
const standaloneFrontendDir = path.join(standaloneRoot, 'frontend');
const staticDir = path.join(frontendDir, '.next', 'static');
const publicDir = path.join(frontendDir, 'public');
const bundleDir = path.join(desktopDir, 'bundled-frontend');
const iconSource = path.join(frontendDir, 'src', 'app', 'favicon.ico');
const iconDestDir = path.join(desktopDir, 'build');
const iconDest = path.join(iconDestDir, 'icon.ico');
const excludedPublicFiles = new Set([
  'nexus-desktop-setup.exe',
  'nexus-desktop-setup.exe.blockmap',
  'nexus-gateway.apk',
]);

if (!fs.existsSync(path.join(standaloneFrontendDir, 'server.js'))) {
  throw new Error(
    `Frontend standalone output not found at ${standaloneFrontendDir}. Run "npm --prefix .. run build -w frontend" first.`,
  );
}

const standaloneNodeModules = path.join(frontendDir, '.next', 'standalone', 'node_modules');
fs.rmSync(bundleDir, { recursive: true, force: true });
fs.mkdirSync(bundleDir, { recursive: true });
fs.cpSync(standaloneRoot, path.join(bundleDir, 'nexus'), { recursive: true });
if (fs.existsSync(standaloneNodeModules)) {
  fs.cpSync(standaloneNodeModules, path.join(bundleDir, 'node_modules'), { recursive: true });
}

fs.mkdirSync(path.join(bundleDir, 'nexus', 'frontend', '.next'), { recursive: true });
fs.cpSync(staticDir, path.join(bundleDir, 'nexus', 'frontend', '.next', 'static'), { recursive: true });
fs.cpSync(publicDir, path.join(bundleDir, 'nexus', 'frontend', 'public'), {
  recursive: true,
  filter: (source) => {
    const basename = path.basename(source);
    return !excludedPublicFiles.has(basename);
  },
});

fs.mkdirSync(iconDestDir, { recursive: true });
fs.copyFileSync(iconSource, iconDest);

const loadingSource = path.join(desktopDir, 'src', 'loading.html');
const loadingDest = path.join(desktopDir, 'dist', 'loading.html');

if (fs.existsSync(loadingSource)) {
  fs.mkdirSync(path.dirname(loadingDest), { recursive: true });
  fs.copyFileSync(loadingSource, loadingDest);
  console.log(`Loading screen synced to ${loadingDest}`);
}

console.log(`Bundled frontend copied to ${bundleDir}`);
console.log(`Desktop icon synced to ${iconDest}`);
