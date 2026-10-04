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

import { loadTargetRegistry } from "./target-registry.mjs";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const positionals = process.argv.slice(2).filter((a) => typeof a !== "string" || !a.startsWith("--config"));
const contentRoot = path.resolve(positionals[0] || path.join(scriptDirectory, ".."));
const output = path.resolve(
  positionals[1] || path.join(contentRoot, "protection-consumer-source-map.json"),
);

function resolveBuildConfigPath(argv = process.argv, env = process.env) {
  const eqArg = (argv || []).find((a) => typeof a === "string" && a.startsWith("--config="));
  if (eqArg) {
    const value = eqArg.slice("--config=".length).trim();
    return value || null;
  }
  const idx = (argv || []).findIndex((a) => a === "--config");
  if (idx !== -1 && typeof argv[idx + 1] === "string" && !argv[idx + 1].startsWith("--")) {
    return argv[idx + 1];
  }
  const fromEnv = env?.WPDEV_BUILD_CONFIG;
  return typeof fromEnv === "string" && fromEnv.trim() ? fromEnv.trim() : null;
}

// Consumers come from loadTargetRegistry() (explicit build.config.json or
// convention auto-discovery of `plugins/*-dev`). No static registry import.
let registry = {};
try {
  const bundle = await loadTargetRegistry(resolveBuildConfigPath(), contentRoot);
  registry = bundle?.registry || {};
} catch {
  registry = {};
}
if (Object.keys(registry).length === 0) {
  // Convention fallback: map every `*-dev` source directory to its slug.
  try {
    const entries = await fs.readdir(path.join(contentRoot, "plugins"), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || !entry.name.endsWith("-dev")) continue;
      const slug = entry.name.slice(0, -"-dev".length);
      if (slug) registry[slug] = { sourceDirectoryName: entry.name };
    }
  } catch {
    // No plugins directory: handled by the empty-map guard below.
  }
}

const consumers = {};
for (const [consumer, entry] of Object.entries(registry)) {
  if (!entry?.sourceDirectoryName) continue;
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
