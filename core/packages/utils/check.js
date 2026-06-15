import { readProjectConfig, getRootPath } from "@core/utils";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function checkProject(deps = {}) {
  const readConfig = deps.readProjectConfig ?? readProjectConfig;
  const rootPathFn = deps.getRootPath ?? getRootPath;
  const issues = [];

  try {
    const config = readConfig();
    if (!config.npmScope && !config.slug) {
      issues.push("project.config.json must have npmScope or slug");
    }
  } catch (e) {
    issues.push(e.message);
  }

  if (!process.env.ROOT_NAME) {
    try {
      const pkgPath = join(rootPathFn(), "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (!pkg.name || !pkg.name.startsWith("@")) {
          issues.push(
            "ROOT_NAME env not set and package.json name is not scoped (@org/pkg)",
          );
        }
      }
    } catch {
      issues.push("Could not read root package.json");
    }
  }

  return issues;
}
