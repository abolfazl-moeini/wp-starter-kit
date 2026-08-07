#!/usr/bin/env node
import { buildPreactVendor } from "./esbuild-vendor.js";
import {
  isCliMain,
  parseBuildCliOptions,
  runWatchUntilExit,
} from "./cli-options.js";

async function runVendorCli() {
  const { watch, isDev } = parseBuildCliOptions();
  try {
    const result = await buildPreactVendor({ watch, isDev });
    if (watch && result) {
      await runWatchUntilExit([result]);
    }
  } catch (error) {
    console.error("Vendor build failed:", error.message);
    process.exit(1);
  }
}

if (isCliMain(import.meta.url)) {
  runVendorCli();
}
