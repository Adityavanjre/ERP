const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add packages as extra node_modules paths
config.watchFolders = config.watchFolders || [];
config.watchFolders.push(path.resolve(__dirname, '../packages/sync-engine'));
config.watchFolders.push(path.resolve(__dirname, '../packages/shared'));

config.resolver.extraNodeModules = {
  '@nexus/sync-engine': path.resolve(__dirname, '../packages/sync-engine/src'),
  '@nexus/shared': path.resolve(__dirname, '../packages/shared/src'),
};

module.exports = config;
