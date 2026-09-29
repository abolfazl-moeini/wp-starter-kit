#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "template-dependency-inventory.json"),
);
const closure = JSON.parse(
  await fs.readFile(path.join(contentRoot, "framework-closure-inventory.json"), "utf8"),
);
if (closure.scope?.consumer !== consumer) {
  throw new Error(`Closure inventory belongs to ${closure.scope?.consumer || "unknown"}, not ${consumer}`);
}

const frameworkRoot = path.join(contentRoot, "plugins", "wpdev");
// First-party roots keep the strict rule: a symlink inside them is a hygiene
// violation and stays fatal. Everything else discovered on the site is scanned
// too, but an unscannable third-party root is reported instead of thrown.
const firstPartyLabels = new Set([
  `plugins/${consumer}`,
  "plugins/tavangary-core",
  "plugins/drm-connector",
  "themes/tavangary",
]);
const calls = [];
const literalViews = new Set();
const dynamicCalls = [];
const filters = new Map();
const resolvedLiteralFiles = new Map();
const unresolvedLiteralViews = [];
const externalListeners = new Map();
const moduleViewRegistrations = [];
const templateRootOverrides = [];

function addFilter(name, file) {
  if (!filters.has(name)) filters.set(name, new Set());
  filters.get(name).add(file);
}

const EXCLUDED_DIRECTORIES = [".git", "vendor", "vendor-prefixed", "node_modules", "dist", "tests", "dev"];

// Returns { files, skipped }. A symlink anywhere under the root makes the whole
// root unscannable, because silently omitting linked PHP would understate the
// external listener surface.
async function collectPhpFiles(root) {
  const files = [];
  const stack = [""];
  while (stack.length) {
    const relative = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(path.join(root, relative), { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return { files: null, skipped: `source root disappeared: ${relative || "."}` };
      return { files: null, skipped: `cannot read source directory ${relative || "."}: ${error.message}` };
    }
    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        return { files: null, skipped: `source-tree symlink is not allowed: ${child}` };
      }
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.includes(entry.name)) stack.push(child);
      } else if (entry.isFile() && entry.name.endsWith(".php")) {
        files.push(child.replaceAll(path.sep, "/"));
      }
    }
  }
  return { files: files.sort(), skipped: null };
}

// Discover every installed code root: each plugin, each theme and mu-plugins.
// Repository-only scanning left third-party plugins, other themes and
// mu-plugins entirely unproven.
async function discoverScanTargets() {
  const targets = [];
  const unscannable = [];
  for (const directory of ["plugins", "themes"]) {
    const base = path.join(contentRoot, directory);
    let entries;
    try {
      entries = await fs.readdir(base, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      unscannable.push({ root: directory, reason: `cannot read content root: ${error.message}` });
      continue;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        unscannable.push({ root: `${directory}/${entry.name}`, reason: "symlinked content root" });
        continue;
      }
      if (!entry.isDirectory()) continue;
      targets.push({ root: path.join(base, entry.name), label: `${directory}/${entry.name}` });
    }
  }
  try {
    const stat = await fs.lstat(path.join(contentRoot, "mu-plugins"));
    if (stat.isSymbolicLink()) unscannable.push({ root: "mu-plugins", reason: "symlinked content root" });
    else if (stat.isDirectory()) targets.push({ root: path.join(contentRoot, "mu-plugins"), label: "mu-plugins" });
  } catch (error) {
    if (error.code !== "ENOENT") {
      unscannable.push({ root: "mu-plugins", reason: `cannot inspect content root: ${error.message}` });
    }
  }
  targets.sort((left, right) => left.label.localeCompare(right.label));
  return { targets, unscannable };
}

async function resolveView(view) {
  const normalizedView = String(view).replaceAll("\\", "/").replace(/^\/+/, "");
  if (normalizedView.includes("\0") || /(^|\/)\.\.(\/|$)/.test(normalizedView)) return [];

  const realFrameworkRoot = await fs.realpath(frameworkRoot).catch(() => null);
  if (!realFrameworkRoot) return [];

  const candidates = [path.join(frameworkRoot, "views", `${normalizedView}.php`)];
  for (const entry of await fs.readdir(path.join(frameworkRoot, "modules"), { withFileTypes: true })) {
    if (entry.isDirectory()) candidates.push(path.join(frameworkRoot, "modules", entry.name, "views", `${normalizedView}.php`));
  }
  const matches = [];
  for (const candidate of candidates) {
    try {
      const realCandidate = await fs.realpath(candidate);
      const relativeToRoot = path.relative(realFrameworkRoot, realCandidate);
      if (relativeToRoot === ".." || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) continue;
      const stat = await fs.stat(candidate);
      if (stat.isFile()) matches.push(path.relative(frameworkRoot, candidate).split(path.sep).join("/"));
    } catch {
      // Missing view candidate is reported below when no root contains it.
    }
  }
  return matches.sort();
}

