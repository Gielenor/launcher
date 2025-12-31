const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
const log = require('electron-log');

function sendStatus(mainWindow, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-message', message);
  }
}

function sendPhase(mainWindow, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('phase-message', message);
  }
}

function sendProgress(mainWindow, percent) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', percent);
  }
}

function setupAutoUpdater(mainWindow) {
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.logger.transports.console.level = 'info';

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  log.info(`Launcher version: ${app.getVersion()}`);

  const isDev = !app.isPackaged;
  if (isDev && !process.env.FORCE_LAUNCHER_UPDATE) {
    log.info('Auto-updater disabled in dev. Set FORCE_LAUNCHER_UPDATE=1 to enable.');
    return;
  }

  // Flow: check -> download -> install on exit.
  autoUpdater.on('checking-for-update', () => {
    log.info('checking-for-update');
    sendPhase(mainWindow, 'Launcher update');
    sendStatus(mainWindow, 'Checking for launcher updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('update-available', info);
    sendPhase(mainWindow, 'Launcher update');
    sendStatus(mainWindow, 'Downloading launcher update...');
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('update-not-available', info);
    sendPhase(mainWindow, 'Launcher update');
    sendStatus(mainWindow, 'Launcher is up to date.');
  });

  autoUpdater.on('error', (error) => {
    log.error('auto-update error', error);
    sendPhase(mainWindow, 'Launcher update');
    sendStatus(mainWindow, 'Launcher update error. See logs.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent || 0);
    log.info('download-progress', percent, progress.transferred, progress.total);
    sendPhase(mainWindow, 'Launcher update');
    sendProgress(mainWindow, percent);
    sendStatus(mainWindow, 'Downloading launcher update...');
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('update-downloaded', info);
    sendPhase(mainWindow, 'Launcher update');
    sendStatus(mainWindow, 'Launcher update downloaded. It will install on exit.');
  });

  sendPhase(mainWindow, 'Launcher update');
  sendStatus(mainWindow, 'Checking for launcher updates...');
  autoUpdater.checkForUpdates();
}

module.exports = { setupAutoUpdater };
