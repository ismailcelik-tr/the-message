const fs = require('fs');
const path = require('path');

// expo-module-gradle-plugin is used as an includeBuild but has no settings.gradle.kts
// Without it, Gradle API classes (extensions, extra) are not available on the classpath
// causing "Unresolved reference 'extensions'" errors on Java 22 / Gradle 8.x

const candidates = [
  path.resolve(__dirname, '../../node_modules/expo-modules-core/expo-module-gradle-plugin'),
  path.resolve(__dirname, '../node_modules/expo-modules-core/expo-module-gradle-plugin'),
  path.resolve(__dirname, '../../../node_modules/expo-modules-core/expo-module-gradle-plugin'),
];

const pluginDir = candidates.find(fs.existsSync);
if (!pluginDir) {
  console.log('[patch] expo-module-gradle-plugin not found, skipping');
  process.exit(0);
}

const settingsFile = path.join(pluginDir, 'settings.gradle.kts');

if (!fs.existsSync(settingsFile)) {
  fs.writeFileSync(settingsFile, 'rootProject.name = "expo-module-gradle-plugin"\n');
  console.log('[patch] Created settings.gradle.kts for expo-module-gradle-plugin');
} else {
  console.log('[patch] settings.gradle.kts already exists, skipping');
}
