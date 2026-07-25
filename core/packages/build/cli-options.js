import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Shared CLI flags for esbuild entry scripts.
 */
export function parseBuildCliOptions(argv = process.argv) {
  const watch =
    argv.includes("--watch") || process.env.NODE_ENV === "development";
  return {
    watch,
    isDev: watch || argv.includes("--dev"),
  };
}

/**
 * True when this module is the process entrypoint.
 * Compares realpaths so npm bin symlinks still match import.meta.url.
 *
 * @param {string} importMetaUrl import.meta.url of the CLI file
 * @returns {boolean}
 */
export function isCliMain(importMetaUrl) {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return realpathSync(entry) === fileURLToPath(importMetaUrl);
  } catch {
    return false;
  }
}

/**
 * Keep watch processes alive until SIGINT; disposes esbuild contexts on exit.
 *
 * @param {import('esbuild').BuildContext[]} contexts
 */
export function runWatchUntilExit(contexts = []) {
  const disposeAll = async () => {
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
  };

  process.on("SIGINT", async () => {
    await disposeAll();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await disposeAll();
    process.exit(0);
  });

  return new Promise(() => {});
}
