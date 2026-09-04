import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const exec = promisify(execFile);
const script = path.resolve(packageRoot, "validate-hook-contract-dynamic-domain.mjs");

const PRODUCER = "plugins/wpdev/modules/field-builder/src/class-field-type-registry.php";
const REGISTRY = "plugins/wpdev/modules/field-builder/setup.php";

// Line 3 is deliberately the producer line so a wrong line number fails.
const producerBody = ["<?php", "class Field_Type_Registry {", "\t\treturn apply_filters( \"wpdev_field_validate_{$type}\", $value, $field );", "}"].join("\n");
const registryBody = ["<?php", "Field_Type_Registry::register( 'image', array( 'sanitize' => 'esc_url_raw' ) );", "Field_Type_Registry::register( 'color-picker', array( 'sanitize' => 'sanitize_hex_color' ) );"].join("\n");

const domain = {
  template: "wpdev_field_validate_{$type}",
  matcher: "^wpdev_field_validate_.+$",
  producers: [{ path: PRODUCER, line: 3 }],
  constraint: "sanitize_key( $type )",
  registrationEnumeration: {
    path: REGISTRY,
    pattern: "Field_Type_Registry::register( '{id}'",
    identifiers: ["image", "color-picker"],
  },
  observedIdentifiers: ["wpdev_field_validate_image", "wpdev_field_validate_color-picker"],
  residualRisk: "Any code may register a new field type at runtime, so the domain is bounded by observation, not by construction.",
};

const manifest = { schema: 1, purpose: "hook-contract-dynamic-domain", consumer: "tavangary-theme-panel", domains: [domain] };
const inventory = {
  schema: 1,
  scope: { consumer: "tavangary-theme-panel" },
  contracts: {
    "wpdev_field_validate_image": { matchingFrameworkDynamicProducers: [{ template: domain.template, matcher: domain.matcher }] },
    "wpdev_field_validate_color-picker": { matchingFrameworkDynamicProducers: [{ template: domain.template, matcher: domain.matcher }] },
  },
};

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hook-domain-"));
  await mkdir(path.dirname(path.join(dir, PRODUCER)), { recursive: true });
  await mkdir(path.dirname(path.join(dir, REGISTRY)), { recursive: true });
  await writeFile(path.join(dir, PRODUCER), producerBody);
  await writeFile(path.join(dir, REGISTRY), registryBody);
  const manifestPath = path.join(dir, "domain.json");
  const inventoryPath = path.join(dir, "inventory.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(inventoryPath, JSON.stringify(inventory));
  return { dir, manifestPath, inventoryPath };
}

async function run(dir, manifestPath, inventoryPath, patch) {
  if (patch) await writeFile(manifestPath, JSON.stringify(patch(manifest)));
  const { stdout } = await exec(process.execPath, [script, manifestPath, dir, inventoryPath]);
  return JSON.parse(stdout);
}

test("accepts a fully proven dynamic identifier domain", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  const report = await run(dir, manifestPath, inventoryPath);
  assert.equal(report.status, "valid-review-evidence", "proven domain must validate");
  assert.equal(report.promotionReady, false, "evidence never promotes on its own");
});

test("rejects a producer whose recorded line does not contain the template", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, producers: [{ path: PRODUCER, line: 2 }] }] })),
    "a wrong line number must fail closed",
  );
});

test("rejects a producer file that does not exist", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, producers: [{ path: "plugins/wpdev/missing.php", line: 3 }] }] })),
    "a missing producer file must fail closed",
  );
});

test("rejects an identifier that is not actually registered", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, registrationEnumeration: { ...domain.registrationEnumeration, identifiers: ["image", "not-registered"] } }] })),
    "an unregistered identifier must fail closed",
  );
});

test("rejects an observed identifier that does not match the matcher", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, observedIdentifiers: ["something_else"] }] })),
    "an identifier outside the declared domain must fail closed",
  );
});

test("rejects an observed identifier whose variable part is not enumerated", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, observedIdentifiers: ["wpdev_field_validate_unknown"] }] })),
    "an identifier with no registered source must fail closed",
  );
});

test("rejects a domain with no producers", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, producers: [] }] })),
    "a domain with no producer evidence must fail closed",
  );
});

test("rejects a manifest that leaves an inventory dynamic hook unproven", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await writeFile(inventoryPath, JSON.stringify({ ...inventory, contracts: { ...inventory.contracts, wpdev_other_form_fields: { matchingFrameworkDynamicProducers: [{ template: "wpdev_{$id}_form_fields", matcher: "^wpdev_.+_form_fields$" }] } } }));
  await assert.rejects(run(dir, manifestPath, inventoryPath), "an uncovered dynamic hook must fail closed");
});

test("rejects unsafe absolute and traversal paths", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, producers: [{ path: "/etc/passwd", line: 3 }] }] })),
    "absolute paths must fail closed",
  );
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, registrationEnumeration: { ...domain.registrationEnumeration, path: "../escape.php" } }] })),
    "traversal paths must fail closed",
  );
});

test("rejects an empty residual risk statement", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, domains: [{ ...domain, residualRisk: "   " }] })),
    "residual risk must be stated honestly",
  );
});

// Regression: `wpdev_{$id}_form_fields` carries a literal SUFFIX after the
// placeholder. Stripping only the prefix leaves "hero_slides_form_fields",
// which is not a registered id, and wrongly reports the hook as unproven.
test("accepts a template whose placeholder is followed by a literal suffix", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  const formProducer = "plugins/wpdev/modules/form-builder/src/form/class-form.php";
  const formRegistry = "plugins/tavangary-theme-panel/includes/theme-options/src/sections/class-hero.php";
  await mkdir(path.dirname(path.join(dir, formProducer)), { recursive: true });
  await mkdir(path.dirname(path.join(dir, formRegistry)), { recursive: true });
  await writeFile(path.join(dir, formProducer), ["<?php", "class Form {", '\t\t$fields = apply_filters("wpdev_{$id}_form_fields", $fields);', "}"].join("\n"));
  await writeFile(path.join(dir, formRegistry), ["<?php", "wpdev_register_settings_field(", "\t\t\t'tavangary_hero',", "\t\t\t'hero_slides',"].join("\n"));

  const formDomain = {
    template: "wpdev_{$id}_form_fields",
    matcher: "^wpdev_.+_form_fields$",
    producers: [{ path: formProducer, line: 3 }],
    constraint: "Form::set_fields() interpolates $id = $this->id.",
    registrationEnumeration: { path: formRegistry, pattern: "wpdev_register_settings_field( '{section}', '{id}'", identifiers: ["hero_slides"] },
    observedIdentifiers: ["wpdev_hero_slides_form_fields"],
    residualRisk: "A Form may be constructed with any id at runtime.",
  };
  await writeFile(inventoryPath, JSON.stringify({ schema: 1, scope: { consumer: "tavangary-theme-panel" }, contracts: { wpdev_hero_slides_form_fields: { matchingFrameworkDynamicProducers: [{ template: formDomain.template, matcher: formDomain.matcher }] } } }));
  await writeFile(manifestPath, JSON.stringify({ ...manifest, domains: [formDomain] }));

  const { stdout } = await exec(process.execPath, [script, manifestPath, dir, inventoryPath]);
  const report = JSON.parse(stdout);
  assert.equal(report.status, "valid-review-evidence", `suffixed template must validate: ${JSON.stringify(report.failures)}`);
  assert.deepEqual(report.provenIdentifiers, ["wpdev_hero_slides_form_fields"]);
});

test("rejects a suffixed template whose variable part is not enumerated", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  const formProducer = "plugins/wpdev/modules/form-builder/src/form/class-form.php";
  const formRegistry = "plugins/tavangary-theme-panel/includes/theme-options/src/sections/class-hero.php";
  await mkdir(path.dirname(path.join(dir, formProducer)), { recursive: true });
  await mkdir(path.dirname(path.join(dir, formRegistry)), { recursive: true });
  await writeFile(path.join(dir, formProducer), ["<?php", "class Form {", '\t\t$fields = apply_filters("wpdev_{$id}_form_fields", $fields);', "}"].join("\n"));
  await writeFile(path.join(dir, formRegistry), ["<?php", "wpdev_register_settings_field(", "\t\t\t'other_section',"].join("\n"));

  const formDomain = {
    template: "wpdev_{$id}_form_fields",
    matcher: "^wpdev_.+_form_fields$",
    producers: [{ path: formProducer, line: 3 }],
    constraint: "Form::set_fields() interpolates $id = $this->id.",
    registrationEnumeration: { path: formRegistry, pattern: "wpdev_register_settings_field( '{section}', '{id}'", identifiers: ["hero_slides"] },
    observedIdentifiers: ["wpdev_hero_slides_form_fields"],
    residualRisk: "A Form may be constructed with any id at runtime.",
  };
  await writeFile(manifestPath, JSON.stringify({ ...manifest, domains: [formDomain] }));
  await assert.rejects(exec(process.execPath, [script, manifestPath, dir, inventoryPath]), "an unregistered form id must fail closed");
});

test("rejects a manifest that is not the expected purpose", async () => {
  const { dir, manifestPath, inventoryPath } = await fixture();
  await assert.rejects(
    run(dir, manifestPath, inventoryPath, (m) => ({ ...m, purpose: "something-else" })),
    "purpose must be pinned",
  );
});
