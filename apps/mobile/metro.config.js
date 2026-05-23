const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Limit watch folders to only the mobile app source and packages/shared
// This prevents Metro from scanning the entire root node_modules directory,
// bypassing macOS file descriptor limits (EMFILE errors).
config.watchFolders = [
  projectRoot,
  path.resolve(workspaceRoot, 'packages/shared')
];

// Guide the resolver to locate packages within the mobile app and monorepo root dependencies
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
