const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;  // Disable strict export enforcement
config.resolver.extraNodeModules = {
  events: path.resolve(__dirname, 'node_modules/events'),
  stream: path.resolve(__dirname, 'node_modules/readable-stream'),
  // Add other Node modules you need
};

module.exports = config;
