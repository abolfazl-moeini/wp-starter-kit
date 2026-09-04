#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  computeAllFingerprintsParallel,
  writeAtomicCacheFile,
  loadBuildCacheRecord,
} from "../build-cache-engine.mjs";
import { MAX_JOBS_LIMIT } from "../build-all-standalone-plugins.mjs";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(path.join(scriptDir, ".."));
const contentRoot = path.resolve(path.join(toolsDir, ".."));
const benchmarkOut = path.join(toolsDir, "dev", "build-performance-benchmark.json");
const buildScript = path.join(toolsDir, "build-all-standalone-plugins.mjs");

export function parseBsdTimeOutput(stderr) {
  const res = {
    userSeconds: null,
    systemSeconds: null,
    realSeconds: null,
    maxRssBytes: null,
    supported: false,
  };
  if (!stderr || typeof stderr !== "string") return res;

  const timeMatch = stderr.match(/([0-9.]+)\s+real\s+([0-9.]+)\s+user\s+([0-9.]+)\s+sys/);
  if (timeMatch) {
    res.realSeconds = parseFloat(timeMatch[1]);
    res.userSeconds = parseFloat(timeMatch[2]);
    res.systemSeconds = parseFloat(timeMatch[3]);
    res.supported = true;
  }

  const rssMatch = stderr.match(/(\d+)\s+maximum resident set size/);
  if (rssMatch) {
    res.maxRssBytes = parseInt(rssMatch[1], 10);
    res.supported = true;
  }

  return res;
}

export function validateBenchmarkSchema(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, reason: "Benchmark data must be a plain object" };
  }
  if (data.schemaVersion !== "3.0.0") {
    return { valid: false, reason: `Invalid schemaVersion (expected '3.0.0', got '${data.schemaVersion}')` };
  }
  if (!data.command || typeof data.command !== "string") {
    return { valid: false, reason: "Missing command string" };
  }
  if (!data.git || typeof data.git !== "object") {
    return { valid: false, reason: "Missing git metadata object" };
  }
  if (typeof data.git.head !== "string" || !/^[a-f0-9]{40}$/.test(data.git.head)) {
    return { valid: false, reason: "Invalid git HEAD SHA in benchmark" };
  }
  if (typeof data.git.isDirty !== "boolean") {
    return { valid: false, reason: "Missing git isDirty boolean flag" };
  }
  if (!data.system || typeof data.system !== "object") {
    return { valid: false, reason: "Missing system metadata object" };
  }
  if (!data.metrics || typeof data.metrics !== "object") {
    return { valid: false, reason: "Missing metrics object" };
  }

  const requiredMetricCategories = ["fingerprinting", "coldBuild", "warmNoOp", "incrementalBuild"];
  for (const mKey of requiredMetricCategories) {
    const m = data.metrics[mKey];
    if (!m || typeof m !== "object") {
      return { valid: false, reason: `Missing metric category '${mKey}'` };
    }
    if (typeof m.iterations !== "number" || m.iterations < 1) {
      return { valid: false, reason: `Metric '${mKey}' has invalid iterations` };
    }
    if (typeof m.meanWallMs !== "number" || m.meanWallMs < 0) {
      return { valid: false, reason: `Metric '${mKey}' has invalid meanWallMs` };
    }
    if (!Array.isArray(m.samples) || m.samples.length !== m.iterations) {
      return { valid: false, reason: `Metric '${mKey}' samples count (${m.samples?.length}) must equal iterations (${m.iterations})` };
    }

    // Verify statistical recalculation matches samples
    const wallVals = m.samples.map((s) => s.wallMs).sort((a, b) => a - b);
    const expectedMin = wallVals[0];
    const expectedMax = wallVals[wallVals.length - 1];
    const expectedMean = Number((wallVals.reduce((a, b) => a + b, 0) / wallVals.length).toFixed(2));
    const expectedP50 = wallVals[Math.floor(wallVals.length / 2)];

    if (m.minWallMs !== expectedMin || m.maxWallMs !== expectedMax || m.meanWallMs !== expectedMean || m.p50WallMs !== expectedP50) {
      return { valid: false, reason: `Metric '${mKey}' statistics inconsistency: calculated (min:${expectedMin}, max:${expectedMax}, mean:${expectedMean}, p50:${expectedP50}) vs reported (min:${m.minWallMs}, max:${m.maxWallMs}, mean:${m.meanWallMs}, p50:${m.p50WallMs})` };
    }

    for (const s of m.samples) {
      if (typeof s.wallMs !== "number" || typeof s.cpuUserMs !== "number" || typeof s.cpuSystemMs !== "number") {
        return { valid: false, reason: `Sample in '${mKey}' missing wall or cpu metrics` };
      }
      if (typeof s.jobs !== "number" || s.jobs < 1) {
        return { valid: false, reason: `Sample in '${mKey}' missing jobs concurrency count` };
      }
      if (typeof s.exitCode !== "number") {
        return { valid: false, reason: `Sample in '${mKey}' missing process exitCode` };
      }
    }
  }

  // Verify concurrency scaling matrix
  if (data.concurrencyScaling) {
    for (const [k, v] of Object.entries(data.concurrencyScaling)) {
      if (!v || typeof v !== "object" || !v.coldBuild || !Array.isArray(v.coldBuild.samples)) {
        return { valid: false, reason: `Invalid concurrency scaling data for ${k}` };
      }
    }
  }

  return { valid: true };
}

