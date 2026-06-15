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
});
