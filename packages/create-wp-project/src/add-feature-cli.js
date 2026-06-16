#!/usr/bin/env node
import { addFeature } from "./addFeature.js";

const argv = process.argv.slice(2);
const dir = argv[0];
const id = argv[1];
const variant = argv[2];
if (!dir || !id) {
  console.error("Usage: add-feature-cli <dir> <featureId> [variant] [--force]");
  process.exit(1);
}
// The engine's addFeature accepts a `force` opt (parity with
// scaffoldProject / removeFeature). Forwarding it from the bin
// lets a caller override an existing feature variant even when
// the manifest already records a different one. The previous
// code dropped the flag silently.
const force = argv.includes("--force");
const res = await addFeature(dir, id, variant, { force });
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
