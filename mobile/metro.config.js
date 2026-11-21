// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Let the app bundle the website's race list (../data/events.seed.json) as an offline copy,
// so there's one source of truth for race data.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../data')];

module.exports = config;
