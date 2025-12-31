const progressBarEl = document.getElementById('progress-bar');
const percentEl = document.getElementById('percent');
const statusEl = document.getElementById('status');
const phaseTitleEl = document.getElementById('phase-title');
const logoEl = document.querySelector('.logo');

if (logoEl && window.launcher && typeof window.launcher.getIconUrl === 'function') {
  logoEl.src = window.launcher.getIconUrl();
}

if (window.launcher) {
  window.launcher.onDownloadProgress((percent) => {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  progressBarEl.style.width = `${safePercent}%`;
  percentEl.textContent = `${safePercent}%`;
  });

  window.launcher.onStatusMessage((message) => {
    statusEl.textContent = message || '';
  });

  window.launcher.onPhaseMessage((message) => {
    if (phaseTitleEl) {
      phaseTitleEl.textContent = message || '';
    }
  });
}
