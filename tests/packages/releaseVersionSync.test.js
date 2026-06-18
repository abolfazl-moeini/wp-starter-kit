/**
 * WS-D — version lockstep across starter plugin header, npm packages, engine.
 */

import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());

function readJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

describe("release version sync (WS-D)", () => {
  test("starter plugin header, constant, and npm packages agree on 1.0.0", () => {
    const starterPhp = readFileSync(join(ROOT, "wpdev-starter.php"), "utf8");
    const rootPkg = readJson("package.json");
    const enginePkg = readJson("packages/create-wp-project/package.json");

    const headerMatch = starterPhp.match(/Version:\s*([0-9.]+)/);
    const constMatch = starterPhp.match(
      /WPDEV_STARTER_VERSION',\s*'([0-9.]+)'/,
    );

    expect(headerMatch).not.toBeNull();
    expect(constMatch).not.toBeNull();
    expect(headerMatch[1]).toBe(constMatch[1]);
    expect(headerMatch[1]).toBe(rootPkg.version);
    expect(headerMatch[1]).toBe(enginePkg.version);
  });
});
