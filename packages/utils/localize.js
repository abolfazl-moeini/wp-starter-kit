// __WPDEV_LOCALIZE_VAR__ is injected by esbuild (buildDepsConfig / build for
// components) from project.config.json → localizeVar. Fallback keeps the
// kit itself working even if a particular bundle config omits the define.
const LOCALIZE_VAR =
  typeof __WPDEV_LOCALIZE_VAR__ !== "undefined"
    ? __WPDEV_LOCALIZE_VAR__
    : "WPDevLoc";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function getLocalizeRoot() {
  return globalThis[LOCALIZE_VAR];
}

export const localize = {
  get(index) {
    if (!index || typeof index !== "string") {
      return;
    }

    const root = getLocalizeRoot();
    if (!root || typeof root !== "object") {
      return;
    }

    if (index.indexOf(".") === -1) {
      if (FORBIDDEN_KEYS.has(index)) {
        return;
      }
      return Object.prototype.hasOwnProperty.call(root, index)
        ? root[index]
        : undefined;
    }

    const parts = index.split(".");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (FORBIDDEN_KEYS.has(part)) {
        return;
      }
      if (
        !current ||
        typeof current !== "object" ||
        !Object.prototype.hasOwnProperty.call(current, part)
      ) {
        return;
      }

      current = current[part];
      if (
        i < parts.length - 1 &&
        (current === null || typeof current !== "object")
      ) {
        return;
      }
    }

    return current;
  },

  translate(index) {
    return this.get("translate." + index);
  },
};
