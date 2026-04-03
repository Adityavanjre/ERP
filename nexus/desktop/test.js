const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  console.log('App is ready!');
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('data:text/html,<h1>Hello from Electron!</h1>');
  console.log('Window created!');
});

app.on('window-all-closed', () => {
  console.log('Window closed');
  app.quit();
});
