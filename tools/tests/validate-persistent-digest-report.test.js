import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validatePersistentDigestReport } from "../validate-persistent-digest-report.js";

const valid = {
  schema: 1,
  purpose: "pre-registry-digest-report",
  authority: "non-authoritative-review-evidence",
  recordStatus: "review-only",
  buildInput: false,
  pinnedCommit: "a".repeat(40),
  sourceDigest: "b".repeat(64),
  toolDigest: "c".repeat(64),
  toolInput: {
    manifestPath: "/tmp/candidate.json",
    byteLength: 4,
    rawSha256: "d".repeat(64),
  },
  warnings: [],
  blockers: ["pending acceptance"],
};

test("accepts persistent review-only report and candidate linkage", () => {
  expect(
    validatePersistentDigestReport(valid, {
      candidateManifestPath: "/tmp/candidate.json",
      sourceDigest: "b".repeat(64),
      toolDigest: "c".repeat(64),
      rawSha256: "d".repeat(64),
    }),
  ).toBe(true);
});
test("rejects promotion flags and malformed provenance", () => {
  expect(() =>
    validatePersistentDigestReport({ ...valid, buildInput: true }),
  ).toThrow(/build input/);
  expect(() =>
    validatePersistentDigestReport({ ...valid, promotionReady: true }),
  ).toThrow(/forbidden mutation field: promotionReady/);
  expect(() =>
    validatePersistentDigestReport({
      ...valid,
      artifactDigest: "e".repeat(64),
    }),
  ).toThrow(/mutation field/);
  expect(() =>
    validatePersistentDigestReport({ ...valid, pinnedCommit: "a".repeat(7) }),
  ).toThrow(/full commit/);
});
test("rejects a report detached from the candidate manifest", () => {
  expect(() =>
    validatePersistentDigestReport(valid, {
      candidateManifestPath: "/tmp/other.json",
    }),
  ).toThrow(/linked/);
  expect(() =>
    validatePersistentDigestReport(valid, {
      sourceDigest: "0".repeat(64),
    }),
  ).toThrow(/source digest/);
  expect(() =>
    validatePersistentDigestReport(valid, {
      toolDigest: "0".repeat(64),
    }),
  ).toThrow(/tool digest/);
  expect(() =>
    validatePersistentDigestReport(valid, {
      rawSha256: "0".repeat(64),
    }),
  ).toThrow(/rawSha256/);
});
test("rejects ambiguous manifest paths and empty blockers", () => {
  expect(() =>
    validatePersistentDigestReport({
      ...valid,
      toolInput: { ...valid.toolInput, manifestPath: "candidate.json" },
    }),
  ).toThrow(/metadata/);
  expect(() =>
    validatePersistentDigestReport({ ...valid, blockers: [""] }),
  ).toThrow(/blockers/);
});
test("runs CLI validator and rejects symlinked report files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-report-"));
  const reportPath = path.join(dir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(valid, null, 2));

  const validRes = spawnSync(
    process.execPath,
    [path.resolve("tools/validate-persistent-digest-report.js"), reportPath],
    { encoding: "utf8" },
  );
  expect(validRes.status).toBe(0);
  expect(validRes.stdout).toMatch(/valid-persistent-digest-report/);

  const symlinkPath = path.join(dir, "symlink.json");
  fs.symlinkSync(reportPath, symlinkPath);
  const symlinkRes = spawnSync(
    process.execPath,
    [path.resolve("tools/validate-persistent-digest-report.js"), symlinkPath],
    { encoding: "utf8" },
  );
  expect(symlinkRes.status).toBe(1);
  expect(symlinkRes.stderr).toMatch(/non-symlink regular file/);

  fs.rmSync(dir, { recursive: true, force: true });
});
