import { describe, test, expect } from "@jest/globals";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const huskyPreCommit = path.resolve(__dirname, "../../.husky/pre-commit");
const huskyCommitMsg = path.resolve(__dirname, "../../.husky/commit-msg");

describe("Phase 13 husky pre-commit (RED step)", () => {
  test(".husky/pre-commit exists", () => {
    expect(existsSync(huskyPreCommit)).toBe(true);
  });

  test(".husky/pre-commit is executable", () => {
    const stats = statSync(huskyPreCommit);
    // Check that the owner execute bit is set (0o100)
    expect((stats.mode & 0o100) !== 0).toBe(true);
  });

  test(".husky/pre-commit contains lint-staged and test commands", () => {
    const content = readFileSync(huskyPreCommit, "utf8");
    expect(content).toMatch(/lint-staged/);
    expect(content).toMatch(/npx jest/);
    expect(content).toMatch(/composer test/);
  });

  test(".husky/commit-msg exists and runs commitlint", () => {
    expect(existsSync(huskyCommitMsg)).toBe(true);
    const stats = statSync(huskyCommitMsg);
    expect((stats.mode & 0o100) !== 0).toBe(true);
    const content = readFileSync(huskyCommitMsg, "utf8");
    expect(content).toMatch(/commitlint/);
  });
});