for (const relative of closure.literalIncludeClosure.files) {
  const file = path.join(frameworkRoot, relative);
  const source = await fs.readFile(file, "utf8");
  const hasBoundedRootContract =
    source.includes("Bounded_View_Root_Registry::resolve") &&
    /if\s*\(\s*\$has_custom_root\s*&&\s*!\s*\$template\s*\)\s*\{\s*return\s*;\s*\}/.test(source) &&
    source.includes("Bounded_View_Root_Registry::is_approved_template");
  if (/\$args\s*\[\s*['"]dir['"]\s*\]/.test(source)) {
    templateRootOverrides.push({
      file: relative,
      expression: "$args['dir']",
      ...(hasBoundedRootContract ? { contract: "bounded-registered-root" } : {}),
    });
  }
  const callMatcher = /wpdev_(?:get_template|get_template_contents|view|view_contents|view_locate)\s*\(\s*([^,\)\n]+)/g;
  for (const match of source.matchAll(callMatcher)) {
    const declarationPrefix = source.slice(Math.max(0, match.index - 40), match.index);
    if (/function\s*$/.test(declarationPrefix)) continue;
    const expression = match[1].trim();
    const literalMatch = expression.match(/^["']([^"'${}]*)["']$/);
    const literal = literalMatch?.[1] || null;
    const record = { file: relative, expression, literalView: literal };
    calls.push(record);
    if (literal) {
      literalViews.add(literal);
      const matches = await resolveView(literal);
      if (matches.length) resolvedLiteralFiles.set(literal, matches);
      else unresolvedLiteralViews.push({ file: relative, view: literal });
    } else dynamicCalls.push(record);
  }
  const filterMatcher = /(?:apply_filters|add_filter)\s*\(\s*['"](wpdev_(?:view_locate|view_override|view_override_replaceable_views|render_vars))['"]/g;
  for (const match of source.matchAll(filterMatcher)) addFilter(match[1], relative);
}

const { targets, unscannable } = await discoverScanTargets();
const scannedRoots = [];
const unscannedRoots = [...unscannable];

for (const target of targets) {
  const { files, skipped } = await collectPhpFiles(target.root);
  if (skipped) {
    // A symlink inside a first-party root is a hygiene violation and stays fatal.
    if (firstPartyLabels.has(target.label)) throw new Error(skipped);
    unscannedRoots.push({ root: target.label, reason: skipped });
    continue;
  }
  scannedRoots.push(target.label);
  for (const relative of files) {
    const source = await fs.readFile(path.join(target.root, relative), "utf8");
    const sourceLabel = `${target.label}/${relative}`;
    const listenerMatcher = /add_filter\s*\(\s*['"](wpdev_view_locate|wpdev_view_override|wpdev_view_override_replaceable_views|wpdev_render_vars)['"]/g;
    for (const match of source.matchAll(listenerMatcher)) {
      if (!externalListeners.has(match[1])) externalListeners.set(match[1], new Set());
      externalListeners.get(match[1]).add(sourceLabel);
    }
    const registryMatcher = /Module_View_Registry::register\s*\(\s*([^,\)\n]+)/g;
    for (const match of source.matchAll(registryMatcher)) {
      moduleViewRegistrations.push({ file: sourceLabel, moduleExpression: match[1].trim() });
    }
  }
}

const report = {
  schema: 1,
  generatedBy: "tools/framework-template-inventory.mjs",
  purpose: "Static view dependency evidence; not a copy/build manifest.",
  policyDecision: {
    option: "C",
    status: "approved-hybrid-facade",
    approvedBy: "product-owner",
    note: "Keep observed public compatibility hooks frozen; place only internal rendering/registry implementation behind a bounded private provider. Do not rename or remove public hooks, and do not ship standalone WPDev as a legacy fallback.",
  },
  scope: { consumer, framework: "plugins/wpdev", sourceInventory: "framework-closure-inventory.json" },
  calls: calls.sort((left, right) => left.file.localeCompare(right.file) || left.expression.localeCompare(right.expression)),
  literalViews: [...literalViews].sort(),
  resolvedLiteralFiles: Object.fromEntries([...resolvedLiteralFiles].sort(([a], [b]) => a.localeCompare(b))),
  dynamicCalls: dynamicCalls.sort((left, right) => left.file.localeCompare(right.file) || left.expression.localeCompare(right.expression)),
  filters: Object.fromEntries([...filters].sort(([a], [b]) => a.localeCompare(b)).map(([key, files]) => [key, [...files].sort()])),
  externalListeners: Object.fromEntries([...externalListeners].sort(([a], [b]) => a.localeCompare(b)).map(([key, files]) => [key, [...files].sort()])),
  externalListenerCoverage: {
    status: "incomplete",
    scannedRoots: scannedRoots.sort(),
    unscannedRoots: unscannedRoots.sort((left, right) => left.root.localeCompare(right.root)),
    notProven:
      "WordPress core (wp-includes), persisted callbacks in the database, runtime-generated listeners, and code installed after this scan are outside any static scan.",
  },
  moduleViewRegistrations: moduleViewRegistrations.sort((left, right) => left.file.localeCompare(right.file) || left.moduleExpression.localeCompare(right.moduleExpression)),
  templateRootOverrides: templateRootOverrides.sort((left, right) => left.file.localeCompare(right.file)),
  blockers: {
    dynamicTemplateExpressions: dynamicCalls,
    unresolvedLiteralViews,
    overrideFilters: [...filters.keys()].sort(),
    externalOverrideListeners: Object.fromEntries([...externalListeners].sort(([a], [b]) => a.localeCompare(b)).map(([key, files]) => [key, [...files].sort()])),
    externalListenerClosure: "External listener closure is incomplete; even a scan of every installed plugin, theme and mu-plugin cannot prove the public compatibility hooks are free of persisted, runtime-generated, or not-yet-installed listeners.",
    unboundedTemplateRootOverrides: templateRootOverrides
      .filter((entry) => entry.contract !== "bounded-registered-root")
      .sort((left, right) => left.file.localeCompare(right.file)),
    moduleViewRegistry: "Runtime registry may replace a literal view path; enumerate registered views before promotion.",
  },
  promotionRules: [
    "Every dynamic view expression requires an executable trace or a bounded registry contract.",
    "wpdev_view_override and wpdev_view_locate filters require every external listener to be inventoried.",
    "`$args['dir']` is allowed only when registered-root resolution, a custom-root fail-closed branch, and final-path approval are all present.",
    "A template path is never approved from a directory glob; missing, traversing or external paths fail closed.",
  ],
};

await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Template dependency inventory written: ${output}\n`);
