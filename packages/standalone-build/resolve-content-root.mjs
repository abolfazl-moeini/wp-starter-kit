import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Resolve the WordPress wp-content root for the standalone build pipeline.
 *
 * The engine used to live at wp-content/tools, so contentRoot was
 * dirname(scriptDir). After the move into the starter kit, callers must
 * run from wp-content or set WPDEV_CONTENT_ROOT.
 */
export function resolveContentRoot({
  scriptDir,
  cwd = process.cwd(),
  env = process.env,
} = {}) {
  const fromEnv = String(env.WPDEV_CONTENT_ROOT || "").trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  if (looksLikeWpContent(cwd)) {
    return path.resolve(cwd);
  }

  if (scriptDir) {
    const legacySibling = path.resolve(scriptDir, "..");
    if (looksLikeWpContent(legacySibling)) {
      return legacySibling;
    }
  }

  throw new Error(
    "Cannot resolve wp-content root. Run from wordpress/wp-content or set WPDEV_CONTENT_ROOT.",
  );
}

function looksLikeWpContent(dir) {
  return (
    existsSync(path.join(dir, "plugins")) && existsSync(path.join(dir, "themes"))
  );
}
