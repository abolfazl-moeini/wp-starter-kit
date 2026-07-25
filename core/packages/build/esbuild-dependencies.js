import { build, context } from "esbuild";
import path from "node:path";
import { readFileSync } from "node:fs";
import {
  importAsGlobals,
  saveAssetFile,
} from "@wpdev/dependency-extraction-esbuild-plugin";
import { readBuildConfig } from "./index.js";
import {
  getJsxOptions,
  getBuildAliases,
  hasPolarisSource,
} from "./getJsxOptions.js";
import { buildPreactVendor } from "./esbuild-vendor.js";

/**
 * Inject `export const polaris = …` when `src/polaris` exists so module
 * views can treat `@wpdev/polaris-stack` as `${globalName}.polaris`.
 */
function injectPolarisPlugin(cwd) {
  if (!hasPolarisSource(cwd)) {
    return null;
  }
  return {
    name: "inject-polaris-export",
    setup(buildApi) {
      buildApi.onLoad(
        { filter: /[/\\]assets[/\\]dependencies\.(ts|js)$/ },
        async (args) => {
          const source = readFileSync(args.path, "utf8");
          const loader = args.path.endsWith(".ts") ? "ts" : "js";
          return {
            contents:
              `import * as __wpdev_polaris from "@wpdev/polaris-stack";\n` +
              `export const polaris = __wpdev_polaris;\n` +
              source,
            loader,
          };
        },
      );
    },
  };
}

export function buildDepsConfig(projectConfig, buildConfig = {}, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const entryPoint = options.entryPoint ?? "assets/dependencies.ts";
  const isDev = options.isDev ?? false;

  const outfile = path.join(cwd, "assets/bundles", projectConfig.depsBundle);

  const globalMappings = {
    ...(buildConfig.globalMappings ?? {}),
    [`${projectConfig.npmScope}/utils`]: `${projectConfig.globalName}.utils`,
  };

  const plugins = [importAsGlobals(globalMappings)];
  const polarisPlugin = injectPolarisPlugin(cwd);
  if (polarisPlugin) {
    plugins.unshift(polarisPlugin);
  }

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
    // Bundle Polaris into deps; Preact stays external via extraction.
    alias: getBuildAliases(projectConfig.uiFramework, cwd),
    define: {
      IS_DEV: String(isDev),
      __WPDEV_GLOBAL_NAME__: JSON.stringify(projectConfig.globalName),
      __WPDEV_HOOK_PREFIX__: JSON.stringify(projectConfig.hookPrefix),
      __WPDEV_LOCALIZE_VAR__: JSON.stringify(projectConfig.localizeVar),
      __WPDEV_SLUG__: JSON.stringify(projectConfig.slug),
    },
    loader: { ".js": "jsx", ".ts": "ts", ".tsx": "tsx" },
    plugins,
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
  const cwd = options.cwd ?? process.cwd();

  // Shared Preact vendor must exist before / alongside deps (handle: preact).
  const vendorCtx = await buildPreactVendor({
    cwd,
    isDev,
    watch,
    projectConfig,
  });

  const esbuildConfig = buildDepsConfig(projectConfig, buildConfig, {
    cwd,
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
    return vendorCtx ? [vendorCtx, ctx] : [ctx];
  }

  const result = await build(esbuildConfig);
  console.info(`Done: ${esbuildConfig.outfile}`);
  await saveAssetFile(result, [], []);
  return result;
}
