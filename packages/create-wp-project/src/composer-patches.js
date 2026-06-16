/**
 * Merge generator-level composer patches into a composer.json object.
 *
 * @param {object} composer  parsed composer.json
 * @param {{ require?: Record<string,string>, repositories?: object[], suggest?: Record<string,string> }} patch
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
  return next;
}
