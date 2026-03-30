const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { isDev } = require('./electron-isdev');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
        icon: path.join(__dirname, '../public/icon.png'),
        show: false,
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('[ELECTRON] Main window ready and shown');
    });

    // Load the app
    if (isDev) {
        // In development, load from Next.js dev server
        mainWindow.loadURL('http://localhost:3000/portal');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load from Next.js build output
        mainWindow.loadFile(path.join(__dirname, '../.next/server/pages/index.html'));
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });
});

// Build menu
const menuTemplate = [
    {
        label: 'Nexus ERP',
        submenu: [
            { label: 'About Nexus ERP', role: 'about' },
            { type: 'separator' },
            { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
        ],
    },
    {
        label: 'Edit',
        submenu: [
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
            { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
            { type: 'separator' },
            { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
            { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
            { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
            { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        ],
    },
    {
        label: 'View',
        submenu: [
            { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
            { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
            { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
            { type: 'separator' },
            { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
            { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
            { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
            { type: 'separator' },
            { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' },
        ],
    },
    {
        label: 'Window',
        submenu: [
            { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
            { label: 'Maximize', click: () => {
                if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize();
                } else {
                    mainWindow.maximize();
                }
            }},
            { type: 'separator' },
            { label: 'Always on Top', type: 'checkbox', click: (menuItem) => {
                mainWindow.setAlwaysOnTop(menuItem.checked);
            }},
        ],
    },
    {
        label: 'Help',
        submenu: [
            { label: 'Documentation', click: () => shell.openExternal('https://klypso.in/docs') },
            { label: 'Report Issue', click: () => shell.openExternal('https://github.com/Adityavanjre/nexus-erp/issues') },
        ],
    },
];

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
    createWindow();

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

process.on('uncaughtException', (error) => {
    console.error('[ELECTRON ERROR] Uncaught Exception:', error);
    app.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[ELECTRON ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});