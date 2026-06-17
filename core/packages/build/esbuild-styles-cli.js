import { fileURLToPath } from "node:url";
import { buildStyles } from "./esbuild-styles.js";
import { parseBuildCliOptions, runWatchUntilExit } from "./cli-options.js";

async function runStylesCli() {
  const { watch } = parseBuildCliOptions();
  try {
    await buildStyles({ watch });
    if (watch) {
      await runWatchUntilExit([]);
    }
  } catch (error) {
    console.error("Style hash build failed:", error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runStylesCli();
}