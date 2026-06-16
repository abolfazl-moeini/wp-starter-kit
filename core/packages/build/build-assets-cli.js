#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { buildAssets } from "./build-assets.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAssets().catch(() => process.exit(1));
}
