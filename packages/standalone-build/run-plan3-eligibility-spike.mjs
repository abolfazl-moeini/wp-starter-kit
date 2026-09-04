#!/usr/bin/env node

import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const FORBIDDEN_CHECKS = [
  { name: "eval", regex: /\beval\s*\(/i, message: "AST eval expression forbidden" },
  { name: "create_function", regex: /\bcreate_function\s*\(/i, message: "create_function() forbidden on PHP 7.4" },
  { name: "string_assert", regex: /\bassert\s*\(\s*["']/i, message: "Runtime string assert() forbidden" },
  { name: "preg_replace_e", regex: /\bpreg_replace\s*\(\s*["'][^"']*\/e["']/i, message: "preg_replace /e modifier forbidden" },
  { name: "dynamic_include", regex: /\b(?:include|include_once|require|require_once)\s*(?:\(|)\s*\$[a-z_]/i, message: "Dynamic include/require path is not eligible" },
  { name: "dynamic_callable", regex: /\bcall_user_func(?:_array)?\s*\(|\$[a-z_][a-z0-9_]*\s*\(/i, message: "Dynamic callable domain is not proven" },
];

export async function scanPhpFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(baseDir, full).split(path.sep).join("/");
    if (
      entry.name.startsWith(".") ||
      entry.name === "node_modules" ||
      entry.name === "vendor" ||
      entry.name === "tests" ||
      entry.name === "dev" ||
      entry.name === "dist"
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      files = files.concat(await scanPhpFiles(full, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".php")) {
      files.push({ fullPath: full, relPath: rel });
    }
  }
  return files;
}

export async function runPlan3EligibilitySpike({ rootDir }) {
  const phpFiles = await scanPhpFiles(rootDir);
  const forbiddenPatterns = [];
  const eligibleFiles = [];
  const frozenContracts = [];

  for (const file of phpFiles) {
    const content = await readFile(file.fullPath, "utf8");
    const stat = await lstat(file.fullPath);

    for (const check of FORBIDDEN_CHECKS) {
      if (check.regex.test(content)) {
        forbiddenPatterns.push({
          file: file.relPath,
          pattern: check.name,
          message: check.message,
        });
      }
    }

    const hasRest = /register_rest_route\s*\(/i.test(content);
    const isMain = path.basename(file.fullPath) === `${path.basename(rootDir)}.php`;

    if (isMain || hasRest) {
      frozenContracts.push({
        path: file.relPath,
        type: isMain ? "main-entry" : "rest-contract",
      });
    } else {
      eligibleFiles.push({
        path: file.relPath,
        sizeBytes: stat.size,
        role: "transformable-private",
      });
    }
  }

  const status = forbiddenPatterns.length === 0 ? "ready" : "blocked";
  return {
    schema: 1,
    generatedBy: "tools/run-plan3-eligibility-spike.mjs",
    rootDir,
    status,
    totalFiles: phpFiles.length,
    eligibleFiles,
    frozenContracts,
    forbiddenPatterns,
  };
}

if (process.argv[1] && process.argv[1].endsWith("run-plan3-eligibility-spike.mjs")) {
  const root = path.resolve(process.argv[2] || process.cwd());
  runPlan3EligibilitySpike({ rootDir: root }).then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "ready") process.exit(1);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
