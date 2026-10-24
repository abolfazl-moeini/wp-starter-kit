import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { shouldDelegateToCanonicalAssembler } from "../../packages/create-wp-project/src/release/prepare-release.js";

describe("release routing: shouldDelegateToCanonicalAssembler", () => {
  const assembler =
    "/repo/packages/standalone-build/assemble-profile-s-candidate.mjs";
  let root;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-routing-"));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  test("kit-runtime-only consumer (phpFramework none) never delegates — the shell-zip / site-fatal regression", () => {
    // Exactly the nemo-store-operator shape: kitVersion + packages/framework
    // present, framework explicitly off.
    expect(
      shouldDelegateToCanonicalAssembler({
        raw: {
          kitVersion: "0.0.0",
          features: { phpFramework: "none" },
        },
        options: {},
        profile: "clean",
        root,
        canonicalAssemblerPath: assembler,
      }),
    ).toBe(false);
  });

  test("phpFramework none is a hard opt-out even with the explicit CLI flag", () => {
    expect(
      shouldDelegateToCanonicalAssembler({
        raw: { features: { phpFramework: "none" } },
        options: { useCanonicalAssembler: true },
        profile: "clean",
        root,
        canonicalAssemblerPath: assembler,
      }),
    ).toBe(false);
  });

  test("bare kit markers (kitVersion, packages/framework) are NOT standalone intent", () => {
    expect(
      shouldDelegateToCanonicalAssembler({
        raw: { kitVersion: "0.0.0" },
        options: {},
        profile: "clean",
        root,
        canonicalAssemblerPath: assembler,
      }),
    ).toBe(false);
  });

  test("explicit phpFramework wpdev (features or top level) delegates", () => {
    for (const raw of [
      { features: { phpFramework: "wpdev" } },
      { phpFramework: "wpdev" },
      { framework: "wpdev" },
    ]) {
      expect(
        shouldDelegateToCanonicalAssembler({
          raw,
          options: {},
          profile: "clean",
          root,
          canonicalAssemblerPath: assembler,
        }),
      ).toBe(true);
    }
  });

  test("an embedded framework tree (includes/framework) delegates", async () => {
    await fs.mkdir(path.join(root, "includes/framework"), { recursive: true });

    expect(
      shouldDelegateToCanonicalAssembler({
        raw: { kitVersion: "0.0.0" },
        options: {},
        profile: "clean",
        root,
        canonicalAssemblerPath: assembler,
      }),
    ).toBe(true);
  });

  test("--no-canonical-assembler wins over framework intent", () => {
    expect(
      shouldDelegateToCanonicalAssembler({
        raw: { features: { phpFramework: "wpdev" } },
        options: { useCanonicalAssembler: false },
        profile: "clean",
        root,
        canonicalAssemblerPath: assembler,
      }),
    ).toBe(false);
  });

  test("explicit standalone intent flags delegate without a framework declaration", () => {
    for (const overrides of [
      { options: { inlineFramework: true } },
      { profile: "standalone" },
      { isObfuscate: true },
      { isSpaghetti: true },
      { raw: { canonicalAssembler: true } },
    ]) {
      expect(
        shouldDelegateToCanonicalAssembler({
          raw: {},
          options: {},
          profile: "clean",
          root,
          canonicalAssemblerPath: assembler,
          ...overrides,
        }),
      ).toBe(true);
    }
  });

  test("no resolvable assembler means the generic path regardless of intent", () => {
    expect(
      shouldDelegateToCanonicalAssembler({
        raw: { features: { phpFramework: "wpdev" } },
        options: {},
        profile: "clean",
        root,
        canonicalAssemblerPath: null,
      }),
    ).toBe(false);
  });
});
