#!/usr/bin/env node
/**
 * In-Repo Docs-as-Code build runner.
 *
 * Compiles user guides from `docs/user-guide/*.md` into client-ready
 * PDF and Docx manuals with natural sorting, automated TOC, and
 * fail-closed asset validation.
 *
 * Primary engine: md-to-docx (Vazirmatn, RTL, callouts, Mermaid, badges)
 * Fallback engine: Pandoc + headless Chrome / LibreOffice
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import * as os from "node:os";

export function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    format: "all",
    root: process.cwd(),
    config: null,
    help: false,
  };
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg.startsWith("--format=")) {
      opts.format = arg.split("=")[1].trim();
    } else if (arg.startsWith("--root=")) {
      opts.root = path.resolve(arg.split("=")[1].trim());
    } else if (arg.startsWith("--config=")) {
      opts.config = path.resolve(arg.split("=")[1].trim());
    }
  }
  return opts;
}

export function loadConfig(root, explicitConfig = null) {
  let configPath = explicitConfig;
  if (!configPath) {
    const candidates = [
      path.join(root, "wpdev.json"),
      path.join(root, "project.config.json"),
    ];
    for (const c of candidates) {
      if (existsSync(c)) {
        configPath = c;
        break;
      }
    }
  }

  let raw = {};
  if (configPath && existsSync(configPath)) {
    try {
      raw = JSON.parse(readFileSync(configPath, "utf8"));
    } catch (err) {
      throw new Error(`Failed to parse configuration at ${configPath}: ${err.message}`);
    }
  }

  const docs = raw.docs || {};
  return {
    slug: raw.slug || "plugin",
    name: raw.name || raw.globalName || raw.slug || "WordPress Plugin",
    title: docs.title || "راهنمای کاربری و تنظیمات سامانه",
    author: docs.author || "تیم توسعه",
    user_guide_dir: docs.user_guide_dir || "docs/user-guide",
    output_dir: docs.output_dir || "dist/docs",
    formats: Array.isArray(docs.formats) && docs.formats.length > 0 ? docs.formats : ["pdf", "docx"],
    template: docs.template || "purple_book",
    direction: docs.direction || "rtl",
  };
}

export function validateAssets(root, guideDirAbs, mdFiles) {
  const missing = [];
  const mdImgRe = /!\[.*?\]\((.*?)\)/g;
  const htmlImgRe = /<img\s+[^>]*src=["'](.*?)["']/gi;

  for (const relFile of mdFiles) {
    const fullPath = path.join(guideDirAbs, relFile);
    const content = readFileSync(fullPath, "utf8");
    const matches = [];

    let m;
    while ((m = mdImgRe.exec(content)) !== null) {
      matches.push(m[1]);
    }
    while ((m = htmlImgRe.exec(content)) !== null) {
      matches.push(m[1]);
    }

    for (const rawUrl of matches) {
      if (!rawUrl) continue;
      // Extract target path before title/quotes/spaces:
      const cleanUrl = rawUrl.trim().split(/\s+/)[0].replace(/^<|>$/g, "");
      const pathname = cleanUrl.split(/[?#]/)[0].trim();

      if (
        !pathname ||
        /^(https?:\/\/|\/\/)/i.test(pathname) ||
        /^data:/i.test(pathname) ||
        /^#/i.test(pathname) ||
        /^mailto:/i.test(pathname)
      ) {
        continue;
      }

      const fileDir = path.dirname(fullPath);
      const targetAbs = path.resolve(fileDir, pathname);
      if (!existsSync(targetAbs)) {
        missing.push({
          sourceFile: path.relative(root, fullPath),
          rawReference: rawUrl,
          resolvedPath: path.relative(root, targetAbs),
        });
      }
    }
  }

  return missing;
}

export function assembleStitchedDocument(guideDirAbs, mdFiles, config) {
  let combined = "";

  // Title & Metadata header
  combined += `# ${config.title}\n\n`;
  combined += `**نویسنده / تیم:** ${config.author}  \n`;
  const today = new (globalThis.Date)();
  combined += `**تاریخ تولید:** ${today.toLocaleDateString("fa-IR")}  \n\n`;
  combined += `---\n\n`;

  // Generate Table of Contents
  const tocEntries = [];
  const headingRe = /^(#{1,3})\s+(.+)$/gm;

  for (const file of mdFiles) {
    const fullPath = path.join(guideDirAbs, file);
    const content = readFileSync(fullPath, "utf8");
    let match;
    while ((match = headingRe.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      const indent = "  ".repeat(level - 1);
      tocEntries.push(`${indent}- ${title}`);
    }
  }

  if (tocEntries.length > 0) {
    combined += `## فهرست مطالب\n\n`;
    combined += tocEntries.join("\n") + "\n\n";
    combined += `<div style="page-break-after: always;"></div>\n\n\\newpage\n\n`;
  }

  // Concatenate each chapter with page breaks
  for (let i = 0; i < mdFiles.length; i++) {
    const file = mdFiles[i];
    const fullPath = path.join(guideDirAbs, file);
    const content = readFileSync(fullPath, "utf8");
    combined += content.trim() + "\n\n";
    if (i < mdFiles.length - 1) {
      combined += `<div style="page-break-after: always;"></div>\n\n\\newpage\n\n`;
    }
  }

  return combined;
}

export function findMd2Docx(root) {
  if (process.env.MD2DOCX_BIN && existsSync(process.env.MD2DOCX_BIN)) {
    return process.env.MD2DOCX_BIN;
  }
  const whichRes = spawnSync(process.platform === "win32" ? "where" : "which", ["md2docx"], {
    encoding: "utf8",
  });
  if (whichRes.status === 0 && whichRes.stdout.trim()) {
    const bin = whichRes.stdout.trim().split("\n")[0];
    if (existsSync(bin)) return bin;
  }
  const venvs = [
    path.join(root, ".venv", "bin", "md2docx"),
    path.join(root, ".venv", "Scripts", "md2docx.exe"),
    path.resolve(root, "../md-to-docx/.venv/bin/md2docx"),
    path.resolve(root, "../../md-to-docx/.venv/bin/md2docx"),
    path.resolve(root, "../../../md-to-docx/.venv/bin/md2docx"),
  ];
  for (const v of venvs) {
    if (existsSync(v)) return v;
  }
  return null;
}

export function findPandoc() {
  const whichRes = spawnSync(process.platform === "win32" ? "where" : "which", ["pandoc"], {
    encoding: "utf8",
  });
  if (whichRes.status === 0 && whichRes.stdout.trim()) {
    return whichRes.stdout.trim().split("\n")[0];
  }
  return null;
}

export function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(macChrome)) return macChrome;

  for (const name of ["google-chrome", "chromium", "chromium-browser"]) {
    const res = spawnSync("which", [name], { encoding: "utf8" });
    if (res.status === 0 && res.stdout.trim()) {
      return res.stdout.trim().split("\n")[0];
    }
  }
  return null;
}

export function findLibreOffice() {
  for (const name of ["soffice", "libreoffice"]) {
    const res = spawnSync("which", [name], { encoding: "utf8" });
    if (res.status === 0 && res.stdout.trim()) {
      return res.stdout.trim().split("\n")[0];
    }
  }
  const macSoffice = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
  if (existsSync(macSoffice)) return macSoffice;
  return null;
}

export async function buildDocs(options = {}) {
  const root = options.root || process.cwd();
  const config = loadConfig(root, options.config);

  const guideDirAbs = path.resolve(root, config.user_guide_dir);
  if (!existsSync(guideDirAbs)) {
    throw new Error(`Documentation directory does not exist: ${guideDirAbs}`);
  }

  const allFiles = readdirSync(guideDirAbs);
  const mdFiles = allFiles
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  if (mdFiles.length === 0) {
    throw new Error(`No markdown files found in ${guideDirAbs}`);
  }

  // Pre-flight Asset Validation (Fail-closed)
  const missingAssets = validateAssets(root, guideDirAbs, mdFiles);
  if (missingAssets.length > 0) {
    process.stderr.write("\n[FATAL] Documentation asset verification failed:\n");
    for (const item of missingAssets) {
      process.stderr.write(
        `  - In '${item.sourceFile}': asset '${item.rawReference}' not found (resolved: '${item.resolvedPath}')\n`,
      );
    }
    process.stderr.write("\nAborting docs build with exit code 1.\n");
    const err = new Error(`Asset verification failed: ${missingAssets.length} missing asset(s)`);
    err.missingAssets = missingAssets;
    throw err;
  }

  const outDirAbs = path.resolve(root, config.output_dir);
  mkdirSync(outDirAbs, { recursive: true });

  const stitchedContent = assembleStitchedDocument(guideDirAbs, mdFiles, config);
  const tempStitched = path.join(outDirAbs, ".stitched-manual.md");
  writeFileSync(tempStitched, stitchedContent, "utf8");

  const buildDocx =
    options.format === "docx" ||
    options.format === "all" ||
    (options.format !== "pdf" && config.formats.includes("docx"));
  const buildPdf =
    options.format === "pdf" ||
    options.format === "all" ||
    (options.format !== "docx" && config.formats.includes("pdf"));

  const targetDocx = path.join(outDirAbs, `${config.slug}-user-manual.docx`);
  const targetPdf = path.join(outDirAbs, `${config.slug}-user-manual.pdf`);

  const md2docxBin = findMd2Docx(root);
  const pandocBin = findPandoc();
  const chromeBin = findChrome();
  const libreOfficeBin = findLibreOffice();

  if (!md2docxBin && !pandocBin) {
    rmSync(tempStitched, { force: true });
    throw new Error(
      `Neither md2docx nor pandoc was found in PATH.\n` +
      `Please install md-to-docx (recommended for Persian/RTL: https://github.com/abolfazl-moeini/md-to-docx) or pandoc.`
    );
  }

  const generated = [];

  try {
    // 1. Generate DOCX
    if (buildDocx) {
      if (md2docxBin) {
        process.stdout.write(`Compiling DOCX via md2docx (${config.template})...\n`);
        const res = spawnSync(
          md2docxBin,
          [
            "convert",
            tempStitched,
            "-o",
            targetDocx,
            "--template",
            config.template,
            "--direction",
            config.direction,
            "-f",
          ],
          { stdio: "inherit" },
        );
        if (res.status !== 0) throw new Error("md2docx DOCX conversion failed");
      } else {
        process.stdout.write("Compiling DOCX via Pandoc fallback...\n");
        const res = spawnSync(
          pandocBin,
          [tempStitched, "-o", targetDocx, "-f", "markdown", "-t", "docx"],
          { stdio: "inherit" },
        );
        if (res.status !== 0) throw new Error("Pandoc DOCX conversion failed");
      }

      if (!existsSync(targetDocx) || statSync(targetDocx).size === 0) {
        throw new Error(`Generated DOCX is missing or empty at ${targetDocx}`);
      }
      generated.push({ format: "docx", path: targetDocx, size: statSync(targetDocx).size });
    }

    // 2. Generate PDF
    if (buildPdf) {
      if (md2docxBin) {
        process.stdout.write(`Compiling PDF via md2docx (${config.template})...\n`);
        const res = spawnSync(
          md2docxBin,
          [
            "convert",
            tempStitched,
            "-o",
            targetPdf,
            "--template",
            config.template,
            "--direction",
            config.direction,
            "-f",
          ],
          { stdio: "inherit" },
        );
        if (res.status !== 0) throw new Error("md2docx PDF conversion failed");
      } else if (pandocBin && chromeBin) {
        process.stdout.write("Compiling PDF via Pandoc + Headless Chrome fallback...\n");
        const tempHtml = path.join(outDirAbs, ".temp-preview.html");
        const pRes = spawnSync(
          pandocBin,
          [tempStitched, "-o", tempHtml, "--standalone"],
          { stdio: "inherit" },
        );
        if (pRes.status !== 0) throw new Error("Pandoc HTML conversion failed");
        const cRes = spawnSync(
          chromeBin,
          [
            "--headless",
            "--disable-gpu",
            `--print-to-pdf=${targetPdf}`,
            tempHtml,
          ],
          { stdio: "ignore" },
        );
        rmSync(tempHtml, { force: true });
        if (cRes.status !== 0) throw new Error("Chrome headless PDF generation failed");
      } else if (libreOfficeBin && existsSync(targetDocx)) {
        process.stdout.write("Compiling PDF via LibreOffice headless fallback...\n");
        const lRes = spawnSync(
          libreOfficeBin,
          ["--headless", "--convert-to", "pdf", targetDocx, "--outdir", outDirAbs],
          { stdio: "inherit" },
        );
        if (lRes.status !== 0) throw new Error("LibreOffice PDF conversion failed");
      } else {
        throw new Error(
          "PDF conversion requires md2docx, or Pandoc + Headless Chrome, or LibreOffice."
        );
      }

      if (!existsSync(targetPdf) || statSync(targetPdf).size === 0) {
        throw new Error(`Generated PDF is missing or empty at ${targetPdf}`);
      }
      generated.push({ format: "pdf", path: targetPdf, size: statSync(targetPdf).size });
    }
  } finally {
    if (existsSync(tempStitched)) {
      rmSync(tempStitched, { force: true });
    }
  }

  return {
    outputDir: outDirAbs,
    generated,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`Usage: node tools/build-docs.mjs [options]

Compile In-Repo Docs-as-Code into PDF and Docx client manuals.

Options:
  --format=FORMAT    Export format: 'pdf', 'docx', or 'all' (default: all)
  --root=DIR         Project root directory (default: cwd)
  --config=PATH      Explicit path to wpdev.json / project.config.json
  -h, --help         Show this help message
`);
    process.exit(0);
  }

  try {
    const result = await buildDocs(args);
    process.stdout.write("\n✔ Documentation compiled successfully:\n");
    for (const item of result.generated) {
      process.stdout.write(`  - [${item.format.toUpperCase()}] ${item.path} (${item.size} bytes)\n`);
    }
  } catch (err) {
    process.stderr.write(`\n[ERROR] ${err.message}\n`);
    process.exit(1);
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirect =
  entry.endsWith(`${path.sep}build-docs.mjs`) ||
  entry.endsWith("/build-docs.mjs") ||
  entry.endsWith("build-docs.mjs");

if (isDirect) {
  main();
}
