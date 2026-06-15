/**
 * 0.2.0 migration — no-op baseline.
 *
 * Phase 24.2 — the very first migration the registry ships. It
 * does nothing on disk (a consumer project at 0.1.0 has no
 * shape this migration needs to fix); its only purpose is to
 * give the registry a non-empty baseline and to validate the
 * runMigrations contract end-to-end.
 *
 * Per plan.v3.md §24 weak-agent guardrail, this migration:
 *  - MUST be idempotent (safe to re-run).
 *  - MUST NOT edit any user code under src/Modules/*.
 *  - MUST NOT touch files outside the project's config layer.
 *
 * Returning `{ok:true}` is the contract `runMigrations` looks
 * for when deciding "this migration succeeded; bump the
 * manifest". A thrown error or a `{ok:false, reason}` halts
 * the migration chain at this version (no manifest bump).
 */
export const version = "0.2.0";
export const description = "no-op baseline (registry smoke test)";

export async function run(_dir) {
  return { ok: true };
}
