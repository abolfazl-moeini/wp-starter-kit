import { build, context } from "esbuild";
import path from "node:path";
import {
  importAsGlobals,
  saveAssetFile,
} from "@wpdev/dependency-extraction-esbuild-plugin";
import { readProjectConfig } from "@core/utils";
import { readBuildConfig } from "./index.js";
import { getJsxOptions, getReactAliases } from "./getJsxOptions.js";

// Resolve `glob` without import.meta (Jest/babel cannot parse import.meta
// in this file). Prefer the ESM named export (glob@10+); fall back to CJS
// default / whole-module for older installs.
async function resolveGlob() {
  const globModule = await import("glob");
  if (typeof globModule.glob === "function") {
    return globModule.glob.bind(globModule);
  }
  if (typeof globModule.default === "function") {
    return globModule.default;
  }
  if (globModule.default && typeof globModule.default.glob === "function") {
    return globModule.default.glob.bind(globModule.default);
  }
  throw new Error(
    "esbuild-components: could not resolve a glob() function from the 'glob' package",
  );
}

/** Module entries: plain TS or TSX (JSX automatic runtime). */
const MODULE_ENTRY_GLOBS = [
  "src/Modules/*/assets/entries/*.ts",
  "src/Modules/*/assets/entries/*.tsx",
];
const LEGACY_SCRIPT_GLOB = "**/script.js";
const COMPONENT_ENTRY_IGNORE = [
  "**/node_modules/**",
  "assets/**",
  "dist/**",
  "examples/**",
  "tests/**",
];

function bundleNameForEntry(cwd, sourceFile) {
  const normalized = sourceFile.replace(/\\/g, "/");
  const moduleMatch = normalized.match(
    /^src\/Modules\/([^/]+)\/assets\/entries\/(.+)\.tsx?$/,
  );
  if (moduleMatch) {
    const [, moduleName, entryName] = moduleMatch;
    return `${moduleName}-${entryName}.js`;
  }
  return `${path.basename(path.dirname(sourceFile))}.js`;
}

async function discoverComponentEntries(cwd) {
  const glob = await resolveGlob();
  const [moduleTs, moduleTsx, legacyScripts] = await Promise.all([
    glob(MODULE_ENTRY_GLOBS[0], {
      cwd,
      ignore: COMPONENT_ENTRY_IGNORE,
    }),
    glob(MODULE_ENTRY_GLOBS[1], {
      cwd,
      ignore: COMPONENT_ENTRY_IGNORE,
    }),
    glob(LEGACY_SCRIPT_GLOB, {
      cwd,
      ignore: COMPONENT_ENTRY_IGNORE,
    }),
  ]);

  const seen = new Set();
  const entries = [];
  for (const file of [...moduleTs, ...moduleTsx, ...legacyScripts]) {
    const key = file.replace(/\\/g, "/");
    // Prefer .tsx over a same-named .ts if both exist (should not happen).
    if (key.endsWith(".ts") && seen.has(`${key}x`)) {
      continue;
    }
    if (key.endsWith(".tsx")) {
      const bareTs = key.slice(0, -1); // drop trailing x → .ts path
      if (seen.has(bareTs)) {
        // Replace bare .ts with .tsx
        const idx = entries.indexOf(bareTs);
        if (idx !== -1) entries.splice(idx, 1);
        seen.delete(bareTs);
      }
    }
    if (!seen.has(key)) {
      seen.add(key);
      entries.push(key);
    }
  }
  return entries;
}

function assetSidecarPlugin(depsHandle, internalItems) {
  return {
    name: "save-asset-sidecar",
    setup(buildApi) {
      buildApi.onEnd(async (result) => {
        if (!result.errors?.length) {
          await saveAssetFile(result, [depsHandle], internalItems);
        }
      });
    },
  };
}

async function buildSingleComponent({
  cwd,
  sourceFile,
  projectConfig,
  buildConfig,
  isDev,
  watch,
}) {
  console.info(`build:${sourceFile}`);

  const bundleFile = path.join(
    cwd,
    "assets/bundles",
    bundleNameForEntry(cwd, sourceFile),
  );

  const globalMappings = {
    ...(buildConfig.globalMappings ?? {}),
    [`${projectConfig.npmScope}/utils`]: `${projectConfig.globalName}.utils`,
  };

  if (!projectConfig.depsBundle) {
    throw new Error(
      "project.config.json is missing 'depsBundle' (required for component builds)",
    );
  }
  const depsHandle = projectConfig.depsBundle.replace(/\.js$/, "");
  const internalItems = [];

  const esbuildOptions = {
    entryPoints: [path.join(cwd, sourceFile)],
    bundle: true,
    minify: !isDev,
    sourcemap: isDev,
    metafile: true,
    ...getJsxOptions(projectConfig.uiFramework),
    alias: getReactAliases(projectConfig.uiFramework),
    define: {
      IS_DEV: String(isDev),
      __WPDEV_GLOBAL_NAME__: JSON.stringify(projectConfig.globalName),
      __WPDEV_HOOK_PREFIX__: JSON.stringify(projectConfig.hookPrefix),
      __WPDEV_LOCALIZE_VAR__: JSON.stringify(projectConfig.localizeVar),
      __WPDEV_SLUG__: JSON.stringify(projectConfig.slug),
    },
    outfile: bundleFile,
    loader: { ".js": "jsx", ".ts": "ts", ".tsx": "tsx" },
    plugins: [importAsGlobals(globalMappings, internalItems)],
  };

  if (watch) {
    esbuildOptions.plugins = [
      ...esbuildOptions.plugins,
      assetSidecarPlugin(depsHandle, internalItems),
    ];
    const ctx = await context(esbuildOptions);
    await ctx.watch();
    console.info(`Watching: ${bundleFile}`);
    return ctx;
  }

  const result = await build(esbuildOptions);
  console.info(`Done: ${bundleFile}`);
  await saveAssetFile(result, [depsHandle], internalItems);
  return result;
}

export async function buildComponents(options = {}) {
  const projectConfig = options.projectConfig ?? readProjectConfig();
  const buildConfig = options.buildConfig ?? (await readBuildConfig());
  const cwd = options.cwd ?? process.cwd();
  const isDev = options.isDev ?? false;
  const watch = options.watch ?? false;

  const jsfiles = await discoverComponentEntries(cwd);

  if (watch) {
    const contexts = [];
    for (const sourceFile of jsfiles) {
      contexts.push(
        await buildSingleComponent({
          cwd,
          sourceFile,
          projectConfig,
          buildConfig,
          isDev: true,
          watch: true,
        }),
      );
    }
    console.info(`Watching ${contexts.length} component bundle(s)…`);
    return contexts;
  }

  await Promise.all(
    jsfiles.map((sourceFile) =>
      buildSingleComponent({
        cwd,
        sourceFile,
        projectConfig,
        buildConfig,
        isDev,
        watch: false,
      }),
    ),
  );
}

/** @deprecated Prefer MODULE_ENTRY_GLOBS (includes .tsx). */
export const MODULE_TS_ENTRY_GLOB = MODULE_ENTRY_GLOBS[0];
export { MODULE_ENTRY_GLOBS };
