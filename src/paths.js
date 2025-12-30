const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getAssetsBasePath() {
  const packagedAssets = path.join(process.resourcesPath, 'assets');
  if (app.isPackaged && fs.existsSync(packagedAssets)) {
    return packagedAssets;
  }
  return path.join(__dirname, 'assets');
}

function getAssetPath(relativePath) {
  return path.join(getAssetsBasePath(), relativePath);
}

function getAppIconPath() {
  return getAssetPath(path.join('imagens', 'icone.png'));
}

module.exports = {
  getAppIconPath,
  getAssetPath
};
