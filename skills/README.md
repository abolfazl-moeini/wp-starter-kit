# Project agent skills

Skills for AI agents working on **wp-starter-kit** and on **plugins generated from this boilerplate**.

| Skill                 | Path                                                       | Use when                                                                                  |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **wpdev-php-modules** | [wpdev-php-modules/SKILL.md](./wpdev-php-modules/SKILL.md) | Modular PHP features, `src/Modules`, RestSetup/CLI/shortcodes, framework Support packages |
| **wpdev-js-modules**  | [wpdev-js-modules/SKILL.md](./wpdev-js-modules/SKILL.md)   | Module JS entries, Polaris, `@wpdev/*` packages, esbuild bundles, no relative path hell   |

## Invoke

- Slash (if registered in your agent host): `/wpdev-php-modules`, `/wpdev-js-modules`
- Or open the `SKILL.md` and follow it as the system playbook for that domain

## Scope

These skills describe the **post-scaffold** consumer layout:

- PHP: `{slug}.php` + `packages/framework` + `src/Modules/*`
- JS: `src/Modules/*/assets/entries/*` + `assets/bundles/*` + package-name imports

They complement kit docs (`docs/module-guide.md`, `packages/polaris-stack/context.md`) and are written as **agent instructions** (rules + checklists), not marketing docs.
