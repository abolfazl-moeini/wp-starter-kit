#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const CONTENT_ROOT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUTPUT = path.resolve(process.argv[3] || path.join(CONTENT_ROOT, "protection-inventory.json"));

const CONSUMERS = [
  "tavangary-theme-panel",
  "wpdev-analytics",
  "wpdev-crm",
  "wpdev-tickets",
  "tavangary-core",
  "drm-connector",
  "wpdev-woo-persian",
];
const EXCLUDED_PARTS = new Set([
  ".git", ".cursor", ".github", ".husky", ".wp-env", "node_modules",
  "vendor", "vendor-prefixed", "dist", "coverage", "artifacts", "tests", "plugin-core-test",
  "docs", "dev",
]);
const SOURCE_EXTENSIONS = new Set([".php", ".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".json"]);

async function walk(root, relative = "") {
  const directory = relative ? path.join(root, relative) : root;
  let entries;
  try {
    const stat = await fs.lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`source-tree directory is not a regular directory: ${relative || "."}`);
    }
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      throw new Error(`source-tree symlink is not allowed: ${child}`);
    }
    if (entry.isDirectory()) {
      if (!EXCLUDED_PARTS.has(entry.name)) files.push(...await walk(root, child));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(child.replaceAll(path.sep, "/"));
    }
  }
  return files.sort();
}

function matches(source, pattern) {
	return [...source.matchAll(pattern)].map((match) => match[0]);
}

function wpdevCallableSymbols(source) {
	const executableSource = source
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^\s*\/\/.*$/gm, "");
  const symbols = new Set();
  const directCall = /\b(wpdev_[A-Za-z0-9_]+)\s*\(/g;
  for (const match of executableSource.matchAll(directCall)) {
    const prefix = executableSource.slice(Math.max(0, match.index - 32), match.index);
    if (!/function\s*$/.test(prefix)) symbols.add(match[1]);
  }
  const stringCallable = /(?:function_exists|is_callable|call_user_func(?:_array)?)\s*\(\s*['"](wpdev_[A-Za-z0-9_]+)['"]/g;
  for (const match of executableSource.matchAll(stringCallable)) symbols.add(match[1]);
  return [...symbols].sort();
}

async function inspect(name, root, kind = "plugin") {
  const files = await walk(root);
  const references = {
    wpdevSymbols: new Set(),
    frameworkNamespaces: new Set(),
    hooks: new Set(),
    ajax: new Set(),
    rest: new Set(),
    assets: new Set(),
    storage: new Set(),
    serialization: new Set(),
    dynamicEdges: new Set(),
    directStandaloneWpdev: new Set(),
    php74SyntaxRisks: new Set(),
  };
  const fileDetails = [];
  for (const relative of files) {
    const absolute = path.join(root, relative);
    let source;
    try {
      source = await fs.readFile(absolute, "utf8");
    } catch (error) {
      throw new Error(`cannot read source file ${relative}: ${error.message}`);
    }
    const detail = { path: relative, bytes: Buffer.byteLength(source), references: {} };
    const collect = (key, pattern) => {
      const found = matches(source, pattern);
      if (found.length) { detail.references[key] = found; found.forEach((item) => references[key].add(item)); }
    };
    const callableSymbols = wpdevCallableSymbols(source);
    if (callableSymbols.length) {
      detail.references.wpdevSymbols = callableSymbols;
      callableSymbols.forEach((item) => references.wpdevSymbols.add(item));
    }
    collect("frameworkNamespaces", /(?:WPDevFramework\\|WPDev\\|WpdevVendor\\)[A-Za-z0-9_\\]+/g);
    collect("hooks", /(?:add_action|add_filter|do_action|apply_filters)\s*\(\s*['"][^'"]+['"]/g);
    collect("ajax", /wp_ajax(?:_nopriv)?_[A-Za-z0-9_-]+/g);
    collect("rest", /register_rest_route\s*\(\s*['"][^'"]+['"]/g);
    collect("assets", /(?:wp_enqueue|wp_register)_(?:script|style)\s*\(/g);
    collect("storage", /(?:get|update|add|delete)_option\s*\(|(?:get|set|delete)_(?:site_)?transient\s*\(|wp_cache_(?:get|set|delete)\s*\(|dbDelta\s*\(|CREATE\s+TABLE/gi);
    collect("serialization", /(?:unserialize|serialize)\s*\(|__PHP_Incomplete_Class|class_alias\s*\(/g);
    collect(
      "dynamicEdges",
      /(?:['"]wpdev_[^'"]*['"]\s*\.|\.\s*['"]wpdev_|[\"]wpdev_[^\"]*\$(?:\{|[A-Za-z_]))/g,
    );
    collect("directStandaloneWpdev", /(?:plugins[\\/]wpdev|wpdev\.php|Requires Plugins:\s*wpdev)/gi);
    if (relative.endsWith(".php")) {
      collect("php74SyntaxRisks", /^\s*#\[/gm);
      collect("php74SyntaxRisks", /\?->|\b(?:static\s+)?fn\s*\(/g);
    }
    fileDetails.push(detail);
  }
  const config = {};
  for (const file of ["wpdev.json", "composer.json", "package.json"]) {
    try { config[file] = JSON.parse(await fs.readFile(path.join(root, file), "utf8")); } catch { /* optional */ }
  }
  return {
    name,
    kind,
    root: path.relative(CONTENT_ROOT, root).replaceAll(path.sep, "/"),
    fileCount: files.length,
    references: Object.fromEntries(Object.entries(references).map(([key, value]) => [key, [...value].sort()])),
    config,
    files: fileDetails,
  };
}

const pluginsRoot = path.join(CONTENT_ROOT, "plugins");
const themesRoot = path.join(CONTENT_ROOT, "themes");
const plugins = [];
for (const name of CONSUMERS) {
  const root = path.join(pluginsRoot, name);
  try {
    await fs.access(root);
  } catch {
    plugins.push({ name, kind: "plugin", missing: true });
    continue;
  }
  plugins.push(await inspect(name, root));
}
const framework = await inspect("wpdev", path.join(pluginsRoot, "wpdev"), "assembler-input");
const theme = await inspect("tavangary", path.join(themesRoot, "tavangary"), "compatibility-oracle");
const report = {
  schema: 1,
  generatedBy: "tools/protection-inventory.mjs",
  scope: {
    consumers: CONSUMERS,
    standaloneWpdev: "assembler-input-only",
    theme: "themes/tavangary",
    excluded: "vendor, vendor-prefixed, node_modules, dist, coverage",
  },
  plugins,
  framework,
  theme,
};
await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Inventory written: ${OUTPUT}\n`);
