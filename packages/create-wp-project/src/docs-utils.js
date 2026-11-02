import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

/**
 * Validate that local image and media assets referenced in Markdown exist on disk.
 *
 * @param {string} root - Plugin root directory
 * @param {string} guideDirAbs - Absolute path to docs directory
 * @param {string[]} mdFiles - Relative markdown file names
 * @returns {Array<{file: string, rawReference: string, resolvedPath: string}>} Missing asset records
 */
export function validateAssets(root, guideDirAbs, mdFiles) {
  const missing = [];
  const mdImgRe = /!\[.*?\]\((.*?)\)/g;
  const htmlImgRe = /<img\s+[^>]*src=["'](.*?)["']/gi;

  for (const relFile of mdFiles) {
    const fullPath = path.join(guideDirAbs, relFile);
    if (!existsSync(fullPath)) continue;
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

      const resolved = pathname.startsWith("/")
        ? path.join(root, pathname)
        : path.resolve(guideDirAbs, pathname);

      if (!existsSync(resolved)) {
        missing.push({
          file: relFile,
          rawReference: rawUrl,
          resolvedPath: resolved,
        });
      }
    }
  }

  return missing;
}
