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
const buildFile = path.join(pluginDir, 'build.gradle.kts');
const sourceFiles = [
  path.join(pluginDir, 'src/main/kotlin/expo/modules/plugin/ExpoModulesGradlePlugin.kt'),
  path.join(pluginDir, 'src/main/kotlin/expo/modules/plugin/ProjectConfiguration.kt'),
  path.join(pluginDir, 'src/main/kotlin/expo/modules/plugin/gradle/ExpoModuleExtension.kt'),
];

if (!fs.existsSync(settingsFile)) {
  fs.writeFileSync(settingsFile, 'rootProject.name = "expo-module-gradle-plugin"\n');
  console.log('[patch] Created settings.gradle.kts for expo-module-gradle-plugin');
} else {
  console.log('[patch] settings.gradle.kts already exists, skipping');
}

if (fs.existsSync(buildFile)) {
  const contents = fs.readFileSync(buildFile, 'utf8');
  let patched = contents.replace(
    'kotlin("jvm") version "1.9.24"',
    'kotlin("jvm") version "2.1.20"',
  );

  if (!patched.includes('implementation(gradleKotlinDsl())')) {
    patched = patched.replace(
      'dependencies {\n  implementation(gradleApi())',
      'dependencies {\n  implementation(gradleApi())\n  implementation(gradleKotlinDsl())',
    );
  }

  if (patched !== contents) {
    fs.writeFileSync(buildFile, patched);
    console.log('[patch] Updated expo-module-gradle-plugin build configuration');
  } else {
    console.log('[patch] expo-module-gradle-plugin build configuration already compatible');
  }
}

for (const sourceFile of sourceFiles) {
  if (!fs.existsSync(sourceFile)) {
    continue;
  }

  const contents = fs.readFileSync(sourceFile, 'utf8');
  const patched = contents.replaceAll(
    'org.gradle.internal.extensions.core.extra',
    'org.gradle.kotlin.dsl.extra',
  );

  if (patched !== contents) {
    fs.writeFileSync(sourceFile, patched);
    console.log(`[patch] Updated Gradle Kotlin DSL import in ${path.basename(sourceFile)}`);
  }
}
