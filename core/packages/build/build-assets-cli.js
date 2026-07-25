#!/usr/bin/env node
import { buildAssets } from "./build-assets.js";
import { isCliMain } from "./cli-options.js";

if (isCliMain(import.meta.url)) {
  buildAssets().catch(() => process.exit(1));
}
