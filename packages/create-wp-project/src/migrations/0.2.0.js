/**
 * 0.2.0 migration — vendored → deps framework + distMode flip.
 *
 * Phase 23/24: removes any legacy src/Core/* framework copies that
 * were emitted by pre-deps scaffolds. These copies are no longer
 * needed (or loaded) once "wpsk/framework" is a Composer dependency.
 * The migration also ensures the manifest records distMode:"deps".
 *
 * Idempotent: safe to run multiple times; missing files are ignored.
 * Never touches src/Modules/* (user code) or any non-glue paths.
 *
 * Also updates project.config.json mirror if present.
 */
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "../json-utils.js";

export const version = "0.2.0";
export const description =
  "Remove legacy vendored src/Core framework copies (pre-Phase 23) and ensure distMode=deps";

const LEGACY_CORE_FILES = [
  "src/Core/Plugin.php",
  "src/Core/ModuleInterface.php",
  "src/Core/ModuleLoader.php",
];

export async function run(dir) {
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "run(dir) requires a directory" };
  }

  // 1. Delete any legacy framework copies under src/Core.
  //    These were the "vendored" copies of what is now wpsk/framework.
  for (const rel of LEGACY_CORE_FILES) {
    const abs = path.join(dir, rel);
    try {
      if (existsSync(abs)) {
        await fs.unlink(abs);
      }
    } catch {
      // ignore individual unlink errors; best-effort cleanup
    }
  }

  // Best-effort: remove empty src/Core dir (and src if it becomes empty).
  try {
    const coreDir = path.join(dir, "src", "Core");
    if (existsSync(coreDir)) {
      const remaining = await fs.readdir(coreDir);
      if (remaining.length === 0) {
        await fs.rmdir(coreDir);
        // try to clean src/ if now empty (defensive, user modules would prevent this)
        const srcDir = path.join(dir, "src");
        if (existsSync(srcDir)) {
          const srcKids = await fs.readdir(srcDir);
          if (srcKids.length === 0) {
            await fs.rmdir(srcDir);
          }
        }
      }
    }
  } catch {
    // ignore rmdir failures
  }

  // 2. Patch manifest (if present) to flip distMode to "deps".
  //    The runner will still bump kitVersion after us, but we ensure
  //    the shape is correct for the current version.
  const manifestPath = path.join(dir, "wpsk-kit.json");
  if (existsSync(manifestPath)) {
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      const m = JSON.parse(raw);
      if (m && typeof m === "object") {
        m.distMode = "deps";
        await fs.writeFile(
          manifestPath,
          JSON.stringify(m, null, 2) + "\n",
          "utf8",
        );
      }
    } catch {
      // non-fatal; runner will still bump version
    }
  }

  // 3. Mirror distMode flip into project.config.json if it carries
  //    a top-level distMode (rare; features are the common mirror).
  const cfgPath = path.join(dir, "project.config.json");
  if (existsSync(cfgPath)) {
    try {
      await updateJsonFile(cfgPath, (cfg) => {
        if (cfg && typeof cfg === "object" && "distMode" in cfg) {
          cfg.distMode = "deps";
        }
        return cfg;
      });
    } catch {
      // mirror only; non-fatal
    }
  }

  return { ok: true };
}
