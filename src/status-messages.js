const PHASE = {
  STARTING: 'Starting',
  LAUNCHER_UPDATE: 'Launcher update',
  CLIENT_UPDATE: 'Client update',
  LAUNCHING_CLIENT: 'Launching client'
};

const STATUS = {
  OPENING_LAUNCHER: 'Opening launcher...',
  CHECKING_LAUNCHER_UPDATES: 'Checking for launcher updates...',
  DOWNLOADING_LAUNCHER_UPDATE: 'Downloading launcher update...',
  LAUNCHER_UP_TO_DATE: 'Launcher is up to date.',
  LAUNCHER_UPDATE_DOWNLOADED: 'Launcher update downloaded. It will install on exit.',
  LAUNCHER_UPDATE_ERROR: 'Launcher update error. See logs.',
  CHECKING_GAME_UPDATES: 'Checking for game updates...',
  DOWNLOADING_GAME_CLIENT: 'Downloading game client...',
  STARTING_CLIENT: 'Starting client...',
  STARTING_CORE_CLASSES: 'Starting core classes...',
  RATE_LIMIT_RETRY: 'GitHub rate limit. Retrying in {seconds}s...'
};

function formatStatus(template, params) {
  let text = template;
  Object.keys(params || {}).forEach((key) => {
    text = text.replace(`{${key}}`, String(params[key]));
  });
  return text;
}

module.exports = { PHASE, STATUS, formatStatus };
