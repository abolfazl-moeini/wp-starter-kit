import { build } from "esbuild";
import path from "node:path";
import { glob } from "glob";
import {
  importAsGlobals,
  saveAssetFile,
} from "@wpdev/dependency-extraction-esbuild-plugin";
import { readProjectConfig } from "@core/utils";
import { readBuildConfig } from "./index.js";

const MODULE_ENTRY_GLOB = "src/Modules/*/assets/entries/*.ts";
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
    /^src\/Modules\/([^/]+)\/assets\/entries\/(.+)\.ts$/,
  );
  if (moduleMatch) {
    const [, moduleName, entryName] = moduleMatch;
    return `${moduleName}-${entryName}.js`;
  }
  return `${path.basename(path.dirname(sourceFile))}.js`;
}

async function discoverComponentEntries(cwd) {
  const [moduleEntries, legacyScripts] = await Promise.all([
    glob(MODULE_ENTRY_GLOB, {
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
  for (const file of [...moduleEntries, ...legacyScripts]) {
    const key = file.replace(/\\/g, "/");
    if (!seen.has(key)) {
      seen.add(key);
      entries.push(key);
    }
  }
  return entries;
}

export async function buildComponents(options = {}) {
  const projectConfig = options.projectConfig ?? readProjectConfig();
  const buildConfig = options.buildConfig ?? (await readBuildConfig());
  const cwd = options.cwd ?? process.cwd();
  const isDev = options.isDev ?? false;

  const jsfiles = await discoverComponentEntries(cwd);

  const globalMappings = {
    ...(buildConfig.globalMappings ?? {}),
    [`${projectConfig.npmScope}/utils`]: `${projectConfig.globalName}.utils`,
  };

  const depsHandle = projectConfig.depsBundle.replace(/\.js$/, "");

  await Promise.all(
    jsfiles.map(async (sourceFile) => {
      console.info(`build:${sourceFile}`);

      const bundleFile = path.join(
        cwd,
        "assets/bundles",
        bundleNameForEntry(cwd, sourceFile),
      );

      const internalItems = [];

      const result = await build({
        entryPoints: [path.join(cwd, sourceFile)],
        bundle: true,
        minify: !isDev,
        sourcemap: isDev,
        metafile: true,
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
      });

      console.info(`Done: ${bundleFile}`);

      await saveAssetFile(result, [depsHandle], internalItems);
    }),
  );
}

export const MODULE_TS_ENTRY_GLOB = MODULE_ENTRY_GLOB;
