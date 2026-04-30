/**
 * Electron main process — Gentle Gal PC 配布
 *
 * dev: VITE_DEV_SERVER_URL があればそれを開く（npm run electron:dev）
 * prod: dist/index.html を開く
 */

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// ウィンドウサイズは縦持ち推奨（仕様書より）
const WIN_WIDTH = 540;
const WIN_HEIGHT = 960;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
