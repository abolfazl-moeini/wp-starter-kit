# Support packages — agent playbook

Canonical human API (signatures, deeper examples): kit
[`docs/php-core-libs.md`](../../../docs/php-core-libs.md) and
[`docs/api/php-reference.md`](../../../docs/api/php-reference.md).

This file is the **agent checklist**: when to use each package, do/don’t, and
where feature code lives. Paths are relative to a generated plugin root
(`packages/framework/src/Support/…`).

---

## AccessManager (`Support/AccessManager/`)

**Use for:** named feature-level access rules (menus, ajax, REST, CSV, settings).

| Class                 | Role                                                            |
| --------------------- | --------------------------------------------------------------- |
| `UserAccess`          | Extend; implement `describe(BluePrint)`                         |
| `QualifierBase`       | `have_access($id)` — OR of rule groups; unknown id → deny       |
| `BluePrint\BluePrint` | Fluent `describe` / `describe_upper` / `any` / `all` / `custom` |

**Semantics:** multiple `describe('same-id')` → OR groups; chained conditions in
one group → AND.

**Feature code location:** `src/Modules/{Name}/Access/{Name}Access.php`

```php
final class MyFeatureAccess extends UserAccess
{
    public const EDIT_ITEMS = 'edit_items';
    public const CAP_EDIT   = 'edit_posts'; // string for menu / supported_panels

    protected function describe(BluePrint $bp): void
    {
        $bp->describe(self::EDIT_ITEMS)->any(self::CAP_EDIT);
    }
}

// Runtime
(new MyFeatureAccess())->have_access(MyFeatureAccess::EDIT_ITEMS);
CapabilityPolicy::access(new MyFeatureAccess(), MyFeatureAccess::EDIT_ITEMS);
CapabilityPolicy::rest_access(new MyFeatureAccess(), MyFeatureAccess::EDIT_ITEMS);
```

**Do**

- ALWAYS add `Access/{Name}Access.php` when the module has admin ajax / REST /
  menu / CSV / settings gates.
- Expose rule ids and underlying WP cap strings as **class constants**.
- Unit-test named rules with `$this->login('role')`.

**Don’t**

- Scatter feature-level `current_user_can('manage_*'|'edit_products'|…)` once an
  Access class exists — call `have_access` / `CapabilityPolicy::access`.
- Put object ownership into BluePrint without a call-site id — keep
  `current_user_can('edit_post'|'edit_user', $id)` **inline** on metabox/profile
  saves.
- Invent custom caps/roles unless the product plan explicitly requires them.

Gold example: `src/Modules/ExampleFeature/Access/FeatureAccess.php`.

---

## Auth (`Support/Auth/CapabilityPolicy.php`)

**Use for:** thin bridge between REST/admin and AccessManager or a one-off cap.

| Method                                         | When                                 |
| ---------------------------------------------- | ------------------------------------ |
| `access($qualifier, $id)` / `rest_access(...)` | Preferred — named AccessManager rule |
| `can($cap)` / `rest_permission($cap)`          | One-off single capability only       |

**Don’t** use `read` for mutating endpoints.

---

## Rest (`Support/Rest/`)

**Use for:** all plugin REST routes.

- `RestSetup::register(MyController::class)` from `Module::boot()`.
- Subclass `RestHandler`; implement `rest_end_point`, `methods`,
  `rest_permission`, `rest_handler`.
- Prefer `CapabilityPolicy::rest_access(new XAccess(), XAccess::RULE)` in
  `rest_permission()`.

**Don’t** call `register_rest_route()` in feature code.

---

## Shortcodes (`Support/Shortcodes/`)

**Use for:** kit frontend shortcodes.

- `ShortcodesSetup::register($tag, DemoShortcode::class)`.
- Lazy-enqueue assets from `render_shortcode`, not on every page.

**Don’t** call `add_shortcode()` for kit shortcodes.

---

## WpCli (`Support/WpCli/`)

**Use for:** WP-CLI commands.

- Subclass `Command`; `CliSetup::register(StatusCommand::class)`.

**Don’t** call `WP_CLI::add_command()` directly.

---

## Assets (`Support/Assets.php`)

**Use for:** esbuild bundles under `assets/bundles/`.

- Bootstrap: `Assets::set_plugin_dir($dir, $url)` once in the main plugin file.
- `register_bundle_script` / `enqueue_bundle_script` / `enqueue_bundle_style`.
- Gate enqueue by admin `$hook` or shortcode render.
- Prefix handles with the plugin slug when co-install is possible.

---

## Queue (`Support/Queue/DeferredCall.php`)

**Use for:** queueing a callback before a WP hook has fired.

- `DeferredCall::queue($hook, ['callback' => …, 'params' => …])`.
- Refuses after `did_action($hook)`.

Typical pattern: thin module `Queue/DeferredSetup` helper from `boot()`.

---

## Templates (`Support/Templates/`)

**Use for:** module PHP views under `src/Modules/{Name}/Templates/`.

- `Template::load` / `render` + `set_variable(s)`; function aliases in partials.
- Escape on output (`esc_*`); prefer helpers over raw `include` + `extract()`.

---

## Decision cheat sheet

| Need                  | Package              |
| --------------------- | -------------------- |
| Feature access matrix | AccessManager + Auth |
| REST route            | Rest                 |
| Shortcode             | Shortcodes           |
| WP-CLI                | WpCli                |
| Admin/front bundles   | Assets               |
| Defer until hook      | Queue                |
| PHP views             | Templates            |
