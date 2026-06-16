#!/usr/bin/env node
import { runMigrations } from "./migrations/index.js";

const dir = process.argv[2];
const toVersion = process.argv[3];
if (!dir) {
  console.error("Usage: update-cli <dir> [toVersion]");
  process.exit(1);
}
const res = await runMigrations(dir, { toVersion });
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
