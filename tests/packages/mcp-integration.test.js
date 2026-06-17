import { describe, test, expect } from "@jest/globals";
import {
  defaultFeatures,
  validateFeatureSet,
} from "../../packages/create-wp-project/src/features.js";
import {
  mcpLibraryFiles,
  mcpBridgeModule,
} from "../../packages/create-wp-project/src/generators/_mcp-template.js";
import { getGenerators } from "../../packages/create-wp-project/src/generators/index.js";
import { run as runMcpAbilities } from "../../packages/create-wp-project/src/generators/mcpAbilities.js";

describe("mcpAbilities feature integration", () => {
  test("defaultFeatures includes mcpAbilities off", () => {
    expect(defaultFeatures().mcpAbilities).toBe("off");
  });

  test("validateFeatureSet accepts mcpAbilities on with js none", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      jsLib: "none",
      jsTest: "none",
      mcpAbilities: "on",
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.mcpAbilities).toMatch(/6\.9/);
  });

  test("mcpLibraryFiles exports core template paths", () => {
    const files = mcpLibraryFiles({});
    expect(files["Abilities/AbilityRegistry.php"]).toBeDefined();
    expect(files["Modules/ExampleAbilities/GetPostsAbility.php"]).toBeDefined();
    expect(files["Core/Plugin.php"]).toBeDefined();
  });

  test("mcpAbilities generator writes vendored library and bridge module", () => {
    const ctx = {
      features: { mcpAbilities: "on" },
      answers: { slug: "acme-plugin", globalName: "AcmePlugin" },
      cfg: { slug: "acme-plugin" },
      vars: {
        slug: "acme-plugin",
        vendor: "AcmePlugin",
        frameworkNamespace: "WPDev",
      },
    };
    const out = runMcpAbilities(ctx);
    expect(out.files["src/Mcp/Abilities/AbilityRegistry.php"]).toBeDefined();
    expect(out.files["src/Modules/McpAbilities/Module.php"]).toContain(
      "McpPlugin::boot",
    );
    expect(out.files["src/Modules/McpAbilities/Module.php"]).toContain(
      "'namespace' => 'acme-plugin'",
    );
    expect(out.files["src/mcp-abilities-register.php"]).toContain(
      "McpAbilities\\Module",
    );
    expect(out.composerPatches.autoload["psr-4"]["WPDev\\MCP\\"]).toBe(
      "src/Mcp/",
    );
  });

  test("mcpBridgeModule uses project namespace placeholders", () => {
    const body = mcpBridgeModule({});
    expect(body).toContain("{{vendor}}\\Modules\\McpAbilities");
    expect(body).toContain("{{slug}}");
  });

  test("getGenerators enables mcpAbilities when on", () => {
    const gens = getGenerators({
      ...defaultFeatures(),
      mcpAbilities: "on",
    });
    expect(gens.some((g) => g.id === "mcpAbilities")).toBe(true);
  });
});
