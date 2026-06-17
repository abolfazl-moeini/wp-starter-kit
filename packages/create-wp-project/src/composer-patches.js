/**
 * Merge one generator patch into an accumulator while scaffolding.
 *
 * @param {object|null} accumulator
 * @param {object} patch
 * @returns {object}
 */
export function mergeComposerPatchAccumulator(accumulator, patch) {
  const next = accumulator || {
    require: {},
    repositories: [],
    suggest: {},
    autoload: {},
    extra: {},
  };
  if (patch.require) {
    Object.assign(next.require, patch.require);
  }
  if (patch.suggest) {
    Object.assign(next.suggest, patch.suggest);
  }
  if (patch.repositories?.length) {
    next.repositories.push(...patch.repositories);
  }
  if (patch.autoload) {
    if (patch.autoload["psr-4"]) {
      next.autoload["psr-4"] = {
        ...(next.autoload["psr-4"] || {}),
        ...patch.autoload["psr-4"],
      };
    }
    if (patch.autoload.files?.length) {
      next.autoload.files = [
        ...(next.autoload.files || []),
        ...patch.autoload.files,
      ];
    }
  }
  if (patch.extra) {
    next.extra = { ...(next.extra || {}), ...patch.extra };
    if (patch.extra["installer-paths"]) {
      next.extra["installer-paths"] = {
        ...(next.extra["installer-paths"] || {}),
        ...patch.extra["installer-paths"],
      };
    }
  }
  return next;
}

/**
 * Merge generator-level composer patches into a composer.json object.
 *
 * @param {object} composer  parsed composer.json
 * @param {{ require?: Record<string,string>, repositories?: object[], suggest?: Record<string,string>, autoload?: object }} patch
 * @returns {object}
 */
export function applyComposerPatches(composer, patch) {
  if (!patch) return composer;
  const next = { ...composer };
  if (patch.require) {
    next.require = { ...(next.require || {}), ...patch.require };
  }
  if (patch.suggest) {
    next.suggest = { ...(next.suggest || {}), ...patch.suggest };
  }
  if (patch.repositories?.length) {
    const existing = Array.isArray(next.repositories) ? next.repositories : [];
    const urls = new Set(existing.map((r) => r && r.url).filter(Boolean));
    const merged = [...existing];
    for (const repo of patch.repositories) {
      if (repo && repo.url && !urls.has(repo.url)) {
        merged.push(repo);
        urls.add(repo.url);
      }
    }
    next.repositories = merged;
  }
  if (patch.autoload) {
    next.autoload = { ...(next.autoload || {}) };
    if (patch.autoload["psr-4"]) {
      next.autoload["psr-4"] = {
        ...(next.autoload["psr-4"] || {}),
        ...patch.autoload["psr-4"],
      };
    }
    if (patch.autoload.files?.length) {
      const existing = Array.isArray(next.autoload.files)
        ? next.autoload.files
        : [];
      const seen = new Set(existing);
      const merged = [...existing];
      for (const file of patch.autoload.files) {
        if (file && !seen.has(file)) {
          merged.push(file);
          seen.add(file);
        }
      }
      next.autoload.files = merged;
    }
  }
  if (patch.extra) {
    next.extra = { ...(next.extra || {}) };
    if (patch.extra["installer-paths"]) {
      next.extra["installer-paths"] = {
        ...(next.extra["installer-paths"] || {}),
        ...patch.extra["installer-paths"],
      };
    }
  }
  return next;
}
