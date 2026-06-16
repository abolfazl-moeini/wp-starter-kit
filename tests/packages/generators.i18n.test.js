/**
 * Phase 26.7 — i18n WP-CLI requirement documentation.
 */

import { describe, test, expect } from "@jest/globals";

import { run as i18nRun } from "../../packages/create-wp-project/src/generators/i18n.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

describe("i18n generator — WP-CLI requirement (Phase 26.7)", () => {
  test("documents WP-CLI requirement when i18n:on", () => {
    const out = i18nRun({
      answers: {},
      cfg: {},
      features: { ...defaultFeatures(), i18n: "on" },
    });
    const readme = out.files["languages/README.md"];
    expect(readme).toBeDefined();
    expect(readme).toMatch(/WP-CLI/i);
    expect(readme).toMatch(/wp i18n/i);
  });
});
