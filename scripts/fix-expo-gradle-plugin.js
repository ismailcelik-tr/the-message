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

// Fix 1: downgrade kotlin("jvm") version from 2.1.20 to 1.9.24
const buildFile = path.join(pluginDir, 'build.gradle.kts');
if (fs.existsSync(buildFile)) {
  let content = fs.readFileSync(buildFile, 'utf8');
  if (content.includes('kotlin("jvm") version "2.1.20"')) {
    content = content.replace('kotlin("jvm") version "2.1.20"', 'kotlin("jvm") version "1.9.24"');
    fs.writeFileSync(buildFile, content);
    console.log('[fix-expo-gradle-plugin] Patched build.gradle.kts: kotlin 2.1.20 -> 1.9.24');
  } else {
    console.log('[fix-expo-gradle-plugin] build.gradle.kts already patched, skipping');
  }
}

// Fix 2: create missing settings.gradle.kts
const settingsFile = path.join(pluginDir, 'settings.gradle.kts');
if (!fs.existsSync(settingsFile)) {
  fs.writeFileSync(settingsFile, 'rootProject.name = "expo-module-gradle-plugin"\n');
  console.log('[fix-expo-gradle-plugin] Created settings.gradle.kts');
} else {
  console.log('[fix-expo-gradle-plugin] settings.gradle.kts already exists, skipping');
}
