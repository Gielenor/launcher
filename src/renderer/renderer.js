const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { ipcRenderer } = require('electron');

const progressBarEl = document.getElementById('progress-bar');
const percentEl = document.getElementById('percent');
const statusEl = document.getElementById('status');
const phaseTitleEl = document.getElementById('phase-title');
const logoEl = document.querySelector('.logo');

function resolveIconPath() {
  const devPath = path.join(__dirname, '..', 'assets', 'imagens', 'icone.png');
  const prodPath = path.join(process.resourcesPath, 'assets', 'imagens', 'icone.png');
  const finalPath = fs.existsSync(prodPath) ? prodPath : devPath;
  return pathToFileURL(finalPath).toString();
}

if (logoEl) {
  logoEl.src = resolveIconPath();
}

ipcRenderer.on('download-progress', (_event, percent) => {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  progressBarEl.style.width = `${safePercent}%`;
  percentEl.textContent = `${safePercent}%`;
});

ipcRenderer.on('status-message', (_event, message) => {
  statusEl.textContent = message || '';
});

ipcRenderer.on('phase-message', (_event, message) => {
  if (phaseTitleEl) {
    phaseTitleEl.textContent = message || '';
  }
});
