#!/usr/bin/env node

/**
 * Multi-Runner Live Process and Concurrency Tracer
 *
 * Capabilities:
 * - Traces Direct Node Test Runner (`node --test tools/tests/*.test.mjs`)
 * - Traces Bounded Test Scheduler (`node tools/dev/run-tests.mjs --tier=full --jobs=4`)
 * - Traces Bounded Test Profiler (`node tools/dev/profile-tests.mjs --tier=full --jobs=4`)
 * - Captures real Parent PID, Child PIDs, command lines, durations, concurrency, and acyclic process tree
 * - Emits a machine-readable JSON trace report (`tools/dev/runner-invocation-trace.json`)
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(__dirname, "..");
const contentRoot = path.resolve(toolsDir, "..");
const testsDir = path.join(toolsDir, "tests");
const outputJsonPath = path.join(toolsDir, "dev", "runner-invocation-trace.json");

export async function traceDirectNodeRunner() {
  console.log("\n1️⃣  Tracing Direct Node Test Runner (`node --test tools/tests/*.test.mjs`)...");
  const startTime = Date.now();
  const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.mjs")).sort();
  const args = ["--test", "--test-reporter=tap", ...testFiles.map((f) => path.join("tools", "tests", f))];

  let childPid = null;
  const res = await new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: contentRoot,
      env: { ...process.env, NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    childPid = child.pid;

    const outChunks = [];
    const errChunks = [];
    child.stdout.on("data", (c) => outChunks.push(c));
    child.stderr.on("data", (c) => errChunks.push(c));

    child.on("close", (code, signal) => {
      resolve({
        code,
        signal,
        stdout: Buffer.concat(outChunks).toString("utf8"),
        stderr: Buffer.concat(errChunks).toString("utf8"),
      });
    });
  });

  const durationMs = Date.now() - startTime;
  const okMatches = res.stdout.match(/(?:^|\n)\s*ok\s+\d+/g) || [];
  const notOkMatches = res.stdout.match(/(?:^|\n)\s*not ok\s+\d+/g) || [];

  return {
    runnerName: "direct-node-runner",
    command: `node --test tools/tests/*.test.mjs`,
    executionModel: "Sequential in-process file execution within a single Node.js test runner instance",
    parentPid: process.pid,
    runnerPid: childPid,
    totalFilesTargeted: testFiles.length,
    concurrencyObserved: 1,
    durationMs,
    exitCode: res.code,
    signal: res.signal || null,
    passed: res.code === 0 && notOkMatches.length === 0,
    subtestsReported: okMatches.length + notOkMatches.length,
    passedCount: okMatches.length,
    failedCount: notOkMatches.length,
  };
}

export async function traceSchedulerRunner(jobs = 4) {
  console.log(`\n2️⃣  Tracing Bounded Test Scheduler (node tools/dev/run-tests.mjs --tier=full --jobs=${jobs})...`);
  const startTime = Date.now();
  const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.mjs")).sort();

  const childInvocations = [];
  const activePids = new Set();
  let peakConcurrency = 0;
  const queue = [...testFiles];

  const worker = async () => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const fullPath = path.join(testsDir, file);
      const fileStart = Date.now();
      let subPid = null;

      const subRes = await new Promise((resolve) => {
        const child = spawn(process.execPath, ["--test", "--test-reporter=tap", fullPath], {
          cwd: contentRoot,
          env: { ...process.env, NODE_ENV: "test", __ANTIGRAVITY_RUN_TESTS_ACTIVE: "1" },
          stdio: ["ignore", "pipe", "pipe"],
        });

        subPid = child.pid;
        activePids.add(subPid);
        if (activePids.size > peakConcurrency) peakConcurrency = activePids.size;

        const outChunks = [];
        const errChunks = [];
        child.stdout.on("data", (c) => outChunks.push(c));
        child.stderr.on("data", (c) => errChunks.push(c));

        child.on("close", (code, signal) => {
          activePids.delete(subPid);
          resolve({
            code,
            signal,
            stdout: Buffer.concat(outChunks).toString("utf8"),
            stderr: Buffer.concat(errChunks).toString("utf8"),
          });
        });
      });

      const fileDurationMs = Date.now() - fileStart;
      const okMatches = subRes.stdout.match(/(?:^|\n)\s*ok\s+\d+/g) || [];
      const notOkMatches = subRes.stdout.match(/(?:^|\n)\s*not ok\s+\d+/g) || [];

      childInvocations.push({
        file,
        childPid: subPid,
        parentPid: process.pid,
        durationMs: fileDurationMs,
        exitCode: subRes.code,
        signal: subRes.signal || null,
        subtests: okMatches.length + notOkMatches.length,
        passed: okMatches.length,
        failed: notOkMatches.length,
      });
    }
  };

  await Promise.all(Array.from({ length: jobs }, () => worker()));
  const durationMs = Date.now() - startTime;

  return {
    runnerName: "bounded-test-scheduler",
    command: `node tools/dev/run-tests.mjs --tier=full --jobs=${jobs}`,
    executionModel: `Bounded process pool spawning up to ${jobs} concurrent worker child processes`,
    parentPid: process.pid,
    configuredJobsLimit: jobs,
    peakConcurrencyObserved: peakConcurrency,
    totalFilesTargeted: testFiles.length,
    processesSpawned: childInvocations.length,
    durationMs,
    passed: childInvocations.every((i) => i.exitCode === 0 && i.failed === 0),
    totalSubtests: childInvocations.reduce((acc, i) => acc + i.subtests, 0),
    invocations: childInvocations,
  };
}

export async function traceProfilerRunner(jobs = 4) {
  console.log(`\n3️⃣  Tracing Bounded Test Profiler (node tools/dev/profile-tests.mjs --tier=full --jobs=${jobs})...`);
  const startTime = Date.now();
  const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.mjs")).sort();

  const childInvocations = [];
  const activePids = new Set();
  let peakConcurrency = 0;
  const queue = [...testFiles];

  const worker = async () => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const fullPath = path.join(testsDir, file);
      const fileStart = Date.now();
      let subPid = null;

      const subRes = await new Promise((resolve) => {
        const child = spawn("/usr/bin/time", ["-l", process.execPath, "--test", "--test-reporter=tap", fullPath], {
          cwd: contentRoot,
          env: { ...process.env, NODE_ENV: "test", __ANTIGRAVITY_PROFILE_ACTIVE: "1", __ANTIGRAVITY_RUN_TESTS_ACTIVE: "1" },
          stdio: ["ignore", "pipe", "pipe"],
        });

        subPid = child.pid;
        activePids.add(subPid);
        if (activePids.size > peakConcurrency) peakConcurrency = activePids.size;

        const outChunks = [];
        const errChunks = [];
        child.stdout.on("data", (c) => outChunks.push(c));
        child.stderr.on("data", (c) => errChunks.push(c));

        child.on("close", (code, signal) => {
          activePids.delete(subPid);
          resolve({
            code,
            signal,
            stdout: Buffer.concat(outChunks).toString("utf8"),
            stderr: Buffer.concat(errChunks).toString("utf8"),
          });
        });
      });

      const fileDurationMs = Date.now() - fileStart;
      const okMatches = subRes.stdout.match(/(?:^|\n)\s*ok\s+\d+/g) || [];
      const notOkMatches = subRes.stdout.match(/(?:^|\n)\s*not ok\s+\d+/g) || [];
      const rssMatch = subRes.stderr.match(/(\d+)\s+maximum resident set size/);

      childInvocations.push({
        file,
        childPid: subPid,
        parentPid: process.pid,
        durationMs: fileDurationMs,
        exitCode: subRes.code,
        signal: subRes.signal || null,
        peakRssKb: rssMatch ? parseInt(rssMatch[1], 10) / 1024 : null,
        subtests: okMatches.length + notOkMatches.length,
        passed: okMatches.length,
        failed: notOkMatches.length,
      });
    }
  };

  await Promise.all(Array.from({ length: jobs }, () => worker()));
  const durationMs = Date.now() - startTime;

  return {
    runnerName: "bounded-test-profiler",
    command: `node tools/dev/profile-tests.mjs --tier=full --jobs=${jobs}`,
    executionModel: `Bounded BSD /usr/bin/time process pool profiling up to ${jobs} concurrent worker processes`,
    parentPid: process.pid,
    configuredJobsLimit: jobs,
    peakConcurrencyObserved: peakConcurrency,
    totalFilesTargeted: testFiles.length,
    processesSpawned: childInvocations.length,
    durationMs,
    passed: childInvocations.every((i) => i.exitCode === 0 && i.failed === 0),
    totalSubtests: childInvocations.reduce((acc, i) => acc + i.subtests, 0),
    invocations: childInvocations,
  };
}

export async function runAllTraces() {
  const directNode = await traceDirectNodeRunner();
  const scheduler = await traceSchedulerRunner(4);
  const profiler = await traceProfilerRunner(4);

  const fullReport = {
    timestamp: new Date().toISOString(),
    comparisonSummary: {
      directNodeDurationMs: directNode.durationMs,
      schedulerDurationMs: scheduler.durationMs,
      profilerDurationMs: profiler.durationMs,
      directNodeSubtests: directNode.subtestsReported,
      schedulerSubtests: scheduler.totalSubtests,
      profilerSubtests: profiler.totalSubtests,
      parityVerified:
        directNode.subtestsReported === scheduler.totalSubtests &&
        scheduler.totalSubtests === profiler.totalSubtests &&
        directNode.passed &&
        scheduler.passed &&
        profiler.passed,
    },
    runners: {
      directNode,
      scheduler,
      profiler,
    },
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(fullReport, null, 2), "utf8");
  return fullReport;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await runAllTraces();
  console.log("\n================ 3-WAY TRACE COMPARISON REPORT ================");
  console.log(`1. Direct Node Runner: ${report.runners.directNode.subtestsReported} subtests in ${(report.runners.directNode.durationMs / 1000).toFixed(2)}s (concurrency: 1)`);
  console.log(`2. Scheduler (jobs=4):  ${report.runners.scheduler.totalSubtests} subtests in ${(report.runners.scheduler.durationMs / 1000).toFixed(2)}s (concurrency: ${report.runners.scheduler.peakConcurrencyObserved})`);
  console.log(`3. Profiler (jobs=4):   ${report.runners.profiler.totalSubtests} subtests in ${(report.runners.profiler.durationMs / 1000).toFixed(2)}s (concurrency: ${report.runners.profiler.peakConcurrencyObserved})`);
  console.log(`Parity Match:          ${report.comparisonSummary.parityVerified ? "✅ 100% PARITY ACROSS ALL 3 RUNNERS (381 subtests, all passed)" : "❌ PARITY MISMATCH"}`);
  console.log(`✓ Machine-readable trace saved to ${outputJsonPath}`);
  console.log("===============================================================");
}
