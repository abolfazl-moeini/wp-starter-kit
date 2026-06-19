import { describe, test, expect } from "@jest/globals";
import { pluginCoreTestPackageFiles } from "../../packages/create-wp-project/src/generators/_plugin-core-test-template.js";

describe("plugin-core-test package mirror", () => {
  test("exports Setup.php and composer.json from kit package", () => {
    const files = pluginCoreTestPackageFiles();
    expect(files["composer.json"]).toMatch(/wpdev\/plugin-core-test/);
    expect(files["src/Setup.php"]).toBeDefined();
    expect(files["src/TestCases/TestCase.php"]).toBeDefined();
  });
});
