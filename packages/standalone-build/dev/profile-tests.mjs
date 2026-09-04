#!/usr/bin/env node

/**
 * Repeatable Test Suite Profiler
 *
 * Capabilities:
 * - Measures per-test-file wall time, CPU user/system time, and peak memory (RSS)
 * - Identifies slowest tests and bottlenecks across the suite
 * - Supports test tiers (--tier=unit, --tier=contract, --tier=integration, --tier=meta, --tier=fast, --tier=full)
 * - Bounded concurrency (--jobs=N)
 * - Explicit Recursion Guard (__ANTIGRAVITY_PROFILE_ACTIVE)
 * - Anomaly detection: Fails if any test file is executed more than once per run
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

export async function profileSingleTestFile(testFileName, options = {}) {
  const targetDir = options.testsDir || defaultTestsDir;
  const fullPath = path.isAbsolute(testFileName) ? testFileName : path.join(targetDir, testFileName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Test file missing: ${fullPath}`);
  }

  const startCpu = process.cpuUsage();
  const startWall = performance.now();

  const isBsdTime = process.platform === "darwin";
  let wallMs = 0;
  let cpuUserMs = 0;
  let cpuSystemMs = 0;
  let peakRssBytes = 0;
  let exitCode = 0;
  let stdout = "";
  let stderr = "";
  let subtestCount = 0;
  let passedCount = 0;
  let failedCount = 0;

  const cleanEnv = {
    ...process.env,
    NODE_ENV: "test",
    __ANTIGRAVITY_PROFILE_ACTIVE: "1",
    __ANTIGRAVITY_RUN_TESTS_ACTIVE: "1",
  };
  delete cleanEnv.NODE_TEST_CONTEXT;

  if (isBsdTime) {
    try {
      const timeResult = await execFileAsync("/usr/bin/time", ["-l", process.execPath, "--test", "--test-reporter=tap", fullPath], {
        cwd: options.contentRoot || contentRoot,
        env: cleanEnv,
      });
      stdout = timeResult.stdout || "";
      stderr = timeResult.stderr || "";
    } catch (err) {
      exitCode = typeof err.code === "number" ? err.code : 1;
      stdout = err.stdout || "";
      stderr = err.stderr || "";
    }

    const elapsedMatch = stderr.match(/([\d.]+)\s+real/);
    const userMatch = stderr.match(/([\d.]+)\s+user/);
    const sysMatch = stderr.match(/([\d.]+)\s+sys/);
    const rssMatch = stderr.match(/(\d+)\s+maximum resident set size/);

    wallMs = elapsedMatch ? parseFloat(elapsedMatch[1]) * 1000 : Number((performance.now() - startWall).toFixed(2));
    cpuUserMs = userMatch ? parseFloat(userMatch[1]) * 1000 : 0;
    cpuSystemMs = sysMatch ? parseFloat(sysMatch[1]) * 1000 : 0;
    peakRssBytes = rssMatch ? parseInt(rssMatch[1], 10) : 0;
  } else {
    try {
      const res = await execFileAsync(process.execPath, ["--test", "--test-reporter=tap", fullPath], {
        cwd: options.contentRoot || contentRoot,
        env: cleanEnv,
      });
      stdout = res.stdout || "";
      stderr = res.stderr || "";
      wallMs = Number((performance.now() - startWall).toFixed(2));
      const endCpu = process.cpuUsage(startCpu);
      cpuUserMs = endCpu.user / 1000;
      cpuSystemMs = endCpu.system / 1000;
    } catch (err) {
      exitCode = typeof err.code === "number" ? err.code : 1;
      stdout = err.stdout || "";
      stderr = err.stderr || "";
      wallMs = Number((performance.now() - startWall).toFixed(2));
    }
  }

  const durationMs = wallMs;
  const okMatches = stdout.match(/(?:^|\n)\s*ok\s+\d+/g) || [];
  const notOkMatches = stdout.match(/(?:^|\n)\s*not ok\s+\d+/g) || [];
  passedCount = okMatches.length;
  failedCount = notOkMatches.length;
  subtestCount = passedCount + failedCount;

  return {
    testFile: path.basename(testFileName),
    exitCode,
    passed: exitCode === 0 && failedCount === 0,
    wallMs,
    cpuUserMs,
    cpuSystemMs,
    peakRssBytes,
    peakRssMb: Number((peakRssBytes / (1024 * 1024)).toFixed(2)),
    subtestCount,
    passedCount,
    failedCount,
  };
}

export async function runFullSuiteProfiling(options = {}) {
  // Recursion Guard
  if (process.env.__ANTIGRAVITY_PROFILE_ACTIVE === "1" && !options.allowNested) {
    throw new Error("RecursionGuard: Nested profile-tests invocation detected! Profiler must not invoke profiler recursively.");
  }

  const jobsLimit = Math.max(1, Math.min(Number(options.jobs) || 4, 16));
  const tier = options.tier || "full";
  const targetDir = options.testsDir || defaultTestsDir;
  if (!fs.existsSync(targetDir)) {
    throw new Error(`runFullSuiteProfiling: tests directory missing '${targetDir}'`);
  }

  let testFiles = [];
  if (options.files) {
    testFiles = options.files.slice().sort();
  } else if (options.customRegistry) {
    testFiles = resolveTierFiles(tier, options.customRegistry);
  } else {
    testFiles = resolveTierFiles(tier);
  }

  console.log(`⏱️ Profiling test suite (tier=${tier}, ${testFiles.length} files, concurrency=${jobsLimit})...`);

  const tStart = performance.now();
  const fileResults = [];
  const invocationCounts = new Map();

  // Execute using continuous worker pool to eliminate idle slot wait in static batches
  const queue = [...testFiles];
  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const count = (invocationCounts.get(file) || 0) + 1;
      invocationCounts.set(file, count);
      if (count > 1) {
        throw new Error(`AnomalyDetected: Test file '${file}' was invoked multiple times (${count}) during a single profiling run!`);
      }
      const res = await profileSingleTestFile(file, { ...options, testsDir: targetDir });
      fileResults.push(res);
    }
  }

  const workerPromises = [];
  const workerCount = Math.min(jobsLimit, queue.length);
  for (let i = 0; i < workerCount; i++) {
    workerPromises.push(worker());
  }
  await Promise.all(workerPromises);

  const totalWallMs = Number((performance.now() - tStart).toFixed(2));

  // Sort descending by wallMs to identify bottlenecks
  const ranked = [...fileResults].sort((a, b) => b.wallMs - a.wallMs);
  const totalSubtests = fileResults.reduce((acc, r) => acc + r.subtestCount, 0);
  const totalPassed = fileResults.reduce((acc, r) => acc + r.passedCount, 0);
  const totalFailed = fileResults.reduce((acc, r) => acc + r.failedCount, 0);

  const report = {
    schemaVersion: "3.0.0",
    generatedAt: new Date().toISOString(),
    tier,
    concurrency: jobsLimit,
    totalFiles: testFiles.length,
    processesSpawned: fileResults.length,
    totalSubtests,
    totalPassed,
    totalFailed,
    totalWallMs,
    top10SlowestFiles: ranked.slice(0, 10),
    fileResults: ranked,
  };

  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobsArg = process.argv.find((a) => a.startsWith("--jobs="));
  const tierArg = process.argv.find((a) => a.startsWith("--tier="));
  const jobs = jobsArg ? parseInt(jobsArg.split("=")[1], 10) : 4;
  const tier = tierArg ? tierArg.split("=")[1] : "full";

  runFullSuiteProfiling({ jobs, tier }).then((rep) => {
    console.log(`\n================ PROFILING REPORT ================`);
    console.log(`Tier: ${rep.tier} | Concurrency: ${rep.concurrency}`);
    console.log(`Total Files: ${rep.totalFiles}`);
    console.log(`Processes Spawned: ${rep.processesSpawned}`);
    console.log(`Total Subtests: ${rep.totalSubtests} (Passed: ${rep.totalPassed}, Failed: ${rep.totalFailed})`);
    console.log(`Total Wall Time: ${(rep.totalWallMs / 1000).toFixed(2)}s`);
    console.log(`\nTop Slowest Test Files:`);
    rep.top10SlowestFiles.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${(f.wallMs / 1000).toFixed(2)}s | CPU: ${(f.cpuUserMs/1000).toFixed(2)}s usr / ${(f.cpuSystemMs/1000).toFixed(2)}s sys | RSS: ${f.peakRssMb}MB | Tests: ${f.subtestCount}] ${f.testFile}`);
    });
    console.log(`==================================================\n`);
  });
}
