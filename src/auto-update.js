const { autoUpdater } = require('electron-updater');
const { app } = require('electron');

function setupAutoUpdater(mainWindow) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-message', 'Checking for launcher updates...');
  }

  autoUpdater.on('update-available', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-message', 'Updating launcher...');
    }
  });

  autoUpdater.on('download-progress', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const percent = Math.round(info.percent || 0);
      mainWindow.webContents.send('download-progress', percent);
      mainWindow.webContents.send('status-message', 'Downloading launcher update...');
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-message', 'Launcher update downloaded. It will install on exit.');
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('Launcher auto-update error:', error);
  });

  autoUpdater.checkForUpdatesAndNotify();

  if (process.platform !== 'win32') {
    // TODO: add platform-specific signing/notarization settings for macOS/Linux if needed.
  }
}

module.exports = { setupAutoUpdater };
