/**
 * 0.4.0 migration — commitlint + hardened husky hooks.
 *
 * For projects with husky:on, adds:
 *   - commitlint.config.cjs
 *   - .husky/commit-msg
 *   - hardened .husky/pre-commit (lint-staged + related Jest + PHPUnit filter)
 *   - @commitlint/* devDependencies in package.json (when present)
 *
 * Idempotent: skips when husky is off; does not overwrite existing commitlint config.
 */

import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";

import { readManifest } from "../manifest.js";
import { updateJsonFile } from "../json-utils.js";
import {
  TEMPLATE_COMMITLINT_CONFIG,
  TEMPLATE_HUSKY_COMMIT_MSG,
  TEMPLATE_HUSKY_PRE_COMMIT,
} from "../generators/_templates.js";

export const version = "0.4.0";
export const description =
  "Add commitlint configuration and hardened husky hooks (pre-commit + commit-msg)";

const COMMITLINT_DEPS = {
  "@commitlint/cli": "^19.8.1",
  "@commitlint/config-conventional": "^19.8.1",
};

export async function run(dir) {
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "run(dir) requires a directory" };
  }

  const manifest = readManifest(dir);
  const features = (manifest && manifest.features) || {};
  if (features.husky === "off") {
    return { ok: true };
  }

  const commitlintPath = path.join(dir, "commitlint.config.cjs");
  if (!existsSync(commitlintPath)) {
    try {
      await fs.writeFile(commitlintPath, TEMPLATE_COMMITLINT_CONFIG, "utf8");
    } catch (error) {
      return {
        ok: false,
        reason: `Failed to write commitlint.config.cjs: ${error.message}`,
      };
    }
  }

  const huskyDir = path.join(dir, ".husky");
  try {
    await fs.mkdir(huskyDir, { recursive: true });
  } catch (error) {
    return { ok: false, reason: `Failed to create .husky/: ${error.message}` };
  }

  const commitMsgPath = path.join(huskyDir, "commit-msg");
  if (!existsSync(commitMsgPath)) {
    try {
      await fs.writeFile(commitMsgPath, TEMPLATE_HUSKY_COMMIT_MSG, {
        encoding: "utf8",
        mode: 0o755,
      });
    } catch (error) {
      return {
        ok: false,
        reason: `Failed to write .husky/commit-msg: ${error.message}`,
      };
    }
  }

  const preCommitPath = path.join(huskyDir, "pre-commit");
  let upgradePreCommit = !existsSync(preCommitPath);
  if (!upgradePreCommit) {
    try {
      const existing = await fs.readFile(preCommitPath, "utf8");
      upgradePreCommit =
        existing.includes("husky.sh") || !existing.includes("passWithNoTests");
    } catch {
      upgradePreCommit = true;
    }
  }
  if (upgradePreCommit) {
    try {
      await fs.writeFile(preCommitPath, TEMPLATE_HUSKY_PRE_COMMIT, {
        encoding: "utf8",
        mode: 0o755,
      });
    } catch (error) {
      return {
        ok: false,
        reason: `Failed to write .husky/pre-commit: ${error.message}`,
      };
    }
  }

  const pkgPath = path.join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      await updateJsonFile(pkgPath, (pkg) => {
        if (!pkg || typeof pkg !== "object") return pkg;
        pkg.devDependencies = pkg.devDependencies || {};
        for (const [name, ver] of Object.entries(COMMITLINT_DEPS)) {
          if (!pkg.devDependencies[name]) {
            pkg.devDependencies[name] = ver;
          }
        }
        if (pkg.scripts && pkg.scripts.prepare === "husky install") {
          pkg.scripts.prepare = "husky";
        }
        return pkg;
      });
    } catch (error) {
      return {
        ok: true,
        warning: `husky hooks written, but package.json patch failed: ${error.message}`,
      };
    }
  }

  return { ok: true };
}
