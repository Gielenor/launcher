const progressBarEl = document.getElementById('progress-bar');
const percentEl = document.getElementById('percent');
const statusEl = document.getElementById('status');
const phaseTitleEl = document.getElementById('phase-title');
const logoEl = document.querySelector('.logo');

if (logoEl) {
  const fallbackSrc = '../assets/imagens/icone.png';
  if (window.launcher && typeof window.launcher.getIconUrl === 'function') {
    try {
      const iconUrl = window.launcher.getIconUrl();
      logoEl.src = iconUrl || fallbackSrc;
    } catch (error) {
      logoEl.src = fallbackSrc;
    }
  } else {
    logoEl.src = fallbackSrc;
  }
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

  if (typeof window.launcher.notifyReady === 'function') {
    window.launcher.notifyReady();
  }
}
