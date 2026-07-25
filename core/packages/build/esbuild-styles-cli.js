#!/usr/bin/env node
import { buildStyles } from "./esbuild-styles.js";
import {
  isCliMain,
  parseBuildCliOptions,
  runWatchUntilExit,
} from "./cli-options.js";

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

if (isCliMain(import.meta.url)) {
  runStylesCli();
}
