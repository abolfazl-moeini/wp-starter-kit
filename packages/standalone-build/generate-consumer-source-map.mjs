#!/usr/bin/env node
/**
 * Writes protection-consumer-source-map.json from the target registry.
 *
 * Every protection validator resolves a consumer to its SOURCE tree through
 * this map. Without it they fall back to `plugins/<consumer>`, which in a
 * source/deploy split resolves to the compiled deploy target instead of the
 * reviewed source, and every evidence gate reports a false "missing manifest".
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { TARGET_REGISTRY } from "./target-registry.mjs";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const output = path.resolve(
  process.argv[3] || path.join(contentRoot, "protection-consumer-source-map.json"),
);

const consumers = {};
for (const [consumer, entry] of Object.entries(TARGET_REGISTRY)) {
  if (!entry.sourceDirectoryName) continue;
  consumers[consumer] = `plugins/${entry.sourceDirectoryName}`;
}

if (Object.keys(consumers).length === 0) {
  throw new Error("target registry declares no consumers; refusing to write an empty source map");
}

const report = {
  schema: 1,
  generatedBy: "tools/generate-consumer-source-map.mjs",
  contentRoot,
  consumers,
};

await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Protection consumer source map written: ${output}\n`);
