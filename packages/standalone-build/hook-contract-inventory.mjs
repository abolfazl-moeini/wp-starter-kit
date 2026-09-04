#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumerName = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "hook-contract-inventory.json"),
);
const inventory = JSON.parse(await fs.readFile(path.join(contentRoot, "protection-inventory.json"), "utf8"));
const consumer = inventory.plugins.find((item) => item.name === consumerName);
if (!consumer) throw new Error(`Consumer not present in protection inventory: ${consumerName}`);

const excluded = new Set([
  ".git", "dependencies", "dist", "docs", "examples", "node_modules", "tests", "vendor", "vendor-prefixed",
]);

async function walk(root, relative = "") {
  const files = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      throw new Error(`source-tree symlink is not allowed: ${child}`);
    }
    if (entry.isDirectory() && !excluded.has(entry.name)) files.push(...await walk(root, child));
    if (entry.isFile() && entry.name.endsWith(".php")) files.push(child);
  }
  return files.sort();
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templateMatcher(template) {
  const variables = /\{\$[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*/g;
  let pattern = "^";
  let offset = 0;
  for (const match of template.matchAll(variables)) {
    pattern += escaped(template.slice(offset, match.index));
    pattern += ".+";
    offset = match.index + match[0].length;
  }
  return `${pattern}${escaped(template.slice(offset))}$`;
}

function add(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function sorted(map) {
  return Object.fromEntries(
    [...map]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, values.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line)]),
  );
}

function scanHooks(source, relative) {
  const listeners = new Map();
  const producers = new Map();
  const dynamicProducers = [];
  const literal = /\b(add_action|add_filter|remove_action|remove_filter|do_action|do_action_ref_array|apply_filters|apply_filters_ref_array)\s*\(\s*['\"](wpdev_[^'\"]+)['\"]/g;
  for (const match of source.matchAll(literal)) {
    const operation = match[1];
    const location = { path: relative, line: lineAt(source, match.index), operation };
    if (operation.startsWith("add_") || operation.startsWith("remove_")) add(listeners, match[2], location);
    else add(producers, match[2], location);
  }
  const quotedDynamic = /\b(do_action|do_action_ref_array|apply_filters|apply_filters_ref_array)\s*\(\s*(['\"])(wpdev_[^'\"]*\$[^'\"]*)\2/g;
  for (const match of source.matchAll(quotedDynamic)) {
    dynamicProducers.push({
      template: match[3],
      matcher: templateMatcher(match[3]),
      specificity: match[3].replace(/\{?\$[^}]*(?:\})?/g, "").length,
      path: relative,
      line: lineAt(source, match.index),
      operation: match[1],
    });
  }
  const concatenatedDynamic = /\b(do_action|do_action_ref_array|apply_filters|apply_filters_ref_array)\s*\(\s*(['\"])(wpdev_[A-Za-z0-9_-]*)\2\s*\./g;
  for (const match of source.matchAll(concatenatedDynamic)) {
    dynamicProducers.push({
      template: `${match[3]}…`,
      matcher: `^${escaped(match[3])}`,
      specificity: match[3].length,
      path: relative,
      line: lineAt(source, match.index),
      operation: match[1],
    });
  }
  return { listeners, producers, dynamicProducers };
}

async function index(root) {
  const listeners = new Map();
  const producers = new Map();
  const dynamicProducers = [];
  for (const relative of await walk(root)) {
    const source = await fs.readFile(path.join(root, relative), "utf8");
    const scanned = scanHooks(source, relative);
    for (const [hook, locations] of scanned.listeners) locations.forEach((location) => add(listeners, hook, location));
    for (const [hook, locations] of scanned.producers) locations.forEach((location) => add(producers, hook, location));
    dynamicProducers.push(...scanned.dynamicProducers);
  }
  return { listeners, producers, dynamicProducers: dynamicProducers.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line) };
}

const requested = [...new Set(
  consumer.references.hooks
    .map((entry) => entry.match(/['\"](wpdev_[^'\"]+)['\"]/)?.[1])
    .filter(Boolean),
)].sort();
const consumerRoot = path.join(contentRoot, consumer.root);
const frameworkRoot = path.join(contentRoot, "plugins", "wpdev");
const [consumerIndex, frameworkIndex] = await Promise.all([index(consumerRoot), index(frameworkRoot)]);

const contracts = {};
for (const hook of requested) {
  const possibleDynamicMatches = frameworkIndex.dynamicProducers.filter((producer) => new RegExp(producer.matcher).test(hook));
  const bestSpecificity = Math.max(0, ...possibleDynamicMatches.map((producer) => producer.specificity));
  const dynamicMatches = possibleDynamicMatches.filter((producer) => producer.specificity === bestSpecificity);
  contracts[hook] = {
    consumerListeners: consumerIndex.listeners.get(hook) || [],
    consumerProducers: consumerIndex.producers.get(hook) || [],
    frameworkProducers: frameworkIndex.producers.get(hook) || [],
    matchingFrameworkDynamicProducers: dynamicMatches,
    ownership: "unclassified",
    compatibility: "frozen-public",
    decision: "Keep this observed compatibility hook frozen under the approved hybrid-facade policy. Do not rename/remove it; private implementation may sit behind a bounded provider only after all listeners and dynamic domains are proven.",
  };
}

const report = {
  schema: 1,
  generatedBy: "tools/hook-contract-inventory.mjs",
  purpose: "Static hook-contract evidence for Profile A review; it neither authorizes renaming nor proves an external listener closure.",
  policyDecision: {
    option: "C",
    status: "approved-hybrid-facade",
    approvedBy: "product-owner",
    note: "Observed public hook contracts stay frozen; only internal implementation may be isolated behind a bounded private provider.",
  },
  scope: {
    consumer: consumerName,
    consumerRoot: consumer.root,
    frameworkRoot: "plugins/wpdev",
    excluded: [...excluded].sort(),
  },
  contracts,
  allConsumerLiteralHooks: {
    listeners: sorted(consumerIndex.listeners),
    producers: sorted(consumerIndex.producers),
  },
  matchingRules: [
    "A literal hook is listed only when PHP source passes a literal string to a WordPress hook API.",
    "A dynamic producer is a prefix match, not an exact proof. Its identifier domain and all external listeners need dedicated fixtures before any transform.",
    "Scan roots deliberately exclude vendor and tests. WordPress, third-party plugins, themes, persisted callback names, and runtime-generated hooks remain unresolved external space.",
  ],
};
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Hook contract inventory written: ${output}\n`);
