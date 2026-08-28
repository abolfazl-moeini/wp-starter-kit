import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createReport } from "../pre-registry-digest-report.js";

const git = (repo, ...args) =>
  execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" });
function fixture() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "digest-repo-"));
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "test@example.invalid");
  git(repo, "config", "user.name", "Test");
  fs.writeFileSync(path.join(repo, "source.php"), "<?php");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "fixture");
  const manifestPath = path.join(
    os.tmpdir(),
    `tool-input-${path.basename(repo)}.json`,
  );
  fs.writeFileSync(manifestPath, '{"tool":"test"}\n');
  return { repo, commit: git(repo, "rev-parse", "HEAD").trim(), manifestPath };
}

test("hashes the same pinned inputs deterministically", () => {
  const input = fixture();
  expect(createReport(input)).toEqual(createReport(input));
  expect(createReport(input).buildInput).toBe(false);
});
test("refuses an unpinned revision and dirty worktree", () => {
  const input = fixture();
  expect(() => createReport({ ...input, commit: "HEAD" })).toThrow(
    /explicit git commit/,
  );
  fs.writeFileSync(path.join(input.repo, "dirty.txt"), "dirty");
  expect(() => createReport(input)).toThrow(/dirty worktree/);
});
