#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "serialized-callback-inventory.json"),
);
const excludedDirectories = new Set([
  ".git", "dependencies", "dev", "dist", "node_modules", "packages", "tests", "vendor", "vendor-prefixed",
]);
const scanRoots = [
  path.join(contentRoot, "plugins", "wpdev"),
  path.join(contentRoot, "plugins", consumer),
  path.join(contentRoot, "plugins", "tavangary-core"),
  path.join(contentRoot, "plugins", "drm-connector"),
  path.join(contentRoot, "themes", "tavangary"),
];

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

async function walkPhpFiles(root, relative = "") {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
  } catch (error) {
    throw new Error(`cannot read source directory ${path.join(root, relative)}: ${error.message}`);
  }
  const files = [];
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      throw new Error(`source-tree symlink is not allowed: ${child}`);
    }
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) files.push(...await walkPhpFiles(root, child));
    } else if (entry.isFile() && entry.name.endsWith(".php")) {
      files.push(child.replaceAll(path.sep, "/"));
    }
  }
  return files.sort();
}

const findings = [];
for (const root of scanRoots) {
  const rootLabel = path.relative(contentRoot, root).replaceAll(path.sep, "/");
  let rootStat;
  try {
    rootStat = await fs.lstat(root);
  } catch (error) {
    throw new Error(`cannot inspect source root ${root}: ${error.message}`);
  }
  if (rootStat.isSymbolicLink()) {
    throw new Error(`source-tree symlink is not allowed: ${rootLabel}`);
  }
  if (!rootStat.isDirectory()) {
    throw new Error(`source root is not a directory: ${rootLabel}`);
  }
  for (const relative of await walkPhpFiles(root)) {
    const source = await fs.readFile(path.join(root, relative), "utf8");
    const file = `${rootLabel}/${relative}`;
    for (const match of source.matchAll(/\b(maybe_unserialize|unserialize)\s*\(/g)) {
      findings.push({
        file,
        kind: "deserialization",
        operation: match[1],
        line: lineAt(source, match.index),
      });
    }
    for (const match of source.matchAll(/\bfunction\s+(__wakeup|__unserialize)\s*\(/g)) {
      findings.push({
        file,
        kind: "magic-method",
        operation: match[1],
        line: lineAt(source, match.index),
      });
    }
  }
}

findings.sort((left, right) => (
  left.file.localeCompare(right.file)
  || left.line - right.line
  || left.kind.localeCompare(right.kind)
));

const report = {
  schema: 1,
  generatedBy: "tools/serialized-callback-inventory.mjs",
  purpose: "Static evidence for serialized object/class-string/callback migration review; not a transformation policy or build input.",
  consumer,
  status: "review-required",
  buildInput: false,
  scannedRoots: scanRoots.map((root) => path.relative(contentRoot, root).replaceAll(path.sep, "/")),
  excludedDirectories: [...excludedDirectories].sort(),
  findings,
  blockers: {
    deserializationSites: findings.filter((finding) => finding.kind === "deserialization"),
    magicMethods: findings.filter((finding) => finding.kind === "magic-method"),
    persistedCallbackClosure: "Static source cannot prove serialized object/class-string/callback values or their external producers; review each finding with frozen data fixtures before prefixing or moving runtime classes.",
  },
  promotionRules: [
    "A class name recorded in stored serialized data must have an explicit compatibility/migration policy before prefixing or moving it.",
    "Unknown serialized object, class-string or callback producers remain fail-closed; a source scan does not prove stored data shape.",
    "Third-party and excluded dependency data must not be blanket-rewritten.",
  ],
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Serialized callback inventory written: ${output}\n`);
