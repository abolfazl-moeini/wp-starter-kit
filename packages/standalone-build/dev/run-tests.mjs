#!/usr/bin/env node

/**
 * Bounded Test Scheduler and Tier Runner
 *
 * Capabilities:
 * - Bounded concurrency scheduling (--jobs=N, default: 4, min: 1, max: 16)
 * - Strict Tier Partitioning:
 *     --tier=unit (pure AST transformers, validators, parsers, registries)
 *     --tier=contract (filesystem contracts, journals, manifest verification)
 *     --tier=integration (end-to-end pipelines, WAL rollback, regressions)
 *     --tier=meta (scheduler, profiler, and tier runner tests)
 *     --tier=fast (unit + contract)
 *     --tier=full / --tier=release (all canonical files, 100% disk coverage)
 * - Explicit Recursion Guard (__ANTIGRAVITY_RUN_TESTS_ACTIVE)
 * - Safe early cancellation on failure with SIGTERM/SIGKILL tree termination
 * - Independent TAP parsing, exit codes, and durations per test file
 * - Zero workspace file mutations during execution
 */

import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { CANONICAL_TEST_REGISTRY, TEST_TIERS } from "../test-dependency-registry.mjs";
import { resolveContentRoot } from "../resolve-content-root.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(__dirname, "..");
const defaultTestsDir = path.join(toolsDir, "tests");
function getFallbackContentRoot() {
  try {
    return resolveContentRoot({ scriptDir: toolsDir, cwd: process.cwd(), env: process.env });
  } catch {
    return process.cwd();
  }
}
const contentRoot = getFallbackContentRoot();

export { TEST_TIERS };

export function resolveTierFiles(tier = "full", customRegistry = CANONICAL_TEST_REGISTRY) {
  const normalizedTier = String(tier).toLowerCase().trim();
  if (normalizedTier === "full" || normalizedTier === "release") {
    return Object.keys(customRegistry).sort();
  }
  if (normalizedTier === "unit") {
    return Object.entries(customRegistry).filter(([, v]) => v.tier === "unit").map(([k]) => k).sort();
  }
  if (normalizedTier === "contract") {
    return Object.entries(customRegistry).filter(([, v]) => v.tier === "contract").map(([k]) => k).sort();
  }
  if (normalizedTier === "integration") {
    return Object.entries(customRegistry).filter(([, v]) => v.tier === "integration").map(([k]) => k).sort();
  }
  if (normalizedTier === "meta") {
    return Object.entries(customRegistry).filter(([, v]) => v.tier === "meta").map(([k]) => k).sort();
  }
  if (normalizedTier === "fast") {
    return Object.entries(customRegistry)
      .filter(([, v]) => v.tier === "unit" || v.tier === "contract")
      .map(([k]) => k)
      .sort();
  }
  throw new Error(`Unknown test tier '${tier}' (valid tiers: unit, contract, integration, meta, fast, full, release)`);
}

