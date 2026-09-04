/**
 * Fail-closed gate for standalone plugin coexistence on shared WPDev\Core FQCNs.
 *
 * PHP first-wins means one ModuleLoader instance serves every sibling plugin.
 * A class-typed register() (ModuleInterface or a per-artifact mangled _c_* name)
 * TypeErrors when a foreign module is passed — the production DRM vs theme-panel
 * fatal. Unique namespaces for the whole WPDev\Core tree are not required and
 * are blocked until a prefix-migration contract exists. The coexistence
 * contract is: ModuleLoader::register() accepts object and duck-types get_slug.
 */

import fs from "node:fs";
import path from "node:path";

const REGISTER_HINT =
  /function\s+register\s*\(\s*(?:\\?[A-Za-z_][A-Za-z0-9_\\]*)\s+\$[A-Za-z_][A-Za-z0-9_]*\s*\)/;
const REGISTER_REPLACE =
  /function\s+register\s*\(\s*(?:\\?[A-Za-z_][A-Za-z0-9_\\]*)\s+(\$[A-Za-z_][A-Za-z0-9_]*)\s*\)/g;

export function inspectModuleLoaderRegister(source) {
  const match = source.match(
    /function\s+register\s*\(\s*(?:\\?([A-Za-z_][A-Za-z0-9_\\]*))\s+\$[A-Za-z_][A-Za-z0-9_]*\s*\)/,
  );
  if (!match) {
    return { duckTyped: false, typeHint: null };
  }
  const typeHint = match[1];
  return { duckTyped: typeHint === "object", typeHint };
}

export function listModuleLoaderFiles(root) {
  const found = [];
  if (!root || !fs.existsSync(root)) {
    return found;
  }
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile() && entry.name === "ModuleLoader.php") {
        found.push(full);
      }
    }
  }
  return found;
}

export function rewriteModuleLoaderRegisterToDuckTyped(root) {
  const files = listModuleLoaderFiles(root);
  let rewritten = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (!REGISTER_HINT.test(source)) {
      continue;
    }
    const next = source.replace(
      REGISTER_REPLACE,
      "function register( object $1 )",
    );
    if (next !== source) {
      fs.writeFileSync(file, next);
      rewritten += 1;
    }
  }
  return { rewritten, scanned: files.length };
}

export function assertDuckTypedModuleLoaders(root) {
  const files = listModuleLoaderFiles(root);
  const failures = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const inspect = inspectModuleLoaderRegister(source);
    if (!inspect.duckTyped) {
      failures.push(
        `${path.relative(root, file)}: register(${inspect.typeHint || "missing"} $module)`,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      "ModuleLoader::register() must accept object so sibling standalone plugins can coexist on the first-wins WPDev\\Core\\Plugin loader. Class type hints (ModuleInterface or mangled _c_*) TypeError across artifacts:\n" +
        failures.map((line) => `  - ${line}`).join("\n"),
    );
  }
  return { scanned: files.length };
}
