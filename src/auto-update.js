const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
const log = require('electron-log');
const { PHASE, STATUS } = require('./status-messages');

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

function runLauncherAutoUpdate(mainWindow) {
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'warn';
  autoUpdater.logger.transports.file.fileName = 'main.txt';
  autoUpdater.logger.transports.console.level = 'info';

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  log.info(`Launcher version: ${app.getVersion()}`);

  const isDev = !app.isPackaged;
  if (isDev && !process.env.FORCE_LAUNCHER_UPDATE) {
    log.info('Auto-updater disabled in dev. Set FORCE_LAUNCHER_UPDATE=1 to enable.');
    return Promise.resolve({ status: 'skipped' });
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finalize = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const onChecking = () => {
      log.info('checking-for-update');
      sendPhase(mainWindow, PHASE.LAUNCHER_UPDATE);
      sendStatus(mainWindow, STATUS.CHECKING_LAUNCHER_UPDATES);
    };

    const onAvailable = (info) => {
      log.info('update-available', info);
      sendPhase(mainWindow, PHASE.LAUNCHER_UPDATE);
      sendStatus(mainWindow, STATUS.DOWNLOADING_LAUNCHER_UPDATE);
    };

    const onNotAvailable = (info) => {
      log.info('update-not-available', info);
      sendPhase(mainWindow, PHASE.LAUNCHER_UPDATE);
      sendStatus(mainWindow, STATUS.LAUNCHER_UP_TO_DATE);
      finalize({ status: 'no-update' });
    };

    const onError = (error) => {
      log.error('auto-update error', error);
      sendPhase(mainWindow, PHASE.LAUNCHER_UPDATE);
      sendStatus(mainWindow, STATUS.LAUNCHER_UPDATE_ERROR);
      finalize({ status: 'error', error });
    };

    const onProgress = (progress) => {
      const percent = Math.round(progress.percent || 0);
      log.info('download-progress', percent, progress.transferred, progress.total);
      sendPhase(mainWindow, PHASE.LAUNCHER_UPDATE);
      sendProgress(mainWindow, percent);
      sendStatus(mainWindow, STATUS.DOWNLOADING_LAUNCHER_UPDATE);
    };

    const onDownloaded = (info) => {
      log.info('update-downloaded', info);
      sendPhase(mainWindow, PHASE.LAUNCHER_UPDATE);
      sendStatus(mainWindow, STATUS.LAUNCHER_UPDATE_DOWNLOADED);
      finalize({ status: 'downloaded', info });
    };

    // Flow: check -> download -> install on exit.
    autoUpdater.on('checking-for-update', onChecking);
    autoUpdater.on('update-available', onAvailable);
    autoUpdater.on('update-not-available', onNotAvailable);
    autoUpdater.on('error', onError);
    autoUpdater.on('download-progress', onProgress);
    autoUpdater.on('update-downloaded', onDownloaded);

    sendPhase(mainWindow, PHASE.LAUNCHER_UPDATE);
    sendStatus(mainWindow, STATUS.CHECKING_LAUNCHER_UPDATES);
    autoUpdater.checkForUpdatesAndNotify();
  });
}

function quitAndInstallLauncher() {
  autoUpdater.quitAndInstall();
}

module.exports = { runLauncherAutoUpdate, quitAndInstallLauncher };
