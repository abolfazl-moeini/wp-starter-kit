#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "plugins", consumer, "dev", "serialized-callback-review-manifest.json"),
);
const inventory = JSON.parse(
  await fs.readFile(path.join(contentRoot, "serialized-callback-inventory.json"), "utf8"),
);

if (inventory.consumer !== consumer) {
  throw new Error(`Serialized callback inventory belongs to ${inventory.consumer || "unknown"}, not ${consumer}`);
}

const candidateFindings = (inventory.findings || []).map((finding) => ({
  file: finding.file,
  line: finding.line,
  kind: finding.kind,
  operation: finding.operation,
  status: "unclassified",
  compatibility: "unclassified",
  review: "Prove stored-data shape with frozen legacy bytes and define migration, adapter, alias, or explicit non-runtime exclusion before any class prefix or relocation.",
}));

const manifest = {
  schema: 1,
  generatedBy: "tools/generate-serialized-callback-review-manifest.mjs",
  purpose: "Review contract for serialized object/class-string/callback compatibility; not a build input until explicitly approved.",
  consumer,
  sourceInventory: "serialized-callback-inventory.json",
  status: "review-required",
  buildInput: false,
  candidateFindings,
  blockers: {
    persistedCallbackClosure: inventory.blockers?.persistedCallbackClosure || "Source inventory must be reviewed.",
  },
  promotionRules: [
    "Every source finding requires an approved compatibility classification and frozen legacy-data fixture before Profile A mutation.",
    "Unknown serialized class names/callbacks block class prefixing, namespace relocation and compatibility aliases.",
    "A generated manifest cannot be promoted merely by changing status; evidence must match the exact source inventory.",
  ],
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`Serialized callback review manifest written: ${output}\n`);
