#!/usr/bin/env node

import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const contentRoot = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const failures = [];
const evidence = [];
const classifications = new Set(["source-internal", "portable-contract", "artifact-e2e", "harness-only", "live/external"]);
const execFileAsync = promisify(execFile);
let discoveredTests = 0;
let classifiedTests = 0;

async function resolveConsumerRoot() {
  const defaultRelative = `plugins/${consumer}`;
  const mapPath = path.join(contentRoot, "protection-consumer-source-map.json");
  let relative = defaultRelative;
  try {
    const stat = await fs.lstat(mapPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error("source map must be a regular non-symlink file");
    }
    const map = JSON.parse(await fs.readFile(mapPath, "utf8"));
    if (map.schema !== 1 || !map.consumers || typeof map.consumers !== "object" || Array.isArray(map.consumers)) {
      throw new Error("source map must provide schema 1 and a consumers object");
    }
    if (Object.hasOwn(map.consumers, consumer)) relative = map.consumers[consumer];
  } catch (error) {
    if (error.code !== "ENOENT") failures.push(`consumer source map: ${error.message}`);
  }
  if (
    typeof relative !== "string" ||
    !relative.startsWith("plugins/") ||
    relative.includes("\\") ||
    path.posix.normalize(relative) !== relative ||
    relative.includes("../")
  ) {
    failures.push(`consumer source map: unsafe source path for ${consumer}`);
    return path.join(contentRoot, defaultRelative);
  }
  const root = path.join(contentRoot, relative);
  try {
    const stat = await fs.lstat(root);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("consumer source must be a regular directory");
  } catch (error) {
    failures.push(`consumer source map: cannot resolve ${consumer} (${error.message})`);
  }
  return root;
}

function isSafeRelative(value) {
  return typeof value === "string" && value !== "" &&
    !value.includes("\\") && !path.posix.isAbsolute(value) &&
    path.posix.normalize(value) === value && value !== ".." && !value.startsWith("../");
}

async function readRegularJson(file, label) {
  try {
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink()) throw new Error("symlink evidence path is not allowed");
    if (!stat.isFile()) throw new Error("evidence path must be a regular file");
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    failures.push(`${label}: cannot read valid JSON (${error.message})`);
    return null;
  }
}

async function regularFiles(root, suffix) {
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return files;
    failures.push(`test discovery: cannot read ${root} (${error.message})`);
    return files;
  }
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      failures.push(`test discovery: symlink is not allowed (${absolute})`);
    } else if (entry.isDirectory()) {
      files.push(...await regularFiles(absolute, suffix));
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      files.push(absolute);
    }
  }
  return files;
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(consumer)) {
  process.stderr.write("Invalid consumer slug.\n");
  process.exit(2);
}

const pluginRoot = await resolveConsumerRoot();
const manifest = await readRegularJson(
  path.join(pluginRoot, "dev", "test-portability-manifest.json"),
  "test portability manifest",
);

