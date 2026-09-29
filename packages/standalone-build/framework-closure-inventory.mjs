#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumerName = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "framework-closure-inventory.json"),
);
const inventoryPath = path.join(contentRoot, "protection-inventory.json");
const frameworkRoot = path.join(contentRoot, "plugins", "wpdev");

const frameworkRootStat = await fs.lstat(frameworkRoot).catch((error) => {
  throw new Error(`cannot inspect framework root: ${error.message}`);
});
if (frameworkRootStat.isSymbolicLink()) {
  throw new Error("source-tree symlink is not allowed: plugins/wpdev");
}
if (!frameworkRootStat.isDirectory()) {
  throw new Error("framework root is not a directory: plugins/wpdev");
}

const excludedDirectories = new Set([
  ".git", "dependencies", "dist", "docs", "examples", "node_modules", "tests", "vendor", "vendor-prefixed",
]);

async function walkPhpFiles(root, relative = "") {
  const directory = path.join(root, relative);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      throw new Error(`source-tree symlink is not allowed: ${child}`);
    }
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) files.push(...await walkPhpFiles(root, child));
    } else if (entry.isFile() && entry.name.endsWith(".php")) {
      files.push(child);
    }
  }
  return files.sort();
}

function add(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function asSortedObject(map) {
  return Object.fromEntries(
    [...map]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, [...values].sort()]),
  );
}

