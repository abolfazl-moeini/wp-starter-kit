#!/usr/bin/env node
import { addFeature } from "./addFeature.js";

const [dir, id, variant] = process.argv.slice(2);
if (!dir || !id) {
  console.error("Usage: add-feature-cli <dir> <featureId> [variant]");
  process.exit(1);
}
const res = await addFeature(dir, id, variant);
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
