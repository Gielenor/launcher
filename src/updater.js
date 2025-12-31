const fs = require('fs');
const https = require('https');
const path = require('path');
const { spawn } = require('child_process');
const { app, dialog } = require('electron');

const jarFileNamePrefix = 'Gielenor_v';
const jarFileExtension = '.jar';
const latestReleaseUrl = 'https://api.github.com/repos/Gielenor/client/releases/latest';

function getClientDirectory() {
  const clientDir = path.join(app.getPath('userData'), 'Gielenor', 'client');
  fs.mkdirSync(clientDir, { recursive: true });
  return clientDir;
}

function getJreBasePath() {
  // In packaged builds the JRE lives under process.resourcesPath; in dev we use src/.
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, 'jre');
}

function getJrePath() {
  const jreBasePath = getJreBasePath();
  const candidates = [];

  if (process.platform === 'win32') {
    candidates.push(path.join(jreBasePath, 'win'));
  } else if (process.platform === 'darwin') {
    candidates.push(path.join(jreBasePath, 'mac'));
  } else {
    candidates.push(path.join(jreBasePath, 'linux'));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function getJavaExecutablePath() {
  const jrePath = getJrePath();
  if (process.platform === 'win32') {
    return path.join(jrePath, 'bin', 'java.exe');
  }
  return path.join(jrePath, 'bin', 'java');
}

function compareVersions(a, b) {
  const aParts = String(a).split('.').map((part) => Number(part));
  const bParts = String(b).split('.').map((part) => Number(part));
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i += 1) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum > bNum) return 1;
    if (aNum < bNum) return -1;
  }
  return 0;
}

function listLocalClientJars() {
  const clientDir = getClientDirectory();
  const files = fs.readdirSync(clientDir);
  return files.filter((file) => file.startsWith(jarFileNamePrefix) && file.endsWith(jarFileExtension));
}

function getLocalClientVersion() {
  const jars = listLocalClientJars();
  if (jars.length === 0) return null;

  let highest = null;
  for (const jar of jars) {
    const version = jar
      .replace(jarFileNamePrefix, '')
      .replace(jarFileExtension, '');
    if (!highest || compareVersions(version, highest) > 0) {
      highest = version;
    }
  }
  return highest;
}

function getLocalClientJarPath() {
  const version = getLocalClientVersion();
  if (!version) return null;
  const jarName = `${jarFileNamePrefix}${version}${jarFileExtension}`;
  return path.join(getClientDirectory(), jarName);
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const request = https.get(
      latestReleaseUrl,
      {
        headers: {
          'User-Agent': 'Gielenor-Launcher'
        }
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(`GitHub API error: ${response.statusCode}`));
          }
        });
      }
    );

    request.on('error', reject);
    request.setTimeout(15000, () => {
      request.destroy(new Error('GitHub API timeout'));
    });
  });
}

function downloadJar(downloadUrl, destinationPath, onProgress, abortSignal) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destinationPath);
    const request = https.get(
      downloadUrl,
      {
        headers: {
          'User-Agent': 'Gielenor-Launcher'
        },
        signal: abortSignal
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          fileStream.close(() => {
            fs.unlink(destinationPath, () => {
              downloadJar(response.headers.location, destinationPath, onProgress, abortSignal)
                .then(resolve)
                .catch(reject);
            });
          });
          return;
        }

        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        const totalBytes = Number(response.headers['content-length'] || 0);
        let receivedBytes = 0;

        response.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.min(100, Math.floor((receivedBytes / totalBytes) * 100));
            onProgress(percent);
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            onProgress(100);
            resolve();
          });
        });
      }
    );

    request.on('error', (error) => {
      fileStream.close(() => {
        fs.unlink(destinationPath, () => reject(error));
      });
    });

    fileStream.on('error', (error) => {
      request.destroy();
      fs.unlink(destinationPath, () => reject(error));
    });
  });
}

function runClient(jarPath) {
  const javaPath = getJavaExecutablePath();
  const child = spawn(javaPath, ['-jar', jarPath], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

async function handleApiFailure() {
  const localJarPath = getLocalClientJarPath();
  if (localJarPath && fs.existsSync(localJarPath)) {
    runClient(localJarPath);
    return;
  }
  dialog.showErrorBox('Erro', 'Nao foi possivel verificar atualizacoes e nenhum client local foi encontrado.');
}

async function checkForUpdatesAndRunClient(mainWindow) {
  const localVersion = getLocalClientVersion();
  const localJarPath = getLocalClientJarPath();
  const sendStatus = (message) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-message', message);
    }
  };
  const sendPhase = (message) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('phase-message', message);
    }
  };

  let latestVersion = null;
  let downloadUrl = null;
  let expectedJarName = null;

  try {
    sendPhase('Client update');
    sendStatus('Checking for game updates...');
    const release = await fetchLatestRelease();
    latestVersion = release.tag_name;
    expectedJarName = `${jarFileNamePrefix}${latestVersion}${jarFileExtension}`;
    const asset = (release.assets || []).find((item) => item.name === expectedJarName);
    if (!asset) {
      throw new Error('Asset do client nao encontrado no release.');
    }
    downloadUrl = asset.browser_download_url;
  } catch (error) {
    console.log(error);
    await handleApiFailure();
    return;
  }

  const needsUpdate = !localVersion || compareVersions(latestVersion, localVersion) > 0;
  if (!needsUpdate) {
    if (localJarPath) {
      sendPhase('Launching client');
      sendStatus('Starting client...');
      runClient(localJarPath);
      return;
    }
    await handleApiFailure();
    return;
  }

  if (!mainWindow) {
    dialog.showErrorBox('Erro', 'Janela de progresso nao inicializada.');
    return;
  }

  mainWindow.show();
  sendPhase('Client update');
  sendStatus('Downloading game client...');

  const clientDir = getClientDirectory();
  const destinationPath = path.join(clientDir, expectedJarName);
  const controller = new AbortController();

  const onProgress = (percent) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', percent);
    }
  };

  const onCancel = () => {
    controller.abort();
  };

  mainWindow.once('close', onCancel);

  try {
    await downloadJar(downloadUrl, destinationPath, onProgress, controller.signal);
    mainWindow.removeListener('close', onCancel);
    if (!mainWindow.isDestroyed()) {
      sendPhase('Launching client');
      sendStatus('Starting core classes...');
      mainWindow.close();
    }
    runClient(destinationPath);
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    console.log(error);
    if (!mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    const fallbackJar = localJarPath;
    if (fallbackJar && fs.existsSync(fallbackJar)) {
      runClient(fallbackJar);
      return;
    }
    dialog.showErrorBox('Erro', 'Falha ao baixar o client e nenhum client local foi encontrado.');
  } finally {
    mainWindow.removeListener('close', onCancel);
  }
}

module.exports = {
  checkForUpdatesAndRunClient,
  compareVersions,
  getClientDirectory,
  getJavaExecutablePath,
  getJrePath,
  getLocalClientJarPath,
  getLocalClientVersion
};
