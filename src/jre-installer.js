const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { createExtractorFromFile } = require('node-unrar-js');
const { getRuntimeBaseDir, getPlatformJreDir, getJavaExecutablePath } = require('./runtime-paths');
const { STATUS, formatStatus } = require('./status-messages');

const baseDownloadUrl = 'https://github.com/Gielenor/java-bin/releases/latest/download';

function sendStatus(mainWindow, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-message', message);
  }
}

function sendProgress(mainWindow, percent) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', percent);
  }
}

function getArchiveName() {
  if (process.platform === 'win32') return 'win.rar';
  if (process.platform === 'darwin') return 'mac.rar';
  return 'linux.rar';
}

function getPlatformLabel() {
  if (process.platform === 'win32') return 'Windows';
  if (process.platform === 'darwin') return 'macOS';
  return 'Linux';
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function downloadFileWithProgress(downloadUrl, destinationPath, onProgress) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destinationPath);
    const request = https.get(
      downloadUrl,
      {
        headers: {
          'User-Agent': 'Gielenor-Launcher',
          'Accept': 'application/octet-stream'
        }
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          fileStream.close(() => {
            fs.unlink(destinationPath, () => {
              downloadFileWithProgress(response.headers.location, destinationPath, onProgress)
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

function isRarFile(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    return buffer.slice(0, 4).toString('ascii') === 'Rar!';
  } catch (error) {
    return false;
  }
}

async function extractRar(archivePath, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });
  const extractor = await createExtractorFromFile({
    filepath: archivePath,
    targetPath: destinationDir
  });

  const list = extractor.getFileList();
  const fileHeaders = [...list.fileHeaders];
  if (fileHeaders.length === 0) {
    throw new Error('RAR archive is empty.');
  }

  const extracted = extractor.extract({});
  for (const _file of extracted.files) {
    // Consume iterator to avoid memory leaks in the native layer.
  }
}

function fixNestedRuntime(runtimeBase, platformDir) {
  const nested = path.join(platformDir, path.basename(platformDir));
  if (!fileExists(nested)) return;
  const entries = fs.readdirSync(nested);
  for (const entry of entries) {
    const src = path.join(nested, entry);
    const dest = path.join(platformDir, entry);
    fs.renameSync(src, dest);
  }
  fs.rmdirSync(nested, { recursive: true });
}

async function ensureJreInstalled(mainWindow) {
  const javaPath = getJavaExecutablePath();
  const platformLabel = getPlatformLabel();

  sendStatus(mainWindow, formatStatus(STATUS.CHECKING_JAVA_RUNTIME, { platform: platformLabel }));
  sendProgress(mainWindow, 0);

  if (fileExists(javaPath)) {
    sendStatus(mainWindow, formatStatus(STATUS.JAVA_RUNTIME_FOUND, { platform: platformLabel }));
    sendStatus(mainWindow, STATUS.STARTING_GAME);
    return javaPath;
  }

  const runtimeBase = getRuntimeBaseDir();
  const platformDir = getPlatformJreDir();
  fs.mkdirSync(runtimeBase, { recursive: true });

  const archiveName = getArchiveName();
  const downloadUrl = `${baseDownloadUrl}/${archiveName}`;
  const tempFile = path.join(os.tmpdir(), `gielenor-${archiveName}`);

  sendStatus(mainWindow, formatStatus(STATUS.DOWNLOADING_JAVA_RUNTIME, { platform: platformLabel }));
  sendProgress(mainWindow, 0);

  await downloadFileWithProgress(downloadUrl, tempFile, (percent) => {
    sendProgress(mainWindow, percent);
  });

  if (!isRarFile(tempFile)) {
    if (fileExists(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    throw new Error('Invalid RAR file');
  }

  sendStatus(mainWindow, STATUS.EXTRACTING_JAVA_RUNTIME);
  // Extract into runtime base so the archive's top-level folder lands as runtime/<platform>.
  await extractRar(tempFile, runtimeBase);
  if (fileExists(tempFile)) {
    fs.unlinkSync(tempFile);
  }

  sendStatus(mainWindow, STATUS.VERIFYING_JAVA_RUNTIME);
  if (!fileExists(javaPath)) {
    fixNestedRuntime(runtimeBase, platformDir);
  }

  if (!fileExists(javaPath)) {
    throw new Error('Java runtime not found after extraction.');
  }

  sendStatus(mainWindow, STATUS.STARTING_GAME);
  return javaPath;
}

module.exports = { ensureJreInstalled };
