const path = require('path');
const { app, BrowserWindow } = require('electron');
const { checkForUpdatesAndRunClient } = require('./updater');
const { runLauncherAutoUpdate, quitAndInstallLauncher } = require('./auto-update');
const { getAppIconPath } = require('./paths');
const { PHASE, STATUS } = require('./status-messages');

let mainWindow = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const iconPath = getAppIconPath();

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 320,
    height: 380,
    resizable: false,
    frame: false,
    center: true,
    show: false,
    backgroundColor: '#111111',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function runGameClientUpdateAndLaunch(windowRef) {
  await checkForUpdatesAndRunClient(windowRef);
}

app.whenReady().then(async () => {
  createWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('phase-message', PHASE.STARTING);
    mainWindow.webContents.send('status-message', STATUS.OPENING_LAUNCHER);
  }

  if (process.platform === 'win32') {
    app.setAsDefaultProtocolClient('gielenor');
  }

  // 1) Launcher auto-update runs first.
  const updateResult = await runLauncherAutoUpdate(mainWindow);
  if (updateResult.status === 'downloaded') {
    quitAndInstallLauncher();
    return;
  }

  // 2) No launcher update (or error) -> continue with game client flow.
  await runGameClientUpdateAndLaunch(mainWindow);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Captura URLs abertas com "gielenor://"
app.on('open-url', (event, url) => {
  event.preventDefault();
  createWindow(url); // Abre a janela com base no URL recebido
});
