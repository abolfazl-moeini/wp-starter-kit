import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Locate plan3/transformer.php for opt-in Profile S obfuscation.
 *
 * Search order:
 *   1. WPDEV_PROFILE_S_TRANSFORMER
 *   2. WPDEV_STARTER_KIT/packages/standalone-build/plan3/transformer.php
 *   3. plan3/transformer.php next to the calling release script
 *   4. Walk up looking for packages/standalone-build/plan3/transformer.php
 *   5. Legacy wp-content/tools/plan3/transformer.php relative to the plugin
 */
export function resolveProfileSTransformer({
  fromDir,
  pluginRoot,
  env = process.env,
} = {}) {
  const explicit = String(env.WPDEV_PROFILE_S_TRANSFORMER || "").trim();
  if (explicit) {
    if (!existsSync(explicit)) {
      throw new Error(
        `WPDEV_PROFILE_S_TRANSFORMER does not exist: ${explicit}`,
      );
    }
    return path.resolve(explicit);
  }

  const starterKit = String(env.WPDEV_STARTER_KIT || "").trim();
  const candidates = [];

  if (starterKit) {
    candidates.push(
      path.join(starterKit, "packages/standalone-build/plan3/transformer.php"),
    );
  }

  if (fromDir) {
    candidates.push(path.join(fromDir, "plan3/transformer.php"));
    let dir = path.resolve(fromDir);
    for (let i = 0; i < 10; i += 1) {
      candidates.push(
        path.join(dir, "packages/standalone-build/plan3/transformer.php"),
      );
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  if (pluginRoot) {
    candidates.push(
      path.resolve(pluginRoot, "../tools/plan3/transformer.php"),
      path.resolve(pluginRoot, "../../tools/plan3/transformer.php"),
      path.resolve(pluginRoot, "../../../tools/plan3/transformer.php"),
    );
  }

  const found = candidates.find((candidate) => existsSync(candidate));
  return found ? path.resolve(found) : null;
}

export function requireProfileSTransformer(options) {
  const resolved = resolveProfileSTransformer(options);
  if (!resolved) {
    throw new Error(
      "Profile S transformer not found. Install @wpdev/standalone-build (starter-kit packages/standalone-build) or set WPDEV_PROFILE_S_TRANSFORMER / WPDEV_STARTER_KIT.",
    );
  }
  return resolved;
}
