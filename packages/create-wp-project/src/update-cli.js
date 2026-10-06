#!/usr/bin/env node
import { runMigrations, getMigrations } from "./migrations/index.js";

const dir = process.argv[2];
const toVersion = process.argv[3];
if (!dir) {
  console.error("Usage: update-cli <dir> [toVersion]");
  process.exit(1);
}
const migrations = getMigrations();
const targetTo =
  toVersion ||
  (migrations.length > 0 ? migrations[migrations.length - 1].version : "2.6.0");
const res = await runMigrations(dir, { to: targetTo });
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
