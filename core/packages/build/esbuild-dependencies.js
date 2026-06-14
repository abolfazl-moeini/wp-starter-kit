import { build } from 'esbuild';
import path from 'node:path';
import {
  importAsGlobals,
  saveAssetFile,
} from '@core/dependency-extraction-esbuild-plugin';
import { readBuildConfig } from './index.js';

/**
 * Build the esbuild config object for the dependencies bundle.
 *
 * @param {object} projectConfig  Resolved project config (must include
 *   `globalName`, `depsBundle`, `npmScope`).
 * @param {object} [buildConfig]  Optional build config (uses `globalMappings`
 *   for the `importAsGlobals` plugin).
 * @param {object} [options]
 * @param {string} [options.cwd]              Working directory (default `process.cwd()`).
 * @param {string} [options.entryPoint]       Source path relative to `cwd`
 *   (default `assets/dependencies.js`).
 * @param {boolean} [options.isDev=false]     Pass-through dev flags.
 * @returns {import('esbuild').BuildOptions}  esbuild config — caller is
 *   responsible for invoking `esbuild.build(config)`.
 */
export function buildDepsConfig(projectConfig, buildConfig = {}, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const entryPoint = options.entryPoint ?? 'assets/dependencies.js';
  const isDev = options.isDev ?? false;

  const outfile = path.join(cwd, 'assets/bundles', projectConfig.depsBundle);

  // mergeMappings: take user-supplied globalMappings, then layer the
  // internal `<scope>/utils` mapping on top so the deps bundle can re-export
  // utils via the same global accessor the components bundle will use.
  const globalMappings = {
    ...(buildConfig.globalMappings ?? {}),
    [`${projectConfig.npmScope}/utils`]: `${projectConfig.globalName}.utils`,
  };

  return {
    entryPoints: [path.join(cwd, entryPoint)],
    bundle: true,
    minify: !isDev,
    sourcemap: isDev,
    metafile: true,
    format: 'iife',
    globalName: projectConfig.globalName,
    outfile,
    define: { IS_DEV: String(isDev) },
    loader: { '.js': 'jsx', '.ts': 'ts' },
    plugins: [
      importAsGlobals(globalMappings, []),
    ],
  };
}

/**
 * Run the dependencies build end-to-end: build the esbuild config, call
 * esbuild, then write the .asset.php sidecar via saveAssetFile.
 *
 * @param {object} [options]
 * @param {object} [options.projectConfig]  Override project config (else
 *   `readProjectConfig()` from @core/utils).
 * @param {object} [options.buildConfig]    Override build config (else
 *   `readBuildConfig()` from @core/build).
 * @param {string} [options.cwd]            Working directory.
 * @param {boolean} [options.isDev]         Dev flag.
 * @returns {Promise<import('esbuild').BuildResult>}
 */
export async function runBuild(options = {}) {
  // Lazy import to avoid a hard dep cycle and to allow per-call config load.
  const { readProjectConfig } = await import('@core/utils');
  const projectConfig = options.projectConfig ?? readProjectConfig();
  const buildConfig = options.buildConfig ?? await readBuildConfig();

  const esbuildConfig = buildDepsConfig(projectConfig, buildConfig, {
    cwd: options.cwd,
    isDev: options.isDev,
    entryPoint: options.entryPoint,
  });

  const result = await build(esbuildConfig);

  console.info(`Done: ${esbuildConfig.outfile}`);
  await saveAssetFile(result, [], []);

  return result;
}
