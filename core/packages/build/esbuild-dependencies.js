import { build } from "esbuild";
import path from "node:path";
import {
  importAsGlobals,
  saveAssetFile,
} from "@wpsk/dependency-extraction-esbuild-plugin";
import { readBuildConfig } from "./index.js";

export function buildDepsConfig(projectConfig, buildConfig = {}, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const entryPoint = options.entryPoint ?? "assets/dependencies.ts";
  const isDev = options.isDev ?? false;

  const outfile = path.join(cwd, "assets/bundles", projectConfig.depsBundle);

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
    format: "iife",
    globalName: projectConfig.globalName,
    outfile,
    define: {
      IS_DEV: String(isDev),
      __WPSK_GLOBAL_NAME__: JSON.stringify(projectConfig.globalName),
      __WPSK_HOOK_PREFIX__: JSON.stringify(projectConfig.hookPrefix),
      __WPSK_LOCALIZE_VAR__: JSON.stringify(projectConfig.localizeVar),
      __WPSK_SLUG__: JSON.stringify(projectConfig.slug),
    },
    loader: { ".js": "jsx", ".ts": "ts" },
    plugins: [importAsGlobals(globalMappings)],
    // SaveAssetFile is called in runBuild after build completes.
    // The deps bundle inlines all @wpsk/* packages; they are not external.
    // No separate internalItems needed since everything is bundled.
  };
}

export async function runBuild(options = {}) {
  const { readProjectConfig } = await import("@core/utils");
  const projectConfig = options.projectConfig ?? readProjectConfig();
  const buildConfig = options.buildConfig ?? (await readBuildConfig());

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
