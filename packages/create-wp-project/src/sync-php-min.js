/**
 * Sync phpMinVersion across consumer project artifacts.
 *
 * Used by `wpdev set phpMinVersion` and refreshGlue so composer platform,
 * plugin headers, readme, and docker PHPUnit images stay aligned with
 * features.phpMinVersion / top-level phpMinVersion.
 */

import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";

/**
 * Compare PHP x.y (or x.y.z) versions. Returns negative if a < b.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function comparePhpVersion(a, b) {
  const ap = String(a || "0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const bp = String(b || "0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const av = ap[i] || 0;
    const bv = bp[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Higher of two PHP version strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
export function maxPhpVersion(a, b) {
  return comparePhpVersion(a, b) >= 0 ? a : b;
}

/**
 * WordPress Docker Hub image tag for a given PHP min version.
 *
 * @param {string} phpMin
 * @returns {string}
 */
export function wordpressPhpImage(phpMin) {
  const v = String(phpMin || "8.1").trim();
  // wordpress:phpX.Y-apache images exist for 7.4 and 8.0–8.3.
  return `wordpress:php${v}-apache`;
}

/**
 * Patch composer.json require.php + config.platform.php in place.
 *
 * @param {object} composer
 * @param {string} phpMin
 * @returns {object}
 */
export function applyPhpMinToComposer(composer, phpMin) {
  const next = { ...(composer || {}) };
  next.require = { ...(next.require || {}), php: `>=${phpMin}` };
  next.config = { ...(next.config || {}) };
  next.config.platform = { ...(next.config.platform || {}), php: phpMin };
  return next;
}

/**
 * Replace Requires PHP / PHP_MIN define in plugin bootstrap source.
 *
 * @param {string} source
 * @param {string} phpMin
 * @returns {{ content: string, changed: boolean }}
 */
export function patchPluginPhpMin(source, phpMin) {
  let content = source;
  let changed = false;

  const headerRe = /^(\s*\*\s*Requires PHP:\s*)(\S+)/m;
  if (headerRe.test(content)) {
    const next = content.replace(headerRe, `$1${phpMin}`);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }

  // define( 'FOO_PHP_MIN', '7.4' );
  const defineRe =
    /(define\s*\(\s*['"][^'"]+_PHP_MIN['"]\s*,\s*['"])([^'"]+)(['"]\s*\))/;
  if (defineRe.test(content)) {
    const next = content.replace(defineRe, `$1${phpMin}$3`);
    if (next !== content) {
      content = next;
      changed = true;
    }
  }

  return { content, changed };
}

/**
 * Patch readme.txt Requires PHP line.
 *
 * @param {string} source
 * @param {string} phpMin
 * @returns {{ content: string, changed: boolean }}
 */
export function patchReadmePhpMin(source, phpMin) {
  const re = /^(Requires PHP:\s*)(\S+)/m;
  if (!re.test(source)) return { content: source, changed: false };
  const content = source.replace(re, `$1${phpMin}`);
  return { content, changed: content !== source };
}

/**
 * Patch docker-compose default PHP_IMAGE and env.example PHP_IMAGE=.
 *
 * @param {string} source
 * @param {string} phpMin
 * @returns {{ content: string, changed: boolean }}
 */
export function patchDockerPhpImage(source, phpMin) {
  const image = wordpressPhpImage(phpMin);
  let content = source;
  let changed = false;

  const composeRe = /(\$\{PHP_IMAGE:-)wordpress:php[\d.]+-apache(\})/g;
  if (composeRe.test(content)) {
    content = content.replace(composeRe, `$1${image}$2`);
    changed = true;
  }

  const envRe = /^(PHP_IMAGE=)wordpress:php[\d.]+-apache\s*$/m;
  if (envRe.test(content)) {
    content = content.replace(envRe, `$1${image}`);
    changed = true;
  }

  // Also replace bare defaults without variable expansion.
  const bareRe = /wordpress:php[\d.]+-apache/g;
  if (!changed && bareRe.test(content)) {
    content = content.replace(bareRe, image);
    changed = content !== source;
  }

  return { content, changed };
}

/**
 * Sync on-disk artifacts for a project after phpMinVersion changes.
 *
 * @param {string} dir
 * @param {string} phpMin
 * @param {{ slug?: string }} [opts]
 * @returns {Promise<string[]>} relative paths written
 */
export async function syncPhpMinArtifacts(dir, phpMin, opts = {}) {
  /** @type {string[]} */
  const written = [];
  const min = String(phpMin || "").trim();
  if (!min) return written;

  const composerPath = path.join(dir, "composer.json");
  if (existsSync(composerPath)) {
    try {
      const composer = JSON.parse(await fs.readFile(composerPath, "utf8"));
      const next = applyPhpMinToComposer(composer, min);
      await fs.writeFile(
        composerPath,
        JSON.stringify(next, null, 2) + "\n",
        "utf8",
      );
      written.push("composer.json");
    } catch {
      /* ignore unreadable composer */
    }
  }

  const slug = opts.slug;
  if (slug) {
    const pluginPath = path.join(dir, `${slug}.php`);
    if (existsSync(pluginPath)) {
      const raw = await fs.readFile(pluginPath, "utf8");
      const { content, changed } = patchPluginPhpMin(raw, min);
      if (changed) {
        await fs.writeFile(pluginPath, content, "utf8");
        written.push(`${slug}.php`);
      }
    }
  }

  const readmePath = path.join(dir, "readme.txt");
  if (existsSync(readmePath)) {
    const raw = await fs.readFile(readmePath, "utf8");
    const { content, changed } = patchReadmePhpMin(raw, min);
    if (changed) {
      await fs.writeFile(readmePath, content, "utf8");
      written.push("readme.txt");
    }
  }

  for (const rel of [
    "tests/docker-phpunit/docker-compose.yml",
    "tests/docker-phpunit/env.example",
  ]) {
    const abs = path.join(dir, rel);
    if (!existsSync(abs)) continue;
    const raw = await fs.readFile(abs, "utf8");
    const { content, changed } = patchDockerPhpImage(raw, min);
    if (changed) {
      await fs.writeFile(abs, content, "utf8");
      written.push(rel);
    }
  }

  return written;
}
