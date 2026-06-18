import { existsSync, watch as fsWatch } from "node:fs";
import {
  fileCheckSum,
  phpFileContent,
  writeFile,
} from "@wpdev/dependency-extraction-esbuild-plugin";
import { readBuildConfig } from "./index.js";

/**
 * Compute the hash of a CSS source file and write a `<file>.asset.php`
 * sidecar containing `['hash' => '<md5>']` (serialized by the dependency
 * plugin's `phpFileContent` helper). Returns the asset file path.
 *
 * @param {string} cssFilePath  Absolute path to the source CSS file.
 * @returns {Promise<string>}   Path to the written `.asset.php` file.
 */
export function buildStyleAssetFile(cssFilePath) {
  if (typeof cssFilePath !== "string" || !cssFilePath) {
    return Promise.reject(
      new Error("buildStyleAssetFile: cssFilePath must be a non-empty string"),
    );
  }

  if (!existsSync(cssFilePath)) {
    return Promise.reject(
      new Error(
        `buildStyleAssetFile: source CSS file not found at ${cssFilePath}`,
      ),
    );
  }

  const hash = fileCheckSum(cssFilePath);
  const fileContent = phpFileContent({ hash });

  const baseName = cssFilePath.replace(/\.css$/i, "");
  const assetPath = `${baseName}.asset.php`;

  return writeFile(assetPath, fileContent).then(() => assetPath);
}

/**
 * Walk `build.config.json → styleEntryPoints` and emit an `.asset.php`
 * sidecar for every entry.
 *
 * @param {object} [options]
 * @param {boolean} [options.watch]     Watch entry files and rebuild sidecars.
 * @returns {Promise<string[]|import('node:fs').FSWatcher[]>}
 */
export async function buildStyles(options = {}) {
  const buildConfig = options.buildConfig ?? (await readBuildConfig());
  const entries = buildConfig?.styleEntryPoints ?? [];
  const watch = options.watch ?? false;

  const results = [];
  for (const cssFilePath of entries) {
    const assetPath = await buildStyleAssetFile(cssFilePath);
    console.info(`Done: ${assetPath}`);
    results.push(assetPath);
  }

  if (!watch) {
    return results;
  }

  const watchers = [];
  for (const cssFilePath of entries) {
    const watcher = fsWatch(cssFilePath, async () => {
      try {
        const assetPath = await buildStyleAssetFile(cssFilePath);
        console.info(`Rebuilt: ${assetPath}`);
      } catch (error) {
        console.error(
          `Style rebuild failed for ${cssFilePath}:`,
          error.message,
        );
      }
    });
    watchers.push(watcher);
  }

  console.info(`Watching ${watchers.length} style entry point(s)…`);
  return watchers;
}
