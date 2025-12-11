const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true, // Hide default menu bar
  });

  // Check if we are in dev mode (env variable can be set in scripts)
  const isDev = process.env.npm_lifecycle_event === 'electron:dev';

  if (isDev) {
    // In development, load from Vite dev server
    win.loadURL('http://localhost:5173');
    // Open DevTools optionally
    // win.webContents.openDevTools();
  } else {
    // In production, load the built html file
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
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