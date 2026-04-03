const { app, BrowserWindow, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');
const url = require('url');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

// Environment configuration
const isDev = process.argv.includes('--dev');
const FRONTEND_URL = process.env.NEXUS_FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.NEXUS_BACKEND_URL || 'http://localhost:4000';
const PRODUCTION_URL = process.env.NEXUS_PROD_URL || 'https://klypso.in';

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Nexus ERP',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    show: false,
    backgroundColor: '#f8fafc',
  });

  // Load the app
  const startUrl = isDev
    ? FRONTEND_URL
    : url.format({
        pathname: path.join(__dirname, '..', 'frontend', '.next', 'server', 'app', 'index.html'),
        protocol: 'file:',
        slashes: true,
      });

  const productionUrl = isDev ? FRONTEND_URL : PRODUCTION_URL;

  // CLOUDFLARE BLOCK FIX: Cloudflare Bot Fight Mode blocks explicit "Electron" user agents.
  // We mock a standard Chrome Windows user agent to allow the XHR requests through.
  mainWindow.webContents.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  mainWindow.loadURL(productionUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create a simple tray icon (16x16 transparent)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGCSURBVDiNpZMxSwNBEIXfu0QCQRFBsLCwsLOxsbez9g+wsrK0tbC0svIP8A+wsLS1tLOwsLC2tbC1sLawsrG0tbC1sLaQAAFBEEQUv7nw7O3OLkYl6I95M/vmzZu9nZ1VVRV5PB6PxxOGYYjBYDDg8Xg8Hk8L8Pl8Pp/Px+v1+nk8Ho/H4wHg9/v9fr+fz+fz8fl8Pl6v1wPg8/l8fr+fz+fz8fl8Pm63+4bfMAzD4/F4+b1eL4/H4+X1er08Ho+X2+32cLvdbi6Xy8XpdDqYTCYTg8FgIpPJZAaDwUQgEAgYDAYThmFQq9UqlUqlUigUKuVyuUqlUqlSqVSqVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCpVKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpVCqVSpVKpVKpVCpVKpVKpVKhUKhUKpVKpVKhUKhUKpVKpVKhUKhUKpVKpVKhUKhUKpVKpVKhUKhUKpVKpVKhUKhUKhUKhUKhUKhUKpVKpVL9VSpJKj0ej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px+PxeDwej8fj8Xg8Ho/H4PF5/xgX4A/Qd1jMAAAAASUVORK5CYII='
  );

  tray = new Tray(icon);
  tray.setToolTip('Nexus ERP');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Nexus ERP',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL('https://klypso.in/portal/dashboard');
        }
      }
    },
    {
      label: 'Inventory',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL('https://klypso.in/portal/inventory');
        }
      }
    },
    {
      label: 'Accounting',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL('https://klypso.in/portal/accounting');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { type: 'separator' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            if (mainWindow) {
              mainWindow.setAlwaysOnTop(menuItem.checked);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.klypso.in')
        },
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Nexus ERP',
              message: 'Nexus ERP v1.0.0',
              detail: 'Klypso Nexus ERP - Enterprise Resource Planning\nCopyright © 2024 Klypso Technologies'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation to external sites
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'https://klypso.in' && parsedUrl.origin !== 'http://localhost:3000') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});
