import { describe, test, expect, afterEach } from "@jest/globals";
import path from "node:path";
import {
  resolveEngineSrcDir,
  resolveKitPackageSrc,
} from "../../packages/create-wp-project/src/resolve-kit-paths.js";

const KIT_ROOT = path.resolve(__dirname, "../..");

describe("resolve-kit-paths", () => {
  const originalArgv = process.argv[1];

  afterEach(() => {
    process.argv[1] = originalArgv;
  });

  test("resolveEngineSrcDir finds engine src from CLI argv outside kit root", () => {
    process.argv[1] = path.join(KIT_ROOT, "packages/cli/bin/wpdev.js");
    const srcDir = resolveEngineSrcDir();
    expect(srcDir).toBe(path.join(KIT_ROOT, "packages/create-wp-project/src"));
  });

  test("resolveKitPackageSrc finds mcp-integration from CLI argv outside kit root", () => {
    process.argv[1] = path.join(KIT_ROOT, "packages/cli/bin/wpdev.js");
    const mcpSrc = resolveKitPackageSrc(
      "mcp-integration",
      path.join("Core", "Plugin.php"),
    );
    expect(mcpSrc).toBe(path.join(KIT_ROOT, "packages/mcp-integration/src"));
  });
});
