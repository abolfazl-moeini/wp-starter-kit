import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ci = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);
const nightly = readFileSync(
  join(process.cwd(), ".github/workflows/nightly.yml"),
  "utf8",
);
const release = readFileSync(
  join(process.cwd(), ".github/workflows/release.yml"),
  "utf8",
);

describe("CI workflow contract", () => {
  test("ci.yml includes typecheck and eslint jobs/steps", () => {
    expect(ci).toMatch(/typecheck|tsc --noEmit/);
    expect(ci).toMatch(/eslint|lint:js/);
  });

  test("ci.yml references release:dist", () => {
    expect(ci).toMatch(/release:dist/);
  });

  test("ci.yml uploads real artifact paths", () => {
    expect(ci).toMatch(/assets\/bundles/);
    expect(ci).toMatch(/assets\/stylesheets/);
    expect(ci).toMatch(/assets\/translations/);
  });

  test("nightly scaffold checks plugin bootstrap not functions.php", () => {
    expect(nightly).toMatch(/\.php/);
    expect(nightly).not.toMatch(/test -f "\$TMP\/my-project\/functions\.php"/);
  });

  test("release.yml names archives wpdev-starter", () => {
    expect(release).toMatch(/wpdev-starter-\$\{\{ github\.ref_name \}\}\.tar\.gz/);
    expect(release).not.toMatch(/wpsk-starter-/);
  });

  test("ci.yml defines an installer-e2e job", () => {
    // Job must exist (top-level `installer-e2e:` under `jobs:`), must
    // run CLI unit tests, must run `wpdev create` with --yes, and must
    // run `wpdev info` on the generated project.
    expect(ci).toMatch(/^\s{2}installer-e2e:\s*$/m);
    expect(ci).toMatch(/npm test\s+--\s+cli/);
    expect(ci).toMatch(/wpdev\.js create[^\n]*--yes/);
    expect(ci).toMatch(/wpdev\.js info/);
  });
});