function literalHooks(source) {
  const hooks = [];
  const matcher = /(?:do_action|do_action_ref_array|apply_filters|apply_filters_ref_array)\s*\(\s*['\"](wpdev_[^'\"]+)['\"]/g;
  for (const match of source.matchAll(matcher)) hooks.push(match[1]);
  return hooks;
}

function definitions(source) {
  const functions = [];
  const functionMatcher = /(?:^|[;{}\s])function\s+(wpdev_[A-Za-z0-9_]+)\s*\(/gm;
  for (const match of source.matchAll(functionMatcher)) functions.push(match[1]);

  const namespace = source.match(/^\s*namespace\s+([^;{\s]+)\s*;/m)?.[1] || "";
  const classes = [];
  const classMatcher = /^\s*(?:abstract\s+|final\s+)?(?:class|interface|trait|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm;
  for (const match of source.matchAll(classMatcher)) {
    if (namespace === "WPDevFramework" || namespace.startsWith("WPDevFramework\\")) {
      classes.push(`${namespace}\\${match[1]}`);
    }
  }
  return { functions, classes };
}

function requestedFrameworkClasses(namespaces) {
  return [...new Set(namespaces.filter((item) => {
    if (!item.startsWith("WPDevFramework\\")) return false;
    return !item.endsWith("\\");
  }))].sort();
}

function literalIncludes(source, relative) {
  const resolved = [];
  const unresolved = [];
  const externalWordPressCore = [];
  const matcher = /(?:^|\n)\s*(?:require_once|include_once|require|include)\b\s*(?:\(\s*)?(.+?)(?:\s*\))?\s*;/g;
  for (const match of source.matchAll(matcher)) {
    const expression = match[1].trim();
    const dirnameMatch = expression.match(/^dirname\(\s*__DIR__\s*(?:,\s*(\d+)\s*)?\)\s*\.\s*['\"]([^'\"]+)['\"]$/);
    const dirMatch = expression.match(/^__DIR__\s*\.\s*['\"]([^'\"]+)['\"]$/);
    const coreMatch = expression.match(/^ABSPATH\s*\.\s*['\"]((?:wp-admin|wp-includes)\/[^'\"]+)['\"]$/);
    if (dirnameMatch) {
      const levels = Number(dirnameMatch[1] || 1);
      const base = Array.from({ length: levels }, () => "..").join("/");
      resolved.push(path.posix.normalize(path.posix.join(path.posix.dirname(relative), base, dirnameMatch[2])));
    } else if (dirMatch) {
      resolved.push(path.posix.normalize(path.posix.join(path.posix.dirname(relative), dirMatch[1])));
    } else if (coreMatch) {
      externalWordPressCore.push({ path: relative, target: coreMatch[1] });
    } else {
      unresolved.push({ path: relative, expression });
    }
  }
  return { resolved, unresolved, externalWordPressCore };
}

function publicFunctionMapTargets(source) {
  const targets = [];
  const matcher = /['"][A-Za-z0-9-]+\.php['"]\s*=>\s*['"](\/modules\/[^'"]+\.php)['"]/g;
  for (const match of source.matchAll(matcher)) {
    const target = match[1].replace(/^\//, "");
    if (target.startsWith("modules/")) targets.push(target);
  }
  return [...new Set(targets)].sort();
}

async function literalIncludeClosure(root, roots) {
  const files = new Set();
  const edges = [];
  const unresolved = [];
  const externalWordPressCore = [];
  const constrainedDynamicIncludes = [];
  const queue = [...new Set(roots)].sort();
  while (queue.length) {
    const relative = queue.shift();
    if (files.has(relative)) continue;
    files.add(relative);
    let source;
    try {
      source = await fs.readFile(path.join(root, relative), "utf8");
    } catch {
      unresolved.push({ path: relative, expression: "root file missing" });
      continue;
    }
    const includes = literalIncludes(source, relative);
    externalWordPressCore.push(...includes.externalWordPressCore);
    if (
      relative === "modules/core/src/functions/module-require.php" &&
      includes.unresolved.some((item) => item.expression === "$path")
    ) {
      const targets = publicFunctionMapTargets(source);
      if (targets.length === 0) {
        unresolved.push({ path: relative, expression: "empty public function map" });
      } else {
        constrainedDynamicIncludes.push({
          path: relative,
          expression: "$path",
          contract: "wpdev_public_function_map allow-list",
          targets,
        });
        for (const target of targets) includes.resolved.push(target);
        for (let index = includes.unresolved.length - 1; index >= 0; index -= 1) {
          if (includes.unresolved[index].expression === "$path") includes.unresolved.splice(index, 1);
        }
      }
    }
    unresolved.push(...includes.unresolved);
    for (const target of includes.resolved) {
      const normalized = path.posix.normalize(target);
      if (
        normalized === ".." ||
        normalized.startsWith("../") ||
        path.posix.isAbsolute(normalized) ||
        normalized.includes("\\")
      ) {
        unresolved.push({
          path: relative,
          expression: `unsafe include outside framework root: ${normalized}`,
        });
        continue;
      }
      const targetPath = path.join(root, normalized);
      try {
        const stat = await fs.lstat(targetPath);
        if (!stat.isFile()) throw new Error("not a regular file");
        edges.push({
          from: relative,
          to: normalized,
          kind: relative === "modules/core/src/functions/module-require.php" ? "constrained-map" : "literal",
        });
        if (!files.has(normalized)) queue.push(normalized);
      } catch {
        unresolved.push({ path: relative, expression: `missing literal include: ${target}` });
      }
    }
  }
  return {
    roots: [...new Set(roots)].sort(),
    files: [...files].sort(),
    edges: edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to)),
    unresolved: unresolved.sort((left, right) => left.path.localeCompare(right.path) || left.expression.localeCompare(right.expression)),
    externalWordPressCore: externalWordPressCore.sort((left, right) => left.path.localeCompare(right.path) || left.target.localeCompare(right.target)),
    constrainedDynamicIncludes,
  };
}

const rawInventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const consumer = rawInventory.plugins.find((item) => item.name === consumerName);
if (!consumer) throw new Error(`Consumer not present in protection inventory: ${consumerName}`);

const sourceFiles = await walkPhpFiles(frameworkRoot);
const consumerSourceFiles = await walkPhpFiles(path.join(contentRoot, consumer.root));
const functionDefinitions = new Map();
const classDefinitions = new Map();
const hookProducers = new Map();
const consumerFunctionDefinitions = new Map();
for (const relative of sourceFiles) {
  const source = await fs.readFile(path.join(frameworkRoot, relative), "utf8");
  const declared = definitions(source);
  declared.functions.forEach((symbol) => add(functionDefinitions, symbol, relative));
  declared.classes.forEach((symbol) => add(classDefinitions, symbol, relative));
  literalHooks(source).forEach((hook) => add(hookProducers, hook, relative));
}
for (const relative of consumerSourceFiles) {
  const source = await fs.readFile(path.join(contentRoot, consumer.root, relative), "utf8");
  definitions(source).functions.forEach((symbol) => add(consumerFunctionDefinitions, symbol, relative));
}

const references = consumer.references;
const requestedFunctions = [...new Set(references.wpdevSymbols)].sort();
const requestedClasses = requestedFrameworkClasses(references.frameworkNamespaces);
const requestedHooks = [...new Set(
  references.hooks
    .map((entry) => entry.match(/['\"](wpdev_[^'\"]+)['\"]/)?.[1])
    .filter(Boolean),
)].sort();
const hookContracts = await fs.readFile(path.join(contentRoot, "hook-contract-inventory.json"), "utf8")
  .then((content) => JSON.parse(content).contracts || {})
  .catch(() => ({}));

const functionMappings = new Map();
const classMappings = new Map();
const hookMappings = new Map();
const dynamicHookMappings = new Map();
const consumerFunctionMappings = new Map();
const unresolved = { functions: [], classes: [], hooks: [] };
for (const symbol of requestedFunctions) {
  const definitionsForSymbol = functionDefinitions.get(symbol);
  const consumerDefinitionsForSymbol = consumerFunctionDefinitions.get(symbol);
  if (definitionsForSymbol) {
    functionMappings.set(symbol, definitionsForSymbol);
  } else if (consumerDefinitionsForSymbol) {
    consumerFunctionMappings.set(symbol, consumerDefinitionsForSymbol);
  } else if (!hookProducers.has(symbol)) {
    unresolved.functions.push(symbol);
  }
}
for (const symbol of requestedClasses) {
  const definitionsForSymbol = classDefinitions.get(symbol);
  if (definitionsForSymbol) classMappings.set(symbol, definitionsForSymbol);
  else unresolved.classes.push(symbol);
}
for (const hook of requestedHooks) {
  const producers = hookProducers.get(hook);
  if (producers) {
    hookMappings.set(hook, producers);
    continue;
  }
  const dynamicProducers = hookContracts[hook]?.matchingFrameworkDynamicProducers || [];
  const paths = dynamicProducers
    .map((item) => item.path)
    .filter((item) => typeof item === "string" && item.length > 0)
    .sort();
  if (paths.length > 0) dynamicHookMappings.set(hook, new Set(paths));
  else unresolved.hooks.push(hook);
}

const directRoots = [
  ...[...functionMappings.values()].flatMap((values) => [...values]),
  ...[...classMappings.values()].flatMap((values) => [...values]),
  ...[...hookMappings.values()].flatMap((values) => [...values]),
  ...[...dynamicHookMappings.values()].flatMap((values) => [...values]),
];
const literalClosure = await literalIncludeClosure(frameworkRoot, directRoots);

const report = {
  schema: 1,
  generatedBy: "tools/framework-closure-inventory.mjs",
  purpose: "Static source map for the Profile A closure. It is not a build manifest and must be reviewed before copying or rewriting any framework file.",
  scope: {
    consumer: consumerName,
    consumerRoot: consumer.root,
    framework: "plugins/wpdev",
    sourceExclusions: [...excludedDirectories].sort(),
    note: "WPDev\\ namespaces are consumer-local packages, not definitions expected from the standalone wpdev plugin.",
  },
  sourceFilesConsidered: sourceFiles.length,
  consumerSourceFilesConsidered: consumerSourceFiles.length,
  requested: {
    functions: requestedFunctions,
    frameworkClasses: requestedClasses,
    consumerLocalNamespaces: [...new Set(references.frameworkNamespaces.filter((item) => item.startsWith("WPDev\\")))].sort(),
    hooks: requestedHooks,
    dynamicEdges: references.dynamicEdges,
  },
  mappings: {
    functions: asSortedObject(functionMappings),
    consumerOrPackageFunctions: asSortedObject(consumerFunctionMappings),
    frameworkClasses: asSortedObject(classMappings),
    hookProducers: asSortedObject(hookMappings),
    dynamicHookProducers: asSortedObject(dynamicHookMappings),
  },
  literalIncludeClosure: literalClosure,
  unresolved,
  reviewRequired: [
    "Consumer/package function mappings are context only. Their Composer/Strauss ownership must be classified separately; they are not candidates for copying from standalone wpdev.",
    "Constrained dynamic hook producers are mapped only when hook-contract-inventory.json names their framework paths; they remain review-required and are not permission to rename or copy by glob.",
    "Unresolved functions may be dynamic callbacks, JavaScript-only names, or real missing dependencies; classify each before the Profile A closure is approved.",
    "literalIncludeClosure follows literal __DIR__/dirname(__DIR__) includes. The one recognized $path edge is expanded only from the closed wpdev_public_function_map allow-list and remains review evidence, not permission to glob. Explicit ABSPATH wp-admin/wp-includes includes are WordPress-core compatibility inputs, not framework files to copy. Composer autoload rules, namespace class dependencies and unresolved/dynamic includes still require a reviewed closure manifest.",
    "Do not copy files from this report directly. The assembler must derive and validate a dependency closure from approved fixture rules.",
  ],
};

await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Framework closure inventory written: ${output}\n`);
