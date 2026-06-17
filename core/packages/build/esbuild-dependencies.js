import { build, context } from "esbuild";
import path from "node:path";
import {
  importAsGlobals,
  saveAssetFile,
} from "@wpdev/dependency-extraction-esbuild-plugin";
import { readBuildConfig } from "./index.js";
import { getJsxOptions, getReactAliases } from "./getJsxOptions.js";

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
    ...getJsxOptions(projectConfig.uiFramework),
    alias: getReactAliases(projectConfig.uiFramework),
    define: {
      IS_DEV: String(isDev),
      __WPDEV_GLOBAL_NAME__: JSON.stringify(projectConfig.globalName),
      __WPDEV_HOOK_PREFIX__: JSON.stringify(projectConfig.hookPrefix),
      __WPDEV_LOCALIZE_VAR__: JSON.stringify(projectConfig.localizeVar),
      __WPDEV_SLUG__: JSON.stringify(projectConfig.slug),
    },
    loader: { ".js": "jsx", ".ts": "ts" },
    plugins: [importAsGlobals(globalMappings)],
  };
}

function depsAssetSidecarPlugin() {
  return {
    name: "save-deps-asset-sidecar",
    setup(buildApi) {
      buildApi.onEnd(async (result) => {
        if (!result.errors?.length) {
          await saveAssetFile(result, [], []);
        }
      });
    },
  };
}

export async function runBuild(options = {}) {
  const { readProjectConfig } = await import("@core/utils");
  const projectConfig = options.projectConfig ?? readProjectConfig();
  const buildConfig = options.buildConfig ?? (await readBuildConfig());
  const watch = options.watch ?? false;
  const isDev = options.isDev ?? watch;

  const esbuildConfig = buildDepsConfig(projectConfig, buildConfig, {
    cwd: options.cwd,
    isDev,
    entryPoint: options.entryPoint,
  });

  if (watch) {
    esbuildConfig.plugins = [
      ...(esbuildConfig.plugins ?? []),
      depsAssetSidecarPlugin(),
    ];
    const ctx = await context(esbuildConfig);
    await ctx.watch();
    console.info(`Watching: ${esbuildConfig.outfile}`);
    return ctx;
  }

  const result = await build(esbuildConfig);
  console.info(`Done: ${esbuildConfig.outfile}`);
  await saveAssetFile(result, [], []);
  return result;
}