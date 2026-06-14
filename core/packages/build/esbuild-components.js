import { build } from 'esbuild';
import path from 'node:path';
import { glob } from 'glob';
import {
  importAsGlobals,
  saveAssetFile,
} from '@core/dependency-extraction-esbuild-plugin';
import { readProjectConfig } from '@core/utils';
import { readBuildConfig } from './index.js';

export async function buildComponents(options = {}) {
  const projectConfig = options.projectConfig ?? readProjectConfig();
  const buildConfig = options.buildConfig ?? await readBuildConfig();
  const cwd = options.cwd ?? process.cwd();
  const isDev = options.isDev ?? false;

  const jsfiles = await glob('**/script.js', {
    cwd,
    ignore: ['node_modules/**', 'assets/**'],
  });

  const globalMappings = {
    ...(buildConfig.globalMappings ?? {}),
    [`${projectConfig.npmScope}/utils`]: `${projectConfig.globalName}.utils`,
  };

  const depsHandle = projectConfig.depsBundle.replace(/\.js$/, '');

  await Promise.all(jsfiles.map(async (sourceFile) => {
    console.info(`build:${sourceFile}`);

    const bundleFile = path.join(
      cwd,
      'assets/bundles',
      path.basename(path.dirname(sourceFile)) + '.js',
    );

    const internalItems = [];

    const result = await build({
      entryPoints: [path.join(cwd, sourceFile)],
      bundle: true,
      minify: !isDev,
      sourcemap: isDev,
      metafile: true,
      define: { IS_DEV: String(isDev) },
      outfile: bundleFile,
      loader: { '.js': 'jsx', '.ts': 'ts' },
      plugins: [
        importAsGlobals(globalMappings, internalItems),
      ],
    });

    console.info(`Done: ${bundleFile}`);

    await saveAssetFile(result, [depsHandle], internalItems);
  }));
}