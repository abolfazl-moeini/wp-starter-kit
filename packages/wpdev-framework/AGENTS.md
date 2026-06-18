# AGENTS — AI coding agent instructions for wpdev

Purpose: Give AI coding agents the minimal, actionable context needed to work productively in this repository.

Quick facts
- **No automated build/test tooling:** As noted in [CLAUDE.md](CLAUDE.md) this repo does not include `composer.json`, `phpunit.xml.dist`, or CI. Do not assume `composer` scripts or PHPUnit exist here.
- **Manual validation required:** Use a local WordPress multisite with the three sibling plugins active (framework, examples, playground) and perform smoke tests (visit `admin.php?page=wpdev`, exercise example pages).

Key files and areas to inspect
- **Entrypoints:** `wpdev.php`, `wpdev-examples.php`, `wpdev-playground.php`
- **Modules:** `modules/` — primary implementation lives here; treat each module as an independent unit.
- **Docs:** `docs/` and `docs/CONTEXT.md` — architecture notes, release prep, and module conventions.
- **Examples & playground:** `wpdev-examples/`, `wpdev-playground/` — useful for manual testing and examples.

Agent guidance (concise)
- Prefer linking to existing docs rather than copying content from them.
- When tests or CI are mentioned in `docs/`, treat them as historical unless a `composer.json` or `phpunit.xml` exists in-repo.
- For code changes, run manual smoke tests locally and point reviewers to the exact admin URL to verify.
- Preserve module boundaries: prefer changes inside a module unless a cross-cutting change is necessary; document cross-module impacts.

Suggested follow-ups
- Create focused instruction files for `modules/` and `docs/` if deeper, role-specific guidance is desired.

Where to look first
- Start with [docs/CONTEXT.md](docs/CONTEXT.md) and [CLAUDE.md](CLAUDE.md) to understand repo-specific caveats.