export async function executeSingleTest(testFileName, options = {}) {
  const targetDir = options.testsDir || defaultTestsDir;
  const fullPath = path.isAbsolute(testFileName) ? testFileName : path.join(targetDir, testFileName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`executeSingleTest: file missing '${fullPath}'`);
  }

  const startTime = performance.now();
  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  let child = null;

  const cleanEnv = { ...process.env, NODE_ENV: "test", __ANTIGRAVITY_RUN_TESTS_ACTIVE: "1" };
  delete cleanEnv.NODE_TEST_CONTEXT;

  try {
    const res = await new Promise((resolve, reject) => {
      child = spawn(process.execPath, ["--test", "--test-reporter=tap", fullPath], {
        cwd: options.contentRoot || contentRoot,
        env: cleanEnv,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let abortHandler;
      if (options.signal) {
        abortHandler = () => {
          try {
            child.kill("SIGTERM");
            setTimeout(() => {
              try { child.kill("SIGKILL"); } catch {}
            }, 500);
          } catch {}
        };
        options.signal.addEventListener("abort", abortHandler, { once: true });
      }

      const outChunks = [];
      const errChunks = [];
      let totalOutBytes = 0;
      let totalErrBytes = 0;
      const MAX_CHUNK_BYTES = 512 * 1024; // 512KB bound

      child.stdout.on("data", (c) => {
        if (totalOutBytes < MAX_CHUNK_BYTES) {
          outChunks.push(c);
          totalOutBytes += c.length;
        }
      });
      child.stderr.on("data", (c) => {
        if (totalErrBytes < MAX_CHUNK_BYTES) {
          errChunks.push(c);
          totalErrBytes += c.length;
        }
      });

      child.on("error", (err) => {
        if (abortHandler && options.signal) {
          options.signal.removeEventListener("abort", abortHandler);
        }
        reject(err);
      });
      child.on("close", (code) => {
        if (abortHandler && options.signal) {
          options.signal.removeEventListener("abort", abortHandler);
        }
        resolve({
          code,
          stdout: Buffer.concat(outChunks).toString("utf8"),
          stderr: Buffer.concat(errChunks).toString("utf8"),
        });
      });
    });

    exitCode = res.code;
    stdout = res.stdout;
    stderr = res.stderr;
  } catch (err) {
    exitCode = typeof err.code === "number" ? err.code : 1;
    stderr = err.message || "";
  }

  const durationMs = Number((performance.now() - startTime).toFixed(2));
  const okMatches = stdout.match(/(?:^|\n)\s*ok\s+\d+/g) || [];
  const notOkMatches = stdout.match(/(?:^|\n)\s*not ok\s+\d+/g) || [];
  const passedCount = okMatches.length;
  const failedCount = notOkMatches.length;

  return {
    testFile: path.basename(testFileName),
    exitCode,
    passed: exitCode === 0 && failedCount === 0,
    durationMs,
    subtestCount: passedCount + failedCount,
    passedCount,
    failedCount,
    stdout,
    stderr,
  };
}

export async function runTestScheduler(options = {}) {
  // Recursion Guard
  if (process.env.__ANTIGRAVITY_RUN_TESTS_ACTIVE === "1" && !options.allowNested) {
    throw new Error("RecursionGuard: Nested runTestScheduler invocation detected! Test runners must not invoke test runners recursively.");
  }

  const jobsLimit = Math.max(1, Math.min(Number(options.jobs) || 4, 16));
  const tier = options.tier || "full";
  const bailOnFirstFailure = Boolean(options.bail);
  const targetDir = options.testsDir || defaultTestsDir;
  if (!fs.existsSync(targetDir)) {
    throw new Error(`runTestScheduler: tests directory missing '${targetDir}'`);
  }
  
  let selectedFiles = [];
  if (options.files) {
    selectedFiles = options.files.slice().sort();
  } else if (options.customRegistry) {
    selectedFiles = resolveTierFiles(tier, options.customRegistry);
  } else {
    selectedFiles = resolveTierFiles(tier);
  }

  const allFilesOnDisk = (await readdir(targetDir)).filter((f) => f.endsWith(".test.mjs")).sort();
  const skippedCount = allFilesOnDisk.length - selectedFiles.length;

  const tStart = performance.now();
  const results = [];
  let isAborted = false;
  let processesSpawned = 0;
  const abortController = new AbortController();

  // Bounded worker pool
  const queue = [...selectedFiles];

  async function worker() {
    while (queue.length > 0) {
      if (isAborted) break;
      const file = queue.shift();
      if (!file) break;

      processesSpawned++;
      try {
        const res = options.executor
          ? await options.executor(file)
          : await executeSingleTest(file, {
              signal: abortController.signal,
              testsDir: targetDir,
              contentRoot: options.contentRoot,
            });
        results.push(res);

        if (!res.passed && bailOnFirstFailure) {
          isAborted = true;
          abortController.abort();
          break;
        }
      } catch (err) {
        results.push({
          testFile: file,
          exitCode: 1,
          passed: false,
          durationMs: 0,
          subtestCount: 0,
          passedCount: 0,
          failedCount: 1,
          stdout: "",
          stderr: err.message,
        });
        if (bailOnFirstFailure) {
          isAborted = true;
          abortController.abort();
          break;
        }
      }
    }
  }

  const workerPromises = [];
  const workerCount = Math.min(jobsLimit, queue.length);
  for (let i = 0; i < workerCount; i++) {
    workerPromises.push(worker());
  }

  await Promise.all(workerPromises);

  const totalWallMs = Number((performance.now() - tStart).toFixed(2));
  const totalSubtests = results.reduce((acc, r) => acc + r.subtestCount, 0);
  const totalPassed = results.reduce((acc, r) => acc + r.passedCount, 0);
  const totalFailed = results.reduce((acc, r) => acc + r.failedCount, 0);

  return {
    schemaVersion: "3.0.0",
    tier,
    concurrency: jobsLimit,
    totalFilesOnDisk: allFilesOnDisk.length,
    selectedFilesCount: selectedFiles.length,
    skippedFilesCount: skippedCount,
    processesSpawned,
    totalSubtests,
    totalPassed,
    totalFailed,
    totalWallMs,
    allPassed: totalFailed === 0 && results.every((r) => r.passed),
    results: results.sort((a, b) => b.durationMs - a.durationMs),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const jobsArg = args.find((a) => a.startsWith("--jobs="));
  const tierArg = args.find((a) => a.startsWith("--tier="));
  const bailArg = args.includes("--bail");

  const jobs = jobsArg ? parseInt(jobsArg.split("=")[1], 10) : 4;
  const tier = tierArg ? tierArg.split("=")[1] : "full";

  console.log(`🚀 Starting Test Scheduler (tier=${tier}, jobs=${jobs})...`);
  runTestScheduler({ jobs, tier, bail: bailArg }).then((report) => {
    console.log(`\n================ TEST EXECUTION SUMMARY ================`);
    console.log(`Tier: ${report.tier} | Concurrency: ${report.concurrency}`);
    console.log(`Selected Files: ${report.selectedFilesCount} | Skipped Files: ${report.skippedFilesCount}`);
    console.log(`Subtests Executed: ${report.totalSubtests} (Passed: ${report.totalPassed}, Failed: ${report.totalFailed})`);
    console.log(`Processes Spawned: ${report.processesSpawned}`);
    console.log(`Total Wall Time: ${(report.totalWallMs / 1000).toFixed(2)}s`);
    console.log(`Status: ${report.allPassed ? "✅ ALL PASSED" : "❌ FAILURES DETECTED"}`);
    console.log(`========================================================\n`);

    if (!report.allPassed) {
      console.log("\n❌ FAILED TESTS DETAILS:");
      for (const r of report.results.filter((res) => !res.passed)) {
        console.log(`\n--- [${r.testFile}] (exit code: ${r.exitCode}) ---`);
        if (r.stderr) console.error("STDERR:", r.stderr);
        if (r.stdout) console.log("STDOUT:", r.stdout.slice(-1500));
      }
      process.exit(1);
    }
  });
}
