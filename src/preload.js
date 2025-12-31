const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

function resolveIconPath() {
  const devPath = path.join(__dirname, 'assets', 'imagens', 'icone.png');
  const prodPath = path.join(process.resourcesPath, 'assets', 'imagens', 'icone.png');
  const finalPath = fs.existsSync(prodPath) ? prodPath : devPath;
  return pathToFileURL(finalPath).toString();
}

contextBridge.exposeInMainWorld('launcher', {
  getIconUrl: () => resolveIconPath(),
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_event, percent) => callback(percent));
  },
  onStatusMessage: (callback) => {
    ipcRenderer.on('status-message', (_event, message) => callback(message));
  },
  onPhaseMessage: (callback) => {
    ipcRenderer.on('phase-message', (_event, message) => callback(message));
  }
});
