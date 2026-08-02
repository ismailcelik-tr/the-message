#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '../node_modules/expo-modules-core/expo-module-gradle-plugin'),
  path.resolve(__dirname, '../apps/mobile/node_modules/expo-modules-core/expo-module-gradle-plugin'),
];

// npm hoists expo-modules-core to whichever node_modules it likes, including
// nested under expo itself. Ask node where it actually is instead of guessing.
const mobileRoot = path.resolve(__dirname, '../apps/mobile');
const searchBases = [mobileRoot, path.resolve(__dirname, '..')];

try {
  // expo depends on expo-modules-core, so expo's own directory is a valid base
  // when the package ends up nested rather than hoisted.
  searchBases.unshift(path.dirname(require.resolve('expo/package.json', { paths: [mobileRoot] })));
} catch {
  // expo not installed yet; the remaining bases still apply.
}

for (const base of searchBases) {
  try {
    const pkgJson = require.resolve('expo-modules-core/package.json', { paths: [base] });
    candidates.unshift(path.join(path.dirname(pkgJson), 'expo-module-gradle-plugin'));
    break;
  } catch {
    // Try the next base.
  }
}

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
