#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '../node_modules/expo-modules-core/expo-module-gradle-plugin'),
  path.resolve(__dirname, '../apps/mobile/node_modules/expo-modules-core/expo-module-gradle-plugin'),
];

const pluginDir = candidates.find(fs.existsSync);
if (!pluginDir) {
  console.log('[fix-expo-gradle-plugin] expo-module-gradle-plugin not found, skipping');
  process.exit(0);
}

// Fix: create missing settings.gradle.kts
const settingsFile = path.join(pluginDir, 'settings.gradle.kts');
if (!fs.existsSync(settingsFile)) {
  fs.writeFileSync(settingsFile, 'rootProject.name = "expo-module-gradle-plugin"\n');
  console.log('[fix-expo-gradle-plugin] Created settings.gradle.kts');
} else {
  console.log('[fix-expo-gradle-plugin] settings.gradle.kts already exists, skipping');
}
