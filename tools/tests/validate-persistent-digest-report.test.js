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
    }),
  ).toBe(true);
});
test("rejects promotion flags and malformed provenance", () => {
  expect(() =>
    validatePersistentDigestReport({ ...valid, buildInput: true }),
  ).toThrow(/build input/);
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
