import { describe, test, expect } from "@jest/globals";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import {
  hasVisibleDirEntries,
  normalizePositionalSlug,
  resolveCreateTargetDir,
  validateCreateTargetDir,
} from "../../packages/cli/src/resolveTargetDir.js";

const CWD = "/Users/dev/my-sample-plugin";

describe("normalizePositionalSlug()", () => {
  test("returns undefined for flag-like values", () => {
    expect(normalizePositionalSlug("--yes")).toBeUndefined();
  });

  test("returns slug for normal values", () => {
    expect(normalizePositionalSlug("my-plugin")).toBe("my-plugin");
  });
});

describe("resolveCreateTargetDir()", () => {
  test("uses cwd when no positional slug and no --dir", () => {
    expect(
      resolveCreateTargetDir({
        cwd: CWD,
        runOptions: {},
        positionalSlug: undefined,
      }),
    ).toBe(path.resolve(CWD));
  });

  test("uses --dir= when set", () => {
    expect(
      resolveCreateTargetDir({
        cwd: CWD,
        runOptions: { targetDir: "./out" },
        positionalSlug: undefined,
      }),
    ).toBe(path.resolve(CWD, "out"));
  });

  test("uses positional slug as subdirectory under cwd", () => {
    expect(
      resolveCreateTargetDir({
        cwd: CWD,
        runOptions: {},
        positionalSlug: "my-plugin",
      }),
    ).toBe(path.resolve(CWD, "my-plugin"));
  });

  test("respects absolute --dir=", () => {
    expect(
      resolveCreateTargetDir({
        cwd: CWD,
        runOptions: { targetDir: "/tmp/scaffold" },
        positionalSlug: undefined,
      }),
    ).toBe("/tmp/scaffold");
  });
});

describe("hasVisibleDirEntries()", () => {
  test("ignores dotfiles", () => {
    expect(hasVisibleDirEntries([".DS_Store", ".git", ".gitignore"])).toBe(
      false,
    );
  });

  test("detects visible files", () => {
    expect(hasVisibleDirEntries([".DS_Store", "README.md"])).toBe(true);
  });
});

describe("validateCreateTargetDir()", () => {
  test("allows cwd with only dotfiles", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "wpdev-dotfiles-"));
    writeFileSync(path.join(dir, ".DS_Store"), "");
    writeFileSync(path.join(dir, ".gitignore"), "node_modules/\n");
    try {
      const out = await validateCreateTargetDir({
        cwd: dir,
        runOptions: {},
        positionalSlug: undefined,
      });
      expect(out.ok).toBe(true);
      expect(out.targetDir).toBe(path.resolve(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("refuses a non-empty cwd before scaffolding", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "wpdev-guard-"));
    writeFileSync(path.join(dir, "README.md"), "# existing\n");
    try {
      const out = await validateCreateTargetDir({
        cwd: dir,
        runOptions: {},
        positionalSlug: undefined,
      });
      expect(out.ok).toBe(false);
      expect(out.reason).toMatch(/not empty/);
      expect(out.targetDir).toBe(path.resolve(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("allows non-empty cwd when --force is set", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "wpdev-guard-"));
    writeFileSync(path.join(dir, "README.md"), "# existing\n");
    try {
      const out = await validateCreateTargetDir({
        cwd: dir,
        runOptions: { force: true },
        positionalSlug: undefined,
      });
      expect(out.ok).toBe(true);
      expect(out.targetDir).toBe(path.resolve(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
