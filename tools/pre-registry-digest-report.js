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
function canonical(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}
function sha(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createReport({ repo, commit, manifestPath }) {
  if (!repo || !commit || !manifestPath)
    fail("repo, pinned commit, and manifestPath are required");
  if (!/^[0-9a-f]{7,40}$/i.test(commit))
    fail("commit must be an explicit git commit hash");
  const pinned = git(repo, ["rev-parse", `${commit}^{commit}`]);
  if (git(repo, ["status", "--porcelain"]))
    fail("refusing dirty worktree; digest only pinned clean inputs");
  if (!fs.statSync(manifestPath).isFile())
    fail("manifest must be a regular file");
  const manifestBytes = fs.readFileSync(manifestPath);
  const tree = git(repo, ["ls-tree", "-r", pinned]);
  return {
    schema: 1,
    purpose: "pre-registry-digest-report",
    authority: "non-authoritative-review-evidence",
    recordStatus: "review-only",
    buildInput: false,
    pinnedCommit: pinned,
    sourceDigest: sha(`git-tree-v1\0${tree}\0`),
    toolDigest: sha(`tool-input-v1\0${manifestBytes}`),
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
    if (output)
      fs.writeFileSync(
        path.resolve(output),
        `${JSON.stringify(report, null, 2)}\n`,
      );
  } catch (error) {
    process.stderr.write(`pre-registry-digest-report: ${error.message}\n`);
    process.exitCode = 1;
  }
}
