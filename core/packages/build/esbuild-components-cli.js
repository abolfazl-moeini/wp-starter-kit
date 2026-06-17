import { fileURLToPath } from "node:url";
import { buildComponents } from "./esbuild-components.js";
import { parseBuildCliOptions, runWatchUntilExit } from "./cli-options.js";

async function runBuildComponentsCli() {
  const { watch, isDev } = parseBuildCliOptions();
  try {
    const result = await buildComponents({ watch, isDev });
    if (watch) {
      await runWatchUntilExit(Array.isArray(result) ? result : []);
    }
  } catch (error) {
    console.error("Component build failed:", error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBuildComponentsCli();
}