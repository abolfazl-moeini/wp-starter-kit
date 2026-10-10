#!/usr/bin/env node
/**
 * tools/scan-admin-panels.mjs
 *
 * Static code inspector for WordPress and WPDev admin panels, settings, menus, and modules.
 * Discovers documentation candidate sections without executing WordPress runtime code.
 *
 * Usage:
 *   node tools/scan-admin-panels.mjs                     # Outputs JSON to stdout
 *   node tools/scan-admin-panels.mjs --table             # Outputs human-readable Markdown table
 *   node tools/scan-admin-panels.mjs --output=panels.json
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import * as path from "node:path";

export function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    root: process.cwd(),
    format: "json", // "json" | "table"
    output: null,
    includeFramework: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg === "--table" || arg === "-t") {
      opts.format = "table";
    } else if (arg === "--json" || arg === "-j") {
      opts.format = "json";
    } else if (arg === "--include-framework") {
      opts.includeFramework = true;
    } else if (arg.startsWith("--root=")) {
      opts.root = path.resolve(arg.split("=")[1].trim());
    } else if (arg.startsWith("--output=")) {
      opts.output = path.resolve(arg.split("=")[1].trim());
    }
  }

  return opts;
}

const DEFAULT_IGNORED_DIRS = [
  "vendor",
  "node_modules",
  ".git",
  ".venv",
  "dist",
  "build",
  "coverage",
  "tests",
  "docker-phpunit",
  "packages/standalone-build",
  "packages/polaris-stack",
  "packages/php-test-tools",
  "packages/wpdev-framework",
  "packages/wpdev-bridge",
  "packages/framework",
];

export function findPhpFiles(dir, includeFramework = false) {
  const files = [];
  const ignored = new Set(
    includeFramework
      ? DEFAULT_IGNORED_DIRS.filter((d) => !d.includes("framework") && !d.includes("bridge"))
      : DEFAULT_IGNORED_DIRS,
  );

  function walk(current) {
    let entries = [];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith(".") && entry !== ".harness") continue;
      const full = path.join(current, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        const rel = path.relative(dir, full).replace(/\\/g, "/");
        if (ignored.has(entry) || Array.from(ignored).some((ign) => rel.startsWith(ign))) {
          continue;
        }
        walk(full);
      } else if (st.isFile() && entry.endsWith(".php")) {
        files.push(full);
      }
    }
  }

  walk(dir);
  return files;
}

export function splitPhpArguments(argsStr) {
  const args = [];
  let current = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      current += char;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      current += char;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (char === "(" || char === "[" || char === "{") {
        depth++;
      } else if (char === ")" || char === "]" || char === "}") {
        depth--;
      } else if (char === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
    }

    current += char;
  }
  if (current.trim()) {
    args.push(current.trim());
  }
  return args;
}

export function cleanStringParam(raw) {
  if (!raw) return "";
  let clean = raw.trim();
  // Strip gettext: __('title', 'domain') or _x('title', 'context', 'domain')
  const gettextMatch = clean.match(/__(?:\s*\(\s*['"]([^'"]+)['"]|_x\s*\(\s*['"]([^'"]+)['"])/);
  if (gettextMatch) {
    clean = gettextMatch[1] || gettextMatch[2];
  }
  // Strip quotes
  clean = clean.replace(/^['"]|['"]$/g, "").trim();
  return clean;
}

export function scanPhpFiles(root, files) {
  const sections = [];
  const seenIds = new Set();

  for (const file of files) {
    let content = "";
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const relFile = path.relative(root, file).replace(/\\/g, "/");

    // 1. Scan WPDev Settings Sections: wpdev_register_settings_section('slug', [...])
    const settingsRegex = /wpdev_register_settings_section\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:array\(|\[)([\s\S]*?)(?:\)|\])\s*(?:,|\))/g;
    let match;
    while ((match = settingsRegex.exec(content)) !== null) {
      const slug = match[1];
      const attsBlock = match[2];
      const titleMatch = attsBlock.match(/['"](?:title|name)['"]\s*=>\s*([^,\n]+)/);
      const title = titleMatch ? cleanStringParam(titleMatch[1]) : slug;
      const id = `settings_${slug}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        sections.push({
          id,
          raw_slug: slug,
          title: title || slug,
          type: "settings_section",
          framework: "wpdev",
          file: relFile,
          suggested_doc: `settings-${slug}.md`,
        });
      }
    }

    // 2. Scan WPDev Admin Pages: class ... extends List_Admin_Page | Edit_Admin_Page | Top_Level_Admin_Page
    const classPageRegex = /class\s+(\w+)\s+extends\s+(?:\\?[A-Za-z0-9_\\]*\\)?(List_Admin_Page|Edit_Admin_Page|Top_Level_Admin_Page|Base_Admin_Page|Base_Customer_Facing_Admin_Page)/g;
    while ((match = classPageRegex.exec(content)) !== null) {
      const className = match[1];
      const baseType = match[2];

      // Try to find page_title or title property / method
      let title = className
        .replace(/_?(Admin_Page|Page|Admin)$/i, "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .trim();
      const titlePropMatch = content.match(/(?:protected|public|private)\s+\$(?:page_title|menu_title|title)\s*=\s*([^;\n]+);/);
      if (titlePropMatch) {
        const raw = titlePropMatch[1].trim();
        if (/^['"]|__\s*\(|_x\s*\(/.test(raw)) {
          const extracted = cleanStringParam(raw);
          if (extracted && !extracted.includes("$") && extracted.length < 80) {
            title = extracted;
          }
        }
      }

      if (!title) {
        title = className;
      }

      const id = `admin_page_${className.toLowerCase()}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        sections.push({
          id,
          raw_slug: className,
          title: title.trim(),
          type: baseType.includes("List") ? "list_table" : baseType.includes("Edit") ? "edit_form" : "top_level_page",
          framework: "wpdev",
          file: relFile,
          suggested_doc: `${className.toLowerCase().replace(/_/g, "-")}.md`,
        });
      }
    }

    // 3. Scan WordPress Core Menu Pages: add_menu_page and add_submenu_page
    const menuCallRegex = /add_menu_page\s*\(([\s\S]*?)\);/g;
    while ((match = menuCallRegex.exec(content)) !== null) {
      const callArgs = splitPhpArguments(match[1]);
      if (callArgs.length < 4) continue;
      const pageTitle = cleanStringParam(callArgs[0]);
      const menuTitle = cleanStringParam(callArgs[1]);
      const slug = cleanStringParam(callArgs[3]);
      if (!slug || slug.includes("$") || slug.includes("{") || slug.includes(")") || slug.length > 60) continue;
      const title = pageTitle || menuTitle || slug;
      const id = `menu_${slug}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        sections.push({
          id,
          raw_slug: slug,
          title,
          type: "core_menu_page",
          framework: "wordpress",
          file: relFile,
          suggested_doc: `menu-${slug.replace(/_/g, "-")}.md`,
        });
      }
    }

    const subMenuCallRegex = /add_submenu_page\s*\(([\s\S]*?)\);/g;
    while ((match = subMenuCallRegex.exec(content)) !== null) {
      const callArgs = splitPhpArguments(match[1]);
      if (callArgs.length < 5) continue;
      const parentSlug = cleanStringParam(callArgs[0]);
      const pageTitle = cleanStringParam(callArgs[1]);
      const menuTitle = cleanStringParam(callArgs[2]);
      const slug = cleanStringParam(callArgs[4]);
      if (!slug || slug.includes("$") || slug.includes("{") || slug.includes(")") || slug.length > 60) continue;
      const title = pageTitle || menuTitle || slug;
      const id = `submenu_${slug}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        sections.push({
          id,
          raw_slug: slug,
          parent_slug: parentSlug,
          title,
          type: "core_submenu_page",
          framework: "wordpress",
          file: relFile,
          suggested_doc: `submenu-${slug.replace(/_/g, "-")}.md`,
        });
      }
    }

    // 4. Scan WPDev Forms / Modal actions: wpdev_register_form('form_id', [...])
    const formRegex = /wpdev_register_form\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:array\(|\[)([\s\S]*?)(?:\)|\])\s*(?:,|\))/g;
    while ((match = formRegex.exec(content)) !== null) {
      const formSlug = match[1];
      const attsBlock = match[2];
      const titleMatch = attsBlock.match(/['"](?:title|name)['"]\s*=>\s*([^,\n]+)/);
      const title = titleMatch ? cleanStringParam(titleMatch[1]) : formSlug;
      const id = `form_${formSlug}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        sections.push({
          id,
          raw_slug: formSlug,
          title: title || formSlug,
          type: "modal_form",
          framework: "wpdev",
          file: relFile,
          suggested_doc: `modal-${formSlug.replace(/_/g, "-")}.md`,
        });
      }
    }
  }

  // 5. Scan Modules in src/Modules/
  const modulesDir = path.join(root, "src", "Modules");
  if (existsSync(modulesDir) && statSync(modulesDir).isDirectory()) {
    try {
      const modEntries = readdirSync(modulesDir);
      for (const m of modEntries) {
        const fullMod = path.join(modulesDir, m);
        if (statSync(fullMod).isDirectory() && !m.startsWith(".")) {
          const id = `module_${m.toLowerCase()}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            sections.push({
              id,
              raw_slug: m,
              title: `ماژول ${m}`,
              type: "feature_module",
              framework: "wpdev",
              file: `src/Modules/${m}/Module.php`,
              suggested_doc: `module-${m.toLowerCase().replace(/_/g, "-")}.md`,
            });
          }
        }
      }
    } catch {
      // Ignore module read errors
    }
  }

  // 6. Scan Features in .harness/features.json if present
  const harnessFeaturesFile = path.join(root, ".harness", "features.json");
  if (existsSync(harnessFeaturesFile)) {
    try {
      const rawFeat = JSON.parse(readFileSync(harnessFeaturesFile, "utf8"));
      const feats = rawFeat.features || {};
      for (const [fId, fData] of Object.entries(feats)) {
        const id = `catalog_${fId}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          sections.push({
            id,
            raw_slug: fId,
            title: fData.title_fa || fData.title || fId,
            type: "catalog_feature",
            framework: "harness",
            file: (fData.files && fData.files[0]) || ".harness/features.json",
            suggested_doc: `feature-${fId.replace(/_/g, "-")}.md`,
          });
        }
      }
    } catch {
      // Ignore catalog parse errors
    }
  }

  return sections;
}

export function formatAsMarkdownTable(sections) {
  if (sections.length === 0) {
    return "هیچ پنل یا بخش مدیریتی قابل مستندسازی در پروژه کشف نشد.\n";
  }

  let out = `## لیست بخش‌ها و پنل‌های کشف‌شده جهت مستندسازی (${sections.length} بخش)\n\n`;
  out += `| ردیف | شناسه بخش | عنوان پیشنهادی | نوع صفحه | فریم‌ورک | فایل مرجع |\n`;
  out += `| :---: | :--- | :--- | :---: | :---: | :--- |\n`;

  sections.forEach((sec, idx) => {
    out += `| ${idx + 1} | \`${sec.raw_slug}\` | **${sec.title}** | \`${sec.type}\` | ${sec.framework} | \`${sec.file}\` |\n`;
  });

  out += `\n> جهت تایید یا تغییر عناوین و اولویت‌بندی، لیست بالا را بازبینی فرمایید.\n`;
  return out;
}

export function main() {
  const opts = parseArgs();

  if (opts.help) {
    console.log(`
Usage: node tools/scan-admin-panels.mjs [options]

Scans WordPress/WPDev source code and discovers documentation candidate sections.

Options:
  --root=DIR             Root directory of the plugin (default: current directory)
  --table, -t            Output as a Markdown table (default: JSON)
  --json, -j             Output as formatted JSON
  --output=FILE          Save output to specified file
  --include-framework    Include framework package directories in scan
  -h, --help             Show this help message
`);
    process.exit(0);
  }

  const root = opts.root;
  if (!existsSync(root)) {
    console.error(`Error: Root directory does not exist: ${root}`);
    process.exit(1);
  }

  const phpFiles = findPhpFiles(root, opts.includeFramework);
  const sections = scanPhpFiles(root, phpFiles);

  let outputStr = "";
  if (opts.format === "table") {
    outputStr = formatAsMarkdownTable(sections);
  } else {
    outputStr = JSON.stringify(
      {
        total_sections: sections.length,
        plugin_root: root,
        sections,
      },
      null,
      2,
    );
  }

  if (opts.output) {
    writeFileSync(opts.output, outputStr, "utf8");
    console.log(`Saved ${sections.length} discovered sections to ${opts.output}`);
  } else {
    console.log(outputStr);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main();
}
