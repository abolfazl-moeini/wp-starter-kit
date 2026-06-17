// __WPDEV_LOCALIZE_VAR__ is injected by esbuild (buildDepsConfig / build for
// components) from project.config.json → localizeVar. Fallback keeps the
// kit itself working even if a particular bundle config omits the define.
const LOCALIZE_VAR =
  typeof __WPDEV_LOCALIZE_VAR__ !== "undefined"
    ? __WPDEV_LOCALIZE_VAR__
    : "WPSKLoc";

function getLocalizeRoot() {
  return globalThis[LOCALIZE_VAR];
}

export const localize = {
  get(index) {
    if (!index) {
      return;
    }

    const root = getLocalizeRoot();
    if (!root) {
      return;
    }

    if (index.indexOf(".") === -1) {
      return root[index];
    }

    let parts = index.split(".");
    let current = root[parts[0]];

    if (!current) {
      return;
    }

    parts = parts.slice(1);

    const len = parts.length - 1;

    for (let i = 0; i <= len; i++) {
      if (typeof current[parts[i]] !== "object" && i !== len) {
        return;
      }

      current = current[parts[i]];
    }

    return current;
  },

  translate(index) {
    return this.get("translate." + index);
  },
};
