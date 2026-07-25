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
      await runWatchUntilExit(result ? [result] : []);
    }
  } catch (error) {
    console.error("Dependencies build failed:", error.message);
    process.exit(1);
  }
}

if (isCliMain(import.meta.url)) {
  runDepsCli();
}
