#!/usr/bin/env node
import { buildComponents } from "./esbuild-components.js";
import {
  isCliMain,
  parseBuildCliOptions,
  runWatchUntilExit,
} from "./cli-options.js";

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

if (isCliMain(import.meta.url)) {
  runBuildComponentsCli();
}
