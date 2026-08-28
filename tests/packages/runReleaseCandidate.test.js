import { existsSync } from "node:fs";
import path from "node:path";

import {
  createCandidateReport,
  parseArgs,
} from "../../packages/create-wp-project/src/release/run-release.js";

const root = path.resolve(process.cwd());

describe("release candidate mode", () => {
  test("parses the isolated candidate flag", () => {
    expect(parseArgs(["--candidate", "--root=."]).candidate).toBe(true);
  });

  test("emits review-only output and refuses promotion", () => {
    const report = createCandidateReport(root);
    expect(report.mode).toBe("candidate");
    expect(report.reviewOnly).toBe(true);
    expect(report.promotionReady).toBe(false);
    expect(report.buildInput).toBe(false);
    expect(report.registryMutated).toBe(false);
    expect(report.zipCreated).toBe(false);
    expect(report.inputs).toHaveLength(2);
    expect(report.inputs[0].present).toBe(
      existsSync(path.join(root, report.inputs[0].path)),
    );
    expect(report.blockers.length).toBeGreaterThan(0);
  });
});
