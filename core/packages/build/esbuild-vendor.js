import { build, context } from "esbuild";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  writeFile,
  assetFilePath,
  fileCheckSum,
  phpFileContent,
} from "@wpdev/dependency-extraction-esbuild-plugin";

/**
 * Shared Preact vendor entry (single WP handle: `preact`).
 * Exposes the same globals Preact's official UMD builds use, plus jsx-runtime.
 */
export const PREACT_VENDOR_SOURCE = `
import * as preact from "preact";
import * as hooks from "preact/hooks";
import * as compat from "preact/compat";
import * as jsxRuntime from "preact/jsx-runtime";

var root = typeof globalThis !== "undefined" ? globalThis : window;
root.preact = preact;
root.preactHooks = hooks;
root.preactCompat = compat;
root.preactJsxRuntime = jsxRuntime;
`;

/**
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {boolean} [options.isDev]
 * @param {boolean} [options.watch]
 * @param {object} [options.projectConfig]
 */
export async function buildPreactVendor(options = {}) {
  const { readProjectConfig } = await import("@core/utils");
  const projectConfig = options.projectConfig ?? readProjectConfig();
  const cwd = options.cwd ?? process.cwd();
  const isDev = options.isDev ?? false;
  const watch = options.watch ?? false;

  if (projectConfig.uiFramework !== "preact") {
    return null;
  }

  const outdir = path.join(cwd, "assets/bundles");
  mkdirSync(outdir, { recursive: true });
  const outfile = path.join(outdir, "preact.js");

  const esbuildOptions = {
    stdin: {
      contents: PREACT_VENDOR_SOURCE,
      resolveDir: cwd,
      sourcefile: "preact-vendor.js",
      loader: "js",
    },
    bundle: true,
    minify: !isDev,
    sourcemap: isDev,
    metafile: true,
    format: "iife",
    outfile,
    // Bundle Preact itself — do not run dependency-extraction here.
  };

  if (watch) {
    esbuildOptions.plugins = [
      {
        name: "save-preact-asset-sidecar",
        setup(buildApi) {
          buildApi.onEnd(async (result) => {
            if (!result.errors?.length) {
              await writePreactAssetSidecar(outfile);
            }
          });
        },
      },
    ];
    const ctx = await context(esbuildOptions);
    await ctx.watch();
    console.info(`Watching: ${outfile}`);
    return ctx;
  }

  const result = await build(esbuildOptions);
  console.info(`Done: ${outfile}`);
  await writePreactAssetSidecar(outfile);
  return result;
}

/**
 * Vendor has no WP script deps — write a minimal sidecar.
 * @param {string} outfile
 */
async function writePreactAssetSidecar(outfile) {
  const info = {
    dependencies: [],
    internal_packages: [],
    hash: fileCheckSum(outfile),
  };
  return writeFile(assetFilePath(outfile), phpFileContent(info));
}
