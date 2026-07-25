#!/usr/bin/env node
import { runBuild } from "./esbuild-dependencies.js";
import {
  isCliMain,
  parseBuildCliOptions,
  runWatchUntilExit,
} from "./cli-options.js";

async function runDepsCli() {
  const { watch, isDev } = parseBuildCliOptions();
  try {
    const result = await runBuild({ watch, isDev });
    if (watch) {
      const contexts = Array.isArray(result) ? result : result ? [result] : [];
      await runWatchUntilExit(contexts);
    }
  } catch (error) {
    console.error("Dependencies build failed:", error.message);
    process.exit(1);
  }
}

if (isCliMain(import.meta.url)) {
  runDepsCli();
}
