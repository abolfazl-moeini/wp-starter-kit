import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const docsDir = join(process.cwd(), "docs");
const index = readFileSync(join(docsDir, "index.md"), "utf8");

const requiredDocs = [
  "vendor-scoping.md",
  "fetch-batch.md",
  "fault-tolerance.md",
  "php-core-libs.md",
  "plugin-bootstrap.md",
  "modules.md",
  "installer.md",
];

describe("docs index contract", () => {
  test("required docs exist on disk", () => {
    requiredDocs.forEach((doc) => {
      expect(existsSync(join(docsDir, doc))).toBe(true);
    });
  });

  test("docs/index.md links required docs", () => {
    requiredDocs.forEach((doc) => {
      expect(index).toMatch(new RegExp(doc.replace(".", "\\.")));
    });
  });
});
