import { describe, test, expect } from "@jest/globals";
import { parseBuildCliOptions } from "../../core/packages/build/cli-options.js";

describe("build CLI watch mode", () => {
  test("parseBuildCliOptions enables watch with --watch flag", () => {
    const opts = parseBuildCliOptions(["node", "esbuild-cli.js", "--watch"]);
    expect(opts.watch).toBe(true);
    expect(opts.isDev).toBe(true);
  });

  test("parseBuildCliOptions disables watch by default", () => {
    const opts = parseBuildCliOptions(["node", "esbuild-cli.js"]);
    expect(opts.watch).toBe(false);
    expect(opts.isDev).toBe(false);
  });
});