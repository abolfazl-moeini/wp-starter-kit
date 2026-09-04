#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "plugins", consumer, "dev", "settings-ownership-review-manifest.json"),
);
const inventory = JSON.parse(
  await fs.readFile(path.join(contentRoot, "settings-field-inventory.json"), "utf8"),
);
const plugin = inventory.plugins?.[consumer];

if (!plugin || plugin.missing) {
  throw new Error(`Settings inventory has no available consumer: ${consumer}`);
}

const fields = Object.entries(plugin.fields || {})
  .map(([key, sourcePaths]) => ({
    key,
    // Product decision: statically registered fields belong to this artifact.
    // The manifest remains review-only until dynamic/filter and mixed-version
    // behavior are closed.
    owner: consumer,
    status: "unclassified",
    evidence: {
      registeredBy: [...sourcePaths].sort(),
      directAccess: [...(plugin.directAccess?.[key] || [])].sort(),
    },
    review: "Confirm product ownership, shared-field status and mixed-version preservation before promoting this key.",
  }))
  .sort((left, right) => left.key.localeCompare(right.key));

const directAccessWithoutRegistration = Object.entries(plugin.directAccess || {})
  .filter(([key]) => !(key in (plugin.fields || {})))
  .map(([key, access]) => ({ key, access: [...access].sort() }))
  .sort((left, right) => left.key.localeCompare(right.key));

const manifest = {
  schema: 1,
  generatedBy: "tools/generate-settings-ownership-review-manifest.mjs",
  status: "review-required",
  buildInput: false,
  storage: inventory.storage,
  consumer,
  ownershipDecision: {
    status: "approved-for-static-registrations",
    owner: consumer,
    approvedBy: "product-owner",
    note: "All statically registered fields are owned by this artifact; dynamic registrations, indirect filters and mixed-version behavior remain review-required.",
  },
  sourceInventory: "settings-field-inventory.json",
  candidateFields: fields,
  blockers: {
    literalCrossProductCollisions: inventory.collisions || {},
    directAccessWithoutRegistration,
    unresolvedInventoryScope: inventory.unresolved,
  },
  promotionRules: [
    "Every field requires exactly one product owner or an explicit shared-field policy.",
    "Direct reads/writes without registration, dynamic registration and indirect filters require source review.",
    "The shared wpdev_v2_settings option must retain unknown sibling keys during mixed-version saves.",
    "The assembler and migration tooling must reject this manifest while buildInput is false or any field is unclassified.",
  ],
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`Settings ownership review manifest written: ${output}\n`);
