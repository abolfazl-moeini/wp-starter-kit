#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const output = path.resolve(
  process.argv[3] || path.join(contentRoot, "settings-field-inventory.json"),
);
const consumers = [
  "tavangary-theme-panel",
  "wpdev-analytics",
  "wpdev-crm",
  "wpdev-tickets",
  "tavangary-core",
  "drm-connector",
  "wpdev-woo-persian",
];

async function filesUnder(root) {
  const files = [];
  const visit = async (relative = "") => {
    const directory = path.join(root, relative);
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        throw new Error(`source-tree symlink is not allowed: ${child}`);
      }
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) await visit(child);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".php")) files.push(child);
    }
  };
  await visit();
  return files.sort();
}

const excludedDirectories = new Set(["tests", "vendor", "vendor-prefixed", "node_modules", "dist", "packages"]);
const excluded = /^(?:tests|vendor|vendor-prefixed|node_modules|dist|packages)\//;
const plugins = {};
const ownership = new Map();
for (const name of consumers) {
  const pluginRoot = path.join(contentRoot, "plugins", name);
  const fields = new Map();
  const directAccess = new Map();
  try {
    const rootStat = await fs.lstat(pluginRoot);
    if (rootStat.isSymbolicLink()) {
      throw new Error(`source-tree symlink is not allowed: plugins/${name}`);
    }
    if (!rootStat.isDirectory()) {
      throw new Error(`source root is not a directory: plugins/${name}`);
    }
  } catch (error) {
    if (error && /^(source-tree symlink|source root)/.test(error.message || "")) throw error;
    plugins[name] = { missing: true };
    continue;
  }
  for (const relative of await filesUnder(pluginRoot)) {
    if (excluded.test(relative)) continue;
    const source = await fs.readFile(path.join(pluginRoot, relative), "utf8");
    const matcher = /wpdev_register_settings_field\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g;
    for (const match of source.matchAll(matcher)) {
      const key = match[1];
      const locations = fields.get(key) || [];
      locations.push(relative);
      fields.set(key, locations);
      const owners = ownership.get(key) || new Set();
      owners.add(name);
      ownership.set(key, owners);
    }
    const directMatcher = /wpdev_(get|save)_setting\s*\(\s*['"]([^'"]+)['"]/g;
    for (const match of source.matchAll(directMatcher)) {
      const key = match[2];
      const access = directAccess.get(key) || new Set();
      access.add(match[1]);
      directAccess.set(key, access);
      const owners = ownership.get(key) || new Set();
      owners.add(name);
      ownership.set(key, owners);
    }
  }
  plugins[name] = {
    storage: "wpdev_v2_settings",
    fields: Object.fromEntries([...fields].sort(([a], [b]) => a.localeCompare(b))),
    directAccess: Object.fromEntries(
      [...directAccess]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, access]) => [key, [...access].sort()]),
    ),
  };
}

const report = {
  schema: 1,
  generatedBy: "tools/settings-field-inventory.mjs",
  storage: "wpdev_v2_settings",
  plugins,
  collisions: Object.fromEntries(
    [...ownership]
      .filter(([, owners]) => owners.size > 1)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, owners]) => [key, [...owners].sort()]),
  ),
  unresolved: "Dynamic registrations, indirect filters, and unregistered direct option writes require source review before ownership is final.",
};
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Settings field inventory written: ${output}\n`);
