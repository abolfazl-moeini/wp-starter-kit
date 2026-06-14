import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  fileCheckSum,
  phpFileContent,
  writeFile,
} from '@core/dependency-extraction-esbuild-plugin';
import { readBuildConfig } from './index.js';

/**
 * Compute the hash of a CSS source file and write a `<file>.asset.php`
 * sidecar containing `['hash' => '<md5>']` (serialized by the dependency
 * plugin's `phpFileContent` helper). Returns the asset file path.
 *
 * Throws when the source file does not exist. The throw is wrapped in a
 * rejected Promise so `await buildStyleAssetFile(...)` reports it the
 * same way as a real write failure.
 *
 * @param {string} cssFilePath  Absolute path to the source CSS file.
 * @returns {Promise<string>}   Path to the written `.asset.php` file.
 */
export function buildStyleAssetFile(cssFilePath) {
  if (typeof cssFilePath !== 'string' || !cssFilePath) {
    return Promise.reject(new Error('buildStyleAssetFile: cssFilePath must be a non-empty string'));
  }

  if (!existsSync(cssFilePath)) {
    return Promise.reject(
      new Error(`buildStyleAssetFile: source CSS file not found at ${cssFilePath}`),
    );
  }

  const hash = fileCheckSum(cssFilePath);
  const fileContent = phpFileContent({ hash });

  const baseName = cssFilePath.replace(/\.css$/, '');
  const assetPath = `${baseName}.asset.php`;

  return writeFile(assetPath, fileContent).then(() => assetPath);
}

/**
 * Walk `build.config.json → styleEntryPoints` and emit an `.asset.php`
 * sidecar for every entry. Returns the list of asset file paths in the
 * same order as the input array.
 *
 * @param {object} [options]
 * @param {object} [options.buildConfig]  Override build config (else
 *   `readBuildConfig()` from @core/build).
 * @param {string} [options.cwd]          Working directory (forwarded to
 *   `buildStyleAssetFile` — entries are expected to be absolute or
 *   repo-relative paths).
 * @returns {Promise<string[]>}           Asset file paths.
 */
export async function buildStyles(options = {}) {
  const buildConfig = options.buildConfig ?? await readBuildConfig();
  const entries = buildConfig?.styleEntryPoints ?? [];

  const results = [];
  for (const cssFilePath of entries) {
    const assetPath = await buildStyleAssetFile(cssFilePath);
    console.info(`Done: ${assetPath}`);
    results.push(assetPath);
  }
  return results;
}
