import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
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
test("uses the pinned commit tree, not the checked-out tree representation", () => {
  const input = fixture();
  const first = createReport(input);
  fs.writeFileSync(path.join(input.repo, "source.php"), "<?php // next");
  git(input.repo, "add", ".");
  git(input.repo, "commit", "-qm", "next");
  const second = createReport({
    ...input,
    commit: git(input.repo, "rev-parse", "HEAD").trim(),
  });
  expect(first.sourceDigest).not.toBe(second.sourceDigest);
});
test("refuses an unpinned revision and dirty worktree", () => {
  const input = fixture();
  expect(() => createReport({ ...input, commit: "HEAD" })).toThrow(
    /explicit git commit/,
  );
  fs.writeFileSync(path.join(input.repo, "dirty.txt"), "dirty");
  expect(() => createReport(input)).toThrow(/dirty worktree/);
});
test("refuses symlinked tool input and existing output targets", () => {
  const input = fixture();
  const outputDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "digest-output-"),
  );
  const symlink = path.join(outputDirectory, "manifest-link.json");
  fs.symlinkSync(input.manifestPath, symlink);
  expect(() => createReport({ ...input, manifestPath: symlink })).toThrow(
    /non-symlink regular file/,
  );

  const protectedOutput = path.join(outputDirectory, "protected.json");
  fs.writeFileSync(protectedOutput, "do-not-overwrite");
  const result = spawnSync(
    process.execPath,
    [
      path.resolve("tools/pre-registry-digest-report.js"),
      input.repo,
      input.commit,
      input.manifestPath,
      protectedOutput,
    ],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/refusing to overwrite/);
  expect(fs.readFileSync(protectedOutput, "utf8")).toBe("do-not-overwrite");
});
