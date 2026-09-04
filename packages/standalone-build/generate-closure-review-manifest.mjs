#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "plugins", consumer, "dev", "closure-review-manifest.json"),
);
const inventory = JSON.parse(
  await fs.readFile(path.join(contentRoot, "framework-closure-inventory.json"), "utf8"),
);
const templateInventory = JSON.parse(
  await fs.readFile(path.join(contentRoot, "plugins", consumer, "dev", "template-dependency-review.json"), "utf8")
    .catch(() => "{}"),
);

if (inventory.scope?.consumer !== consumer) {
  throw new Error(`Closure inventory belongs to ${inventory.scope?.consumer || "unknown"}, not ${consumer}`);
}

const closure = inventory.literalIncludeClosure;
const roots = new Set(closure.roots);
const includedBy = new Map();
for (const edge of closure.edges) {
  if (!includedBy.has(edge.to)) includedBy.set(edge.to, new Set());
  includedBy.get(edge.to).add(edge.from);
}

const paths = closure.files.map((file) => ({
  path: file,
  status: "unclassified",
  proposedRole: null,
  evidence: {
    directRoot: roots.has(file),
    literalIncludedBy: [...(includedBy.get(file) || [])].sort(),
  },
  review: "Assign an allowed file role only after transitive autoload, hook and ownership review. This manifest is not consumed by an assembler.",
}));

const templateEvidence = new Map();
for (const [view, files] of Object.entries(templateInventory.resolvedLiteralFiles || {})) {
  for (const file of files) {
    if (!templateEvidence.has(file)) templateEvidence.set(file, []);
    templateEvidence.get(file).push(view);
  }
}
for (const [file, views] of templateEvidence) {
  if (!paths.some((candidate) => candidate.path === file)) {
    paths.push({
      path: file,
      status: "unclassified",
      proposedRole: null,
      evidence: { directRoot: false, literalIncludedBy: [], templateViews: views.sort() },
      review: "Assign an allowed role only after template ownership and runtime trace review. This manifest is not consumed by an assembler.",
    });
  } else {
    const candidate = paths.find((item) => item.path === file);
    candidate.evidence.templateViews = views.sort();
  }
}

const manifest = {
  schema: 1,
  generatedBy: "tools/generate-closure-review-manifest.mjs",
  status: "review-required",
  buildInput: false,
  consumer,
  sourceInventory: "framework-closure-inventory.json",
  templateInventory: "plugins/tavangary-theme-panel/dev/template-dependency-review.json",
  candidatePaths: paths.sort((left, right) => left.path.localeCompare(right.path)),
  blockers: {
    unresolvedIncludes: closure.unresolved,
    unresolvedFunctions: inventory.unresolved.functions,
    unresolvedClasses: inventory.unresolved.classes,
    unresolvedHooks: inventory.unresolved.hooks,
  },
  compatibilityInputs: {
    wordpressCoreIncludes: closure.externalWordPressCore || [],
    constrainedDynamicIncludes: closure.constrainedDynamicIncludes || [],
  },
  promotionRules: [
    "Every candidate path needs an allowed role and owner before becoming build input.",
    "Any unresolved include, Composer/autoload dependency, dynamic hook or external listener blocks promotion.",
    "The assembler must reject this manifest while buildInput is false or any candidate is unclassified.",
  ],
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`Closure review manifest written: ${output}\n`);
