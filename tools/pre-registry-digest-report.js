#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function fail(message) {
  throw new Error(message);
}
function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
  }).trim();
}
function sha(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeNewJsonOutput(output) {
  const resolved = path.resolve(output);
  if (path.extname(resolved) !== ".json")
    fail("output must be a new .json review-evidence file");
  if (fs.existsSync(resolved)) fail("refusing to overwrite an existing output");
  return resolved;
}

function readManifestBytes(manifestPath) {
  const manifestStat = fs.lstatSync(manifestPath);
  if (!manifestStat.isFile() || manifestStat.isSymbolicLink())
    fail("manifest must be a non-symlink regular file");

  // Keep the lstat/read pair race-safe: O_NOFOLLOW prevents an attacker from
  // swapping the reviewed file for a symlink between those operations.
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const fd = fs.openSync(manifestPath, fs.constants.O_RDONLY | noFollow);
  try {
    const openedStat = fs.fstatSync(fd);
    if (!openedStat.isFile())
      fail("manifest must be a non-symlink regular file");
    return fs.readFileSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

export function createReport({
  repo,
  commit,
  manifestPath,
  expectedManifestSha256,
}) {
  if (!repo || !commit || !manifestPath)
    fail("repo, pinned commit, and manifestPath are required");
  if (!/^[0-9a-f]{7,40}$/i.test(commit))
    fail("commit must be an explicit git commit hash");
  const pinned = git(repo, ["rev-parse", `${commit}^{commit}`]);
  if (git(repo, ["status", "--porcelain"]))
    fail("refusing dirty worktree; digest only pinned clean inputs");
  const manifestBytes = readManifestBytes(manifestPath);
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifestSha256 = sha(manifestBytes);
  if (
    expectedManifestSha256 !== undefined &&
    (typeof expectedManifestSha256 !== "string" ||
      !/^[0-9a-f]{64}$/i.test(expectedManifestSha256) ||
      expectedManifestSha256.toLowerCase() !== manifestSha256)
  )
    fail("manifest raw-byte SHA-256 mismatch");
  const tree = git(repo, ["rev-parse", `${pinned}^{tree}`]);
  return {
    schema: 1,
    purpose: "pre-registry-digest-report",
    authority: "non-authoritative-review-evidence",
    recordStatus: "review-only",
    buildInput: false,
    pinnedCommit: pinned,
    sourceDigest: sha(`git-tree-id-v1\0${tree}\0`),
    toolDigest: sha(`tool-input-v1\0${manifestBytes}`),
    toolInput: {
      manifestPath: resolvedManifestPath,
      byteLength: manifestBytes.length,
      rawSha256: manifestSha256,
    },
    warnings: [],
    blockers: [
      "human acceptance of exact source, tool inputs and artifact is pending",
    ],
  };
}

if (
  process.argv[1] &&
  process.argv[1].endsWith("pre-registry-digest-report.js")
) {
  try {
    const [repo, commit, manifestPath, output] = process.argv.slice(2);
    const report = createReport({ repo, commit, manifestPath });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (output) {
      fs.writeFileSync(
        safeNewJsonOutput(output),
        `${JSON.stringify(report, null, 2)}\n`,
        { flag: "wx" },
      );
    }
  } catch (error) {
    process.stderr.write(`pre-registry-digest-report: ${error.message}\n`);
    process.exitCode = 1;
  }
}
