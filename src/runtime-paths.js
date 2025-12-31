const path = require('path');
const { app } = require('electron');

function getRuntimeBaseDir() {
  return path.join(app.getPath('userData'), 'runtime');
}

function getPlatformJreDir() {
  const base = getRuntimeBaseDir();
  if (process.platform === 'win32') {
    return path.join(base, 'win');
  }
  if (process.platform === 'darwin') {
    return path.join(base, 'mac');
  }
  return path.join(base, 'linux');
}

function getJavaExecutablePath() {
  const jreDir = getPlatformJreDir();
  if (process.platform === 'win32') {
    return path.join(jreDir, 'bin', 'java.exe');
  }
  return path.join(jreDir, 'bin', 'java');
}

module.exports = {
  getRuntimeBaseDir,
  getPlatformJreDir,
  getJavaExecutablePath
};