async function getGitInfo() {
  let head = "0".repeat(40);
  let isDirty = false;
  let porcelain = "";
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: toolsDir });
    head = stdout.trim();
  } catch {}
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: toolsDir });
    porcelain = stdout.trim();
    isDirty = porcelain.length > 0;
  } catch {}
  return { head, isDirty, porcelainSummary: isDirty ? `${porcelain.split("\n").length} modified/untracked entries` : "clean" };
}

async function executeTimedProcess({ args, cwd, distDir, cacheFile }) {
  const startTime = performance.now();
  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  let timeParsed = { userSeconds: null, systemSeconds: null, maxRssBytes: null, supported: false };

  const isMac = process.platform === "darwin";
  const cmd = isMac ? "/usr/bin/time" : process.execPath;
  const processArgs = isMac ? ["-l", process.execPath, ...args] : args;

  try {
    const res = await execFileAsync(cmd, processArgs, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = res.stdout;
    stderr = res.stderr;
  } catch (err) {
    exitCode = err.code || 1;
    stdout = err.stdout || "";
    stderr = err.stderr || err.message;
  }
  const wallMs = Number((performance.now() - startTime).toFixed(2));

  if (isMac) {
    timeParsed = parseBsdTimeOutput(stderr);
  }

  const cpuUserMs = timeParsed.userSeconds !== null ? Number((timeParsed.userSeconds * 1000).toFixed(2)) : 0;
  const cpuSystemMs = timeParsed.systemSeconds !== null ? Number((timeParsed.systemSeconds * 1000).toFixed(2)) : 0;
  const rssBytes = timeParsed.maxRssBytes || 0;
  const rssMb = Number((rssBytes / (1024 * 1024)).toFixed(2));

  // Extract authentic rebuiltCount and cacheHitCount from the pipeline summary output
  let rebuiltCount = 0;
  let cacheHitCount = 0;
  const rebuiltMatch = stdout.match(/Rebuilt:\s+(\d+)/);
  if (rebuiltMatch) {
    rebuiltCount = parseInt(rebuiltMatch[1], 10);
  }
  const hitMatch = stdout.match(/Cache hit:\s+(\d+)/);
  if (hitMatch) {
    cacheHitCount = parseInt(hitMatch[1], 10);
  }

  return {
    command: `${process.execPath} ${args.join(" ")}`,
    args,
    cwd,
    distDir: distDir || null,
    cacheFile: cacheFile || null,
    exitCode,
    wallMs,
    cpuUserMs,
    cpuSystemMs,
    rssBytes,
    rssMb,
    rssSupported: timeParsed.supported,
    rebuiltCount,
    cacheHitCount,
    stderrSummary: stderr.slice(-300).trim(),
    stdoutSummary: stdout.slice(-300).trim(),
  };
}

function aggregateSamples(samples) {
  const wallValues = samples.map((s) => s.wallMs).sort((a, b) => a - b);
  const minWallMs = wallValues[0];
  const maxWallMs = wallValues[wallValues.length - 1];
  const meanWallMs = Number((wallValues.reduce((a, b) => a + b, 0) / wallValues.length).toFixed(2));
  const p50WallMs = wallValues[Math.floor(wallValues.length / 2)];

  const userCpuValues = samples.map((s) => s.cpuUserMs);
  const meanCpuUserMs = Number((userCpuValues.reduce((a, b) => a + b, 0) / userCpuValues.length).toFixed(2));

  const sysCpuValues = samples.map((s) => s.cpuSystemMs);
  const meanCpuSystemMs = Number((sysCpuValues.reduce((a, b) => a + b, 0) / sysCpuValues.length).toFixed(2));

  const rssValues = samples.map((s) => s.rssMb);
  const maxRssMb = Math.max(...rssValues);

  return {
    iterations: samples.length,
    minWallMs,
    p50WallMs,
    meanWallMs,
    maxWallMs,
    meanCpuUserMs,
    meanCpuSystemMs,
    maxRssMb,
    samples,
  };
}

export async function runBenchmarkHarness(options = {}) {
  const isMini = Boolean(options.mini);
  const targetJobs = options.jobs || (isMini ? [4] : [1, 2, 4]);
  const iterations = options.iterations || 2;
  const customContentRoot = options.contentRoot || contentRoot;
  const customToolsDir = options.toolsDir || toolsDir;
  const customPluginsDir = options.pluginsDir || path.join(customContentRoot, "plugins");
  const targetPlugins = options.targetPlugins || (isMini ? ["tavangary-theme-panel"] : ["tavangary-core", "tavangary-theme-panel", "wpdev-crm", "wpdev-tickets"]);
  const customExecutor = options.executor || executeTimedProcess;
  const customFingerprinter = options.fingerprinter || computeAllFingerprintsParallel;
  const writeReport = options.writeReport !== undefined ? options.writeReport : true;
  const customBenchmarkOut = options.benchmarkOut || benchmarkOut;

  console.log("⚡ Starting Rigorous Subprocess Benchmark Runner (Fully Isolated Fixtures)...");
  const gitInfo = options.gitInfo || (await getGitInfo());

  // Snapshot initial workspace fingerprint
  const initialFp = await customFingerprinter({
    scriptDir: customToolsDir,
    pluginsDir: customPluginsDir,
    targetPlugins,
    jobs: MAX_JOBS_LIMIT,
    contentRoot: customContentRoot,
  });

  // 1. Parallel Fingerprinting (In-Process throughput)
  console.log("  -> Measuring parallel fingerprinting throughput...");
  const fpSamples = [];
  for (let i = 0; i < (isMini ? 1 : 5); i++) {
    const startUsage = process.cpuUsage();
    const startMem = process.memoryUsage().rss;
    const startTime = performance.now();

    const fps = await customFingerprinter({
      scriptDir: customToolsDir,
      pluginsDir: customPluginsDir,
      targetPlugins,
      jobs: MAX_JOBS_LIMIT,
      contentRoot: customContentRoot,
    });

    const wallMs = Number((performance.now() - startTime).toFixed(2));
    const cpuDiff = process.cpuUsage(startUsage);
    const endMem = process.memoryUsage().rss;

    fpSamples.push({
      iteration: i + 1,
      jobs: MAX_JOBS_LIMIT,
      exitCode: 0,
      wallMs,
      cpuUserMs: Number((cpuDiff.user / 1000).toFixed(2)),
      cpuSystemMs: Number((cpuDiff.system / 1000).toFixed(2)),
      rssBytes: Math.max(startMem, endMem),
      rssMb: Number((Math.max(startMem, endMem) / (1024 * 1024)).toFixed(2)),
      workloadHash: fps.tools.slice(0, 16),
    });
  }
  const fpMetrics = aggregateSamples(fpSamples);

  // 2. Concurrency Scaling Across Jobs (1, 2, 4) in Isolated Fixtures (Cold, Warm, Incremental)
  const concurrencyScaling = {};
  for (const j of targetJobs) {
    console.log(`  -> Measuring Concurrency Scaling for jobs=${j}...`);
    const coldJobSamples = [];
    const warmJobSamples = [];
    const incJobSamples = [];
    const jobIterations = j === 4 ? iterations : 1;

    // A & B: Cold and Warm Builds
    for (let iter = 0; iter < (isMini ? 1 : jobIterations); iter++) {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `bench-j${j}-${iter}-`));
      const distDir = path.join(tmpDir, "dist");
      const cacheFile = path.join(distDir, ".build-cache.json");
      const receiptsDir = path.join(distDir, ".deploy-receipts");
      try {
        // 1. Measured Cold Build
        const coldArgs = [
          buildScript,
          `--jobs=${j}`,
          "--force",
          "--build-only",
          `--dist-dir=${distDir}`,
          `--cache-file=${cacheFile}`,
          `--receipts-dir=${receiptsDir}`,
        ];
        if (isMini) coldArgs.push(`--targets=${targetPlugins.join(",")}`);

        const coldSample = await customExecutor({
          args: coldArgs,
          cwd: customContentRoot,
          distDir,
          cacheFile,
          kind: "cold",
          jobs: j,
        });
        coldJobSamples.push({ iteration: iter + 1, jobs: j, ...coldSample });

        // 2. Measured Warm No-Op Build (using already-built cache from cold run)
        const warmArgs = [
          buildScript,
          `--jobs=${j}`,
          "--build-only",
          `--dist-dir=${distDir}`,
          `--cache-file=${cacheFile}`,
          `--receipts-dir=${receiptsDir}`,
        ];
        if (isMini) warmArgs.push(`--targets=${targetPlugins.join(",")}`);

        const warmSample = await customExecutor({
          args: warmArgs,
          cwd: customContentRoot,
          distDir,
          cacheFile,
          kind: "warm",
          jobs: j,
        });
        warmJobSamples.push({ iteration: iter + 1, jobs: j, ...warmSample });
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    // C. Incremental Changed-Only Builds
    for (let iter = 0; iter < (isMini ? 1 : jobIterations); iter++) {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `bench-inc-j${j}-${iter}-`));
      const distDir = path.join(tmpDir, "dist");
      const cacheFile = path.join(distDir, ".build-cache.json");
      const receiptsDir = path.join(distDir, ".deploy-receipts");
      const pluginsDir = path.join(tmpDir, "plugins");

      try {
        if (!options.executor) {
          // Copy isolated development sources only when running real executor
          await fs.promises.mkdir(pluginsDir, { recursive: true });
          const devSources = isMini
            ? targetPlugins.map((p) => `${p}-dev`).concat(["wpdev"])
            : ["tavangary-core-dev", "tavangary-theme-panel-dev", "wpdev-crm-dev", "wpdev-tickets-dev", "wpdev"];
          for (const p of devSources) {
            const src = path.join(customContentRoot, "plugins", p);
            if (fs.existsSync(src)) {
              await fs.promises.cp(src, path.join(pluginsDir, p), { recursive: true });
            }
          }

          const primeArgs = [
            buildScript,
            `--jobs=${j}`,
            "--force",
            "--build-only",
            `--plugins-dir=${pluginsDir}`,
            `--dist-dir=${distDir}`,
            `--cache-file=${cacheFile}`,
            `--receipts-dir=${receiptsDir}`,
          ];
          if (isMini) primeArgs.push(`--targets=${targetPlugins.join(",")}`);

          // Prime outside measurement window
          await execFileAsync(process.execPath, primeArgs, { cwd: customContentRoot });

          // Deterministic touch on 1 plugin source
          const firstPlugin = targetPlugins[0];
          const touchFile = path.join(pluginsDir, `${firstPlugin}-dev`, `${firstPlugin}.php`);
          if (fs.existsSync(touchFile)) {
            await fs.promises.appendFile(touchFile, "\n// benchmark deterministic touch\n", "utf8");
          }
        }

        const incArgs = [
          buildScript,
          `--jobs=${j}`,
          "--changed",
          "--build-only",
          `--plugins-dir=${pluginsDir}`,
          `--dist-dir=${distDir}`,
          `--cache-file=${cacheFile}`,
          `--receipts-dir=${receiptsDir}`,
        ];
        if (isMini) incArgs.push(`--targets=${targetPlugins.join(",")}`);

        // Measured incremental run
        const sample = await customExecutor({
          args: incArgs,
          cwd: customContentRoot,
          distDir,
          cacheFile,
          kind: "incremental",
          jobs: j,
        });
        incJobSamples.push({ iteration: iter + 1, jobs: j, ...sample });
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    concurrencyScaling[`jobs_${j}`] = {
      coldBuild: aggregateSamples(coldJobSamples),
      warmNoOp: aggregateSamples(warmJobSamples),
      incrementalBuild: aggregateSamples(incJobSamples),
    };
  }

  // 3. Category summaries for default jobs=4 (or last tested concurrency level)
  const defaultJobKey = concurrencyScaling["jobs_4"] ? "jobs_4" : Object.keys(concurrencyScaling)[Object.keys(concurrencyScaling).length - 1];
  const coldMetrics = concurrencyScaling[defaultJobKey].coldBuild;
  const warmMetrics = concurrencyScaling[defaultJobKey].warmNoOp;
  const incMetrics = concurrencyScaling[defaultJobKey].incrementalBuild;

  const cpus = os.cpus();
  const benchmarkReport = {
    schemaVersion: "3.0.0",
    command: "node tools/dev/run-benchmark.mjs",
    generatedAt: new Date().toISOString(),
    git: {
      head: gitInfo.head,
      isDirty: gitInfo.isDirty,
      statusSummary: gitInfo.porcelainSummary,
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuModel: cpus[0]?.model || "Unknown",
      cpuCount: cpus.length,
      jobsLimit: 4,
      totalMemoryBytes: os.totalmem(),
      totalMemoryGb: Number((os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)),
    },
    metrics: {
      fingerprinting: fpMetrics,
      coldBuild: coldMetrics,
      warmNoOp: warmMetrics,
      incrementalBuild: incMetrics,
    },
    concurrencyScaling,
    summary: {
      fingerprintMeanWallMs: fpMetrics.meanWallMs,
      coldBuildMeanWallMs: coldMetrics.meanWallMs,
      warmNoOpMeanWallMs: warmMetrics.meanWallMs,
      incrementalBuildMeanWallMs: incMetrics.meanWallMs,
      maxRssMb: Math.max(fpMetrics.maxRssMb, coldMetrics.maxRssMb, warmMetrics.maxRssMb, incMetrics.maxRssMb),
    },
  };

  const val = validateBenchmarkSchema(benchmarkReport);
  if (!val.valid) {
    throw new Error(`Benchmark schema validation failed: ${val.reason}`);
  }

  // Verify workspace was NOT mutated by benchmark runs
  const finalFp = await customFingerprinter({
    scriptDir: customToolsDir,
    pluginsDir: customPluginsDir,
    targetPlugins,
    jobs: MAX_JOBS_LIMIT,
    contentRoot: customContentRoot,
  });
  if (finalFp.tools !== initialFp.tools) {
    throw new Error("Benchmark run violated workspace isolation: 'tools' fingerprint mutated!");
  }
  if (finalFp.theme !== initialFp.theme) {
    throw new Error("Benchmark run violated workspace isolation: 'theme' fingerprint mutated!");
  }
  for (const p of targetPlugins) {
    if (finalFp.plugins[p] !== initialFp.plugins[p]) {
      throw new Error(`Benchmark run violated workspace isolation: '${p}' plugin fingerprint mutated!`);
    }
  }

  if (writeReport) {
    await fs.promises.mkdir(path.dirname(customBenchmarkOut), { recursive: true });
    await fs.promises.writeFile(customBenchmarkOut, JSON.stringify(benchmarkReport, null, 2), "utf8");
    console.log(`\n✓ Comprehensive isolated benchmark generated and verified at ${customBenchmarkOut}`);
    console.log(`  - Cold build mean (jobs=4): ${coldMetrics.meanWallMs}ms (rebuilt: ${coldMetrics.samples[0]?.rebuiltCount}, hit: ${coldMetrics.samples[0]?.cacheHitCount})`);
    console.log(`  - Warm no-op mean: ${warmMetrics.meanWallMs}ms (rebuilt: ${warmMetrics.samples[0]?.rebuiltCount}, hit: ${warmMetrics.samples[0]?.cacheHitCount})`);
    console.log(`  - Incremental mean: ${incMetrics.meanWallMs}ms (rebuilt: ${incMetrics.samples[0]?.rebuiltCount}, hit: ${incMetrics.samples[0]?.cacheHitCount})`);
    console.log(`  - Fingerprinting mean: ${fpMetrics.meanWallMs}ms`);
    console.log(`  - Max RSS: ${benchmarkReport.summary.maxRssMb}MB\n`);
  }
  return benchmarkReport;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBenchmarkHarness().catch((err) => {
    console.error("❌ Benchmark failed:", err);
    process.exit(1);
  });
}

