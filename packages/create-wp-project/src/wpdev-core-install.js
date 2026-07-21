/**
 * Install WPDev Admin Framework (wpdev-core) per skill INSTALL-AND-DISTRIBUTE:
 * prefer git submodule; fall back to clone. Never absolute-path cp -R.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

export const WPDEV_CORE_GIT_URL =
  "https://github.com/abolfazl-moeini/wpdev-core.git";

/**
 * @param {string} projectDir absolute path to the host plugin root
 * @param {{ url?: string, force?: boolean }} [opts]
 * @returns {{ ok: boolean, method?: string, warning?: string, path?: string }}
 */
export function installWpdevCoreSubmodule(projectDir, opts = {}) {
  const url = opts.url || WPDEV_CORE_GIT_URL;
  const targetRel = path.join("companion-plugins", "wpdev");
  const targetAbs = path.join(projectDir, targetRel);

  if (existsSync(path.join(targetAbs, "wpdev.php")) && !opts.force) {
    return { ok: true, method: "exists", path: targetRel };
  }

  mkdirSync(path.join(projectDir, "companion-plugins"), { recursive: true });

  const isGitRepo = existsSync(path.join(projectDir, ".git"));
  if (isGitRepo) {
    // Remove empty placeholder dir so submodule add can create it.
    const r = spawnSync(
      "git",
      ["submodule", "add", "--force", url, targetRel],
      {
        cwd: projectDir,
        encoding: "utf8",
        shell: process.platform === "win32",
      },
    );
    if (r.status === 0) {
      return { ok: true, method: "submodule", path: targetRel };
    }
    // Fall through to clone if submodule add failed (e.g. already registered).
  }

  // Parent is not a git repo, or submodule add failed → clone.
  const clone = spawnSync("git", ["clone", "--depth", "1", url, targetAbs], {
    cwd: projectDir,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (clone.status === 0 && existsSync(path.join(targetAbs, "wpdev.php"))) {
    return {
      ok: true,
      method: isGitRepo ? "clone-fallback" : "clone",
      path: targetRel,
    };
  }

  // Last resort: write install instructions so the folder is not empty.
  mkdirSync(targetAbs, { recursive: true });
  writeFileSync(
    path.join(targetAbs, "INSTALL.md"),
    `# Install WPDev Admin Framework (wpdev-core)

This folder should contain the **wpdev-core** plugin (not a Composer package).

Preferred (from a git repo host project):

\`\`\`bash
cd "${projectDir}"
git submodule add ${url} companion-plugins/wpdev
git submodule update --init --recursive
\`\`\`

If this project is not a git repository:

\`\`\`bash
git clone ${url} companion-plugins/wpdev
\`\`\`

Then activate **WPDev** in WordPress Admin → Plugins, and keep
\`Requires Plugins: wpdev\` on the host plugin header.

See skill: INSTALL-AND-DISTRIBUTE.md / SHARED-PATHS.md
`,
    "utf8",
  );

  return {
    ok: false,
    method: "instructions",
    path: targetRel,
    warning:
      "Could not clone/submodule wpdev-core automatically. See companion-plugins/wpdev/INSTALL.md",
  };
}
