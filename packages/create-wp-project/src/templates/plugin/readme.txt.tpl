=== {{name}} ===
Contributors:      {{author}}
Tags:              wp-starter-kit, wpsk, framework
Requires at least: {{wpMinVersion}}
Tested up to:      6.5
Requires PHP:      {{phpMinVersion}}
Stable tag:        0.1.0
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html
Plugin URI:        {{pluginUri}}

{{description}}

== Description ==

{{name}} is a WordPress plugin scaffolded from
[wp-starter-kit](https://github.com/abolfazl-moeini/wp-plugin-starter-kit).

Branding (from project.config.json):

* npm scope: {{npmScope}}
* Global JS name: {{globalName}}
* Localize var: {{localizeVar}}
* Text domain: {{textDomain}}
* Hook prefix: {{hookPrefix}}
* PHP function prefix: {{phpFunctionPrefix}}
* UI framework: {{uiFramework}}
* REST namespace: {{restNamespace}}
* Batch endpoint: {{batchEndpoint}}

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/{{slug}}/`.
2. Activate the plugin through the *Plugins* menu in WordPress.
3. Run `composer install` in the plugin directory.
4. Run `npm install && npm run build` to produce the JS/CSS bundles.

== Changelog ==

= 0.1.0 =
* Initial scaffold from wp-starter-kit.
