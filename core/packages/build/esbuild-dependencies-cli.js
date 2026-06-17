import { fileURLToPath } from "node:url";
import { runBuild } from "./esbuild-dependencies.js";
import { parseBuildCliOptions, runWatchUntilExit } from "./cli-options.js";

async function runDepsCli() {
  const { watch, isDev } = parseBuildCliOptions();
  try {
    const result = await runBuild({ watch, isDev });
    if (watch) {
      await runWatchUntilExit(result ? [result] : []);
    }
  } catch (error) {
    console.error("Dependencies build failed:", error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDepsCli();
}