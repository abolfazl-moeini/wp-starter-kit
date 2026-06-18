# Jumper Command Registry

Comprehensive documentation for the modular Jumper command system in `admin-widget-builder`.

---

## 1) What this solves

Jumper used to be limited to:

- static admin links from WordPress menus (`$menu` / `$submenu`)
- dynamic entity search via `wpdev_search`
- URL navigation on selection

The command registry adds a first-class modular API so modules/plugins can:

- register commands explicitly with stable IDs
- group commands by namespace (`plugin · section`)
- auto-register module commands from existing admin page registrations
- run URL commands (`type=link`) and executable commands (`type=action`)

---

## 2) Main components

### PHP

- Registry classes:
  - `src/class-jumper-namespace-registry.php`
  - `src/class-jumper-command-registry.php`
- Public facade:
  - `src/functions/jumper-command.php`
- Auto providers:
  - `src/class-jumper-command-providers.php`
- Jumper runtime/transport:
  - `src/ui/class-jumper.php`

### JS

- UI wiring and execution:
  - `assets/js/jumper.js`
  - `assets/js/jumper.min.js`
- Rendering template:
  - `views/ui/selectize-templates.php` (`wpdev-template-jumper-command`)

### Boot wiring

- `setup.php`:
  - requires registry/provider/facade files
  - boots providers
  - emits `do_action( 'wpdev_register_jumper_commands' )`

---

## 3) Lifecycle and flow

1. Module boot (`wpdev_load`) initializes Jumper and command providers.
2. Providers and third-party hooks register namespaces/commands.
3. `Jumper_Command_Registry::grouped()` builds capability-filtered grouped payload.
4. `class-jumper.php` localizes payload to `wpdev_jumper_vars.commands`.
5. `jumper.js` adds option groups/options into Selectize.
6. On select:
   - `link` -> navigate/open URL
   - `action` -> run JS action if registered, otherwise call AJAX `wpdev_jumper_run_command`

---

## 4) Public API

## Namespace API

### `wpdev_register_jumper_namespace( string $id, array $config = [], bool $replace = true ): bool`

Registers a namespace used for grouping/attribution.

Config keys:

- `plugin` (string) default: `WPDev`
- `label` (string) default: humanized namespace id
- `icon` (string) optional
- `priority` (int) default: `100`

### `wpdev_get_jumper_namespace( string $id ): ?array`

Returns normalized namespace config or `null`.

### `wpdev_list_jumper_namespaces(): array`

Returns all namespaces keyed by sanitized ID.

## Command API

### `wpdev_register_jumper_command( string $id, array $config = [], bool $replace = true ): bool`

Registers a command.

Config keys:

- `namespace` (string) default: `general`
- `title` (string) default: humanized command id
- `type` (string) `link|action` default: `link`
- `url` (string) used by `link`
- `js_action` (string) client action id for `action`
- `callback` (callable|null) server callback for `action`
- `icon` (string) optional
- `keywords` (string[]) search helpers
- `capability` (string) optional gate
- `priority` (int) default: `100`

### `wpdev_get_jumper_command( string $id ): ?array`

Returns normalized command config or `null`.

### `wpdev_has_jumper_command( string $id ): bool`

Checks registration existence.

### `wpdev_list_jumper_commands(): array`

Returns all commands keyed by sanitized ID.

### `wpdev_unregister_jumper_command( string $id ): void`

Removes a registered command.

---

## 5) Grouping and namespacing model

Grouping is generated as:

- internal group key: `jumper-ns-{namespace_id}`
- display label: `{plugin} · {label}`

Example:

- namespace id: `wpdev-products`
- namespace config: `plugin=WPDev`, `label=Products`
- rendered group label: `WPDev · Products`

This ensures ambiguous actions like `Create New` are clearly attributed.

---

## 6) Auto-discovery behavior

`Jumper_Command_Providers` listens to:

- `wpdev_module_admin_pages_registered( $module_id, $page_classes )`

For each registered page class, it synthesizes:

- list/view-like pages -> `Go to {Resource}` (`type=link`)
- edit-like pages -> `Create New {Resource}` (`type=link`)

It auto-creates namespace from module id if missing.

Notes:

- Resource naming is inferred from page id/class naming conventions.
- Capability defaults to `manage_network` for synthesized commands.
- You can still override or add explicit commands on top.

---

## 7) Registering commands manually

Use this hook:

```php
add_action(
	'wpdev_register_jumper_commands',
	static function () {
		wpdev_register_jumper_namespace(
			'my-module',
			array(
				'plugin'   => 'My Plugin',
				'label'    => 'Billing',
				'priority' => 30,
			)
		);

		wpdev_register_jumper_command(
			'my-module/open-billing',
			array(
				'namespace' => 'my-module',
				'title'     => __( 'Open Billing Settings', 'wpdev' ),
				'type'      => 'link',
				'url'       => network_admin_url( 'admin.php?page=my-billing' ),
				'keywords'  => array( 'billing', 'settings', 'payments' ),
				'priority'  => 10,
			)
		);
	}
);
```

---

## 8) Action command execution

For `type=action`, execution order:

1. If `js_action` exists and registered in JS, run client callback.
2. Otherwise call AJAX action `wpdev_jumper_run_command`.
3. Server callback return payload can contain:
   - `redirect` (string URL)
   - `modal` (array payload emitted via JS event)
   - `notice` (string; shown as alert fallback)

### Client action registration

```js
window.wpdev.jumper.registerAction('refreshStats', function(option) {
  // custom behavior
  window.location.reload();
});
```

### Server callback example

```php
wpdev_register_jumper_command(
	'my-module/rebuild-cache',
	array(
		'namespace' => 'my-module',
		'title'     => __( 'Rebuild Cache', 'my-textdomain' ),
		'type'      => 'action',
		'callback'  => static function () {
			// run operation...
			return array(
				'notice' => __( 'Cache rebuild queued.', 'my-textdomain' ),
			);
		},
	)
);
```

---

## 9) Security model

- Command listing is capability-filtered server-side before localization.
- Action endpoint `wpdev_jumper_run_command` enforces:
  - command exists
  - command `type` is `action`
  - callback is callable
  - user passes capability check (`Jumper_Command_Registry::is_allowed()`)

---

## 10) Extensibility points

- Register commands:
  - `do_action( 'wpdev_register_jumper_commands' )`
- Override synthesized namespace plugin label:
  - `apply_filters( 'wpdev_jumper_namespace_plugin', $plugin_label, $module_id, $page_classes )`
- Override synthesized namespace priority:
  - `apply_filters( 'wpdev_jumper_namespace_priority', $priority, $module_id, $page_classes )`
- Existing Jumper extension points still work:
  - `wpdev_jumper_options`
  - `wpdev_selectize_templates`
  - `wpdev_link_list`

---

## 11) Manual verification

- Network-admin UI: Jumper group rendering, command search, and `link` / `action` execution.
- Capability gates: commands hidden for users without required caps.

---

## 12) Migration notes

If your module previously only used menu links:

1. Keep existing behavior (backward-compatible).
2. Optionally add explicit commands for high-value actions.
3. Add namespace for clearer attribution in multi-plugin/framework usage.

Use registry facades instead of direct class mutation to keep contracts stable.
