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