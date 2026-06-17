import { describe, test, expect } from "@jest/globals";

import { parseFlags, KNOWN_FLAGS } from "../../packages/cli/src/flags.js";

describe("parseFlags()", () => {
  test("parses a positional slug", () => {
    const r = parseFlags(["my-plugin"]);
    expect(r.answers.slug).toBe("my-plugin");
  });

  test("parses --slug= and wins over the positional for answers.slug", () => {
    const r = parseFlags(["positional", "--slug=other"]);
    // Slug is the POSITIONAL by default; --slug overrides.
    expect(r.answers.slug).toBe("other");
  });

  test("sanitizes the positional slug: lowercases + dashes-only", () => {
    const r = parseFlags(["My Plugin Name!"]);
    expect(r.answers.slug).toBe("my-plugin-name");
  });

  test("parses --scope= → answers.npmScope", () => {
    expect(parseFlags(["--scope=myorg"]).answers.npmScope).toBe("myorg");
  });

  test("parses --global= → answers.globalName", () => {
    expect(parseFlags(["--global=MyPlugin"]).answers.globalName).toBe(
      "MyPlugin",
    );
  });

  test("parses --domain= → answers.textDomain", () => {
    expect(parseFlags(["--domain=my-plugin"]).answers.textDomain).toBe(
      "my-plugin",
    );
  });

  test("parses --hook= → answers.hookPrefix", () => {
    expect(parseFlags(["--hook=my-plugin"]).answers.hookPrefix).toBe(
      "my-plugin",
    );
  });

  test("parses --php-fn= → answers.phpFunctionPrefix (no trailing underscore added)", () => {
    expect(parseFlags(["--php-fn=myprj_"]).answers.phpFunctionPrefix).toBe(
      "myprj_",
    );
  });

  test("parses --js= → features.js", () => {
    expect(parseFlags(["--js=flow"]).features.js).toBe("flow");
  });

  test("parses --js-lib= → features.jsLib", () => {
    expect(parseFlags(["--js-lib=preact"]).features.jsLib).toBe("preact");
  });

  test("parses --js-test= → features.jsTest", () => {
    expect(parseFlags(["--js-test=vitest"]).features.jsTest).toBe("vitest");
  });

  test("parses --css= → features.css", () => {
    expect(parseFlags(["--css=tailwind"]).features.css).toBe("tailwind");
  });

  test("parses --blocks=on → features.blocks", () => {
    expect(parseFlags(["--blocks=on"]).features.blocks).toBe("on");
    expect(parseFlags(["--blocks=off"]).features.blocks).toBe("off");
  });

  test("parses --php-min= → features.phpMinVersion", () => {
    expect(parseFlags(["--php-min=8.1"]).features.phpMinVersion).toBe("8.1");
  });

  test("parses --php-source= → answers.phpSourceVersion", () => {
    expect(parseFlags(["--php-source=8.2"]).answers.phpSourceVersion).toBe(
      "8.2",
    );
  });

  test("parses --php-framework= → features.phpFramework", () => {
    expect(parseFlags(["--php-framework=wpdev"]).features.phpFramework).toBe(
      "wpdev",
    );
  });

  test("parses --php-test= → features.phpTest", () => {
    expect(parseFlags(["--php-test=none"]).features.phpTest).toBe("none");
  });

  test("parses --license= → features.license", () => {
    expect(parseFlags(["--license=mit"]).features.license).toBe("mit");
  });

  test("parses --wp-min= → features.wpMinVersion", () => {
    expect(parseFlags(["--wp-min=6.0"]).features.wpMinVersion).toBe("6.0");
  });

  test("parses --rest-batch=on → features.restBatch", () => {
    expect(parseFlags(["--rest-batch=on"]).features.restBatch).toBe("on");
  });

  test("parses --fault-tolerance=on → features.faultTolerance", () => {
    expect(parseFlags(["--fault-tolerance=on"]).features.faultTolerance).toBe(
      "on",
    );
  });

  test("parses --vendor-scoping=off → features.vendorScoping", () => {
    expect(parseFlags(["--vendor-scoping=off"]).features.vendorScoping).toBe(
      "off",
    );
  });

  test("parses --husky=on → features.husky", () => {
    expect(parseFlags(["--husky=on"]).features.husky).toBe("on");
  });

  test("parses --example=off → features.exampleFeature", () => {
    expect(parseFlags(["--example=off"]).features.exampleFeature).toBe("off");
  });

  test("parses --i18n=on → features.i18n", () => {
    expect(parseFlags(["--i18n=on"]).features.i18n).toBe("on");
  });

  test("parses --frontend-stack=polaris → features.frontendStack", () => {
    expect(
      parseFlags(["--frontend-stack=polaris"]).features.frontendStack,
    ).toBe("polaris");
  });

  test("parses --mcp-abilities=on → features.mcpAbilities", () => {
    expect(parseFlags(["--mcp-abilities=on"]).features.mcpAbilities).toBe("on");
  });

  test("parses --preset=full → runOptions.preset", () => {
    expect(parseFlags(["--preset=full"]).runOptions.preset).toBe("full");
  });

  test("parses --dir=./out → runOptions.targetDir (independent of slug)", () => {
    const r = parseFlags(["my-plugin", "--dir=./out"]);
    expect(r.answers.slug).toBe("my-plugin");
    expect(r.runOptions.targetDir).toBe("./out");
  });

  test("parses --install as a boolean flag → runOptions.install=true", () => {
    expect(parseFlags(["--install"]).runOptions.install).toBe(true);
  });

  test("parses --git as a boolean flag → runOptions.git=true", () => {
    expect(parseFlags(["--git"]).runOptions.git).toBe(true);
  });

  test("parses --force → runOptions.force=true", () => {
    expect(parseFlags(["--force"]).runOptions.force).toBe(true);
  });

  test("parses --yes / -y → runOptions.interactive=false", () => {
    expect(parseFlags(["--yes"]).runOptions.interactive).toBe(false);
    expect(parseFlags(["-y"]).runOptions.interactive).toBe(false);
  });

  test("parses --kit-version= → runOptions.kitVersion", () => {
    expect(parseFlags(["--kit-version=0.2.0"]).runOptions.kitVersion).toBe(
      "0.2.0",
    );
  });

  test("parses --verbose → runOptions.verbose=true", () => {
    expect(parseFlags(["--verbose"]).runOptions.verbose).toBe(true);
  });

  test("unknown flag throws with a clear error listing valid flags", () => {
    expect(() => parseFlags(["--typo=foo"])).toThrow(/Unknown flag/);
    expect(() => parseFlags(["--typo=foo"])).toThrow(/--js=/);
  });

  test("KNOWN_FLAGS exports the full Appendix A set (for help and validation)", () => {
    // Sanity: every flag the plan lists (Appendix A) appears in the
    // registry. Order is alphabetical so the help error is stable.
    const expected = [
      "--dir=",
      "--slug=",
      "--scope=",
      "--global=",
      "--domain=",
      "--hook=",
      "--php-fn=",
      "--js=",
      "--js-lib=",
      "--js-test=",
      "--css=",
      "--blocks=",
      "--php-min=",
      "--php-source=",
      "--php-framework=",
      "--php-test=",
      "--license=",
      "--wp-min=",
      "--rest-batch=",
      "--fault-tolerance=",
      "--vendor-scoping=",
      "--husky=",
      "--example=",
      "--i18n=",
      "--frontend-stack=",
      "--mcp-abilities=",
      "--preset=",
      "--kit-version=",
      "--install",
      "--git",
      "--force",
      "--yes",
      "-y",
      "--verbose",
    ];
    for (const flag of expected) {
      expect(KNOWN_FLAGS).toContain(flag);
    }
  });
});