if (manifest) {
  if (manifest.schema !== 1) failures.push("test portability manifest: unsupported schema");
  if (manifest.plugin !== consumer) failures.push("test portability manifest: consumer mismatch");
  if (manifest.status !== "draft-blocked") {
    failures.push(`test portability manifest: status must be draft-blocked, found ${String(manifest.status)}`);
  }
  if (typeof manifest.sourceCommit !== "string" || !/^[0-9a-f]{7,40}$/i.test(manifest.sourceCommit)) {
    failures.push("test portability manifest: sourceCommit must be a Git commit identifier");
  } else {
    try {
      const { stdout } = await execFileAsync("git", ["-C", pluginRoot, "rev-parse", "--verify", `${manifest.sourceCommit}^{commit}`]);
      const sourceCommit = stdout.trim();
      await execFileAsync("git", ["-C", pluginRoot, "merge-base", "--is-ancestor", sourceCommit, "HEAD"]);
      evidence.push(`source commit ${sourceCommit} is in the current consumer history`);
    } catch {
      failures.push("test portability manifest: sourceCommit does not resolve to a commit in current consumer history");
    }
  }
  if (!plainObject(manifest.rules)) {
    failures.push("test portability manifest: rules must be an object");
  } else {
    for (const classification of classifications) {
      if (typeof manifest.rules[classification] !== "string" || manifest.rules[classification] === "") {
        failures.push(`test portability manifest: rules.${classification} must be a non-empty string`);
      }
    }
  }

  const tests = manifest.tests;
  const classified = new Map();
  if (!plainObject(tests)) {
    failures.push("test portability manifest: tests must be an object");
  } else {
    for (const [classification, paths] of Object.entries(tests)) {
      if (!classifications.has(classification)) {
        failures.push(`test portability manifest: unknown classification ${classification}`);
        continue;
      }
      if (!Array.isArray(paths)) {
        failures.push(`test portability manifest: tests.${classification} must be an array`);
        continue;
      }
      for (const relative of paths) {
        if (!isSafeRelative(relative)) {
          failures.push(`test portability manifest: unsafe test path ${String(relative)}`);
          continue;
        }
        if (classified.has(relative)) {
          failures.push(`test portability manifest: ${relative} is classified more than once`);
          continue;
        }
        const absolute = path.join(pluginRoot, relative);
        try {
          const stat = await fs.lstat(absolute);
          if (stat.isSymbolicLink()) throw new Error("symlink test path is not allowed");
          if (!stat.isFile()) throw new Error("test path must be a regular file");
          classified.set(relative, classification);
        } catch (error) {
          failures.push(`test portability manifest: ${relative} is not a regular test file (${error.message})`);
        }
      }
    }
  }

  const expected = [
    ...await regularFiles(path.join(pluginRoot, "tests", "unit-tests"), "Test.php"),
    ...await regularFiles(path.join(pluginRoot, "tests", "e2e", "specs"), ".spec.js"),
  ].map((absolute) => path.relative(pluginRoot, absolute).split(path.sep).join("/"));
  discoveredTests = expected.length;
  classifiedTests = classified.size;
  for (const relative of expected) {
    if (!classified.has(relative)) failures.push(`test portability manifest: ${relative} is missing from tests classification`);
  }

  if (!plainObject(manifest.criticalBehaviorCoverage) || Object.keys(manifest.criticalBehaviorCoverage).length === 0) {
    failures.push("test portability manifest: criticalBehaviorCoverage must be a non-empty object");
  } else {
    for (const [behavior, mapping] of Object.entries(manifest.criticalBehaviorCoverage)) {
      if (!plainObject(mapping)) {
        failures.push(`test portability manifest: critical behavior ${behavior} must be an object`);
        continue;
      }
      for (const [target, allowedClassifications] of [["source", ["source-internal"]], ["artifact", ["artifact-e2e", "portable-contract"]]]) {
        if (!Array.isArray(mapping[target])) {
          failures.push(`test portability manifest: critical behavior ${behavior}.${target} must be an array`);
          continue;
        }
        for (const relative of mapping[target]) {
          if (!allowedClassifications.includes(classified.get(relative))) {
          const expected = allowedClassifications.length === 1
            ? `a ${allowedClassifications[0]} test`
            : `${allowedClassifications.slice(0, -1).join(" or ")} or ${allowedClassifications.at(-1)} test`;
          failures.push(`test portability manifest: critical behavior ${behavior}.${target} mapping must reference ${expected}`);
          }
        }
      }
      if (typeof mapping.status !== "string" || !["mapped", "blocked-needs-portable-contract"].includes(mapping.status) && !mapping.status.startsWith("blocked-")) {
        failures.push(`test portability manifest: critical behavior ${behavior} has invalid status`);
      }
      if (mapping.status === "mapped" && (!mapping.source?.length || !mapping.artifact?.length)) {
        failures.push(`test portability manifest: mapped critical behavior ${behavior} requires source and artifact evidence`);
      }
    }
  }

  if (!Array.isArray(manifest.promotionBlockers) || manifest.promotionBlockers.length === 0) {
    failures.push("test portability manifest: draft evidence requires non-empty promotionBlockers");
  } else if (manifest.promotionBlockers.some((blocker) => typeof blocker !== "string" || blocker === "")) {
    failures.push("test portability manifest: promotionBlockers must contain non-empty strings");
  }
  evidence.push(`${discoveredTests} test files discovered`);
  evidence.push(`${classifiedTests} test paths classified`);
}

const report = {
  schema: 1,
  generatedBy: "tools/validate-test-portability-manifest.mjs",
  consumer,
  status: failures.length === 0 ? "valid-review-evidence" : "blocked",
  promotionReady: false,
  discoveredTests,
  classifiedTests,
  failures,
  evidence,
  promotionRule: "Structural validity preserves draft review evidence only; it cannot approve a Profile A artifact.",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
