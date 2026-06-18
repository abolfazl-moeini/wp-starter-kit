# WPDev Framework Adapter

The \`phpFramework: wpdev\` feature integrates the project with the WPDev Admin Framework using the companion-plugin model. Instead of embedding the framework directly, it runs alongside the framework as a separate plugin on the WordPress site.

## Companion Plugin Model

When \`phpFramework: wpdev\` is enabled:

1. The framework files are copied verbatim into the project's \`companion-plugins/wpdev/\` folder.
2. The user installs and activates this companion plugin in WordPress.
3. If the companion plugin is not active, the main plugin displays a non-fatal warning notice in the WP admin panel and gracefully no-ops framework integrations, preventing fatal errors.

## Prefix Rules & Collision Validation

To avoid namespace and function conflicts:

- The WPDev framework reserves the \`wpdev\` hook prefix and the \`wpdev\_\` PHP function prefix.
- The CLI installer validates that your project's custom \`hookPrefix\` is not \`wpdev\` and your \`phpFunctionPrefix\` is not \`wpdev\_\`.
- Colliding prefixes will cause validation failure and prompt for a correct prefix (in interactive mode) or fail-fast (in non-interactive mode).

## Bridging Module Lifecycles via \`WpdevModuleAdapter\`

The adapter class \`WPDev\\Adapters\\WpdevModuleAdapter\` wraps your kit's \`ModuleInterface\` modules:

\`\`\`php
WPDev\\Adapters\\WpdevModuleAdapter::attach(new MyPlugin\\Modules\\WpdevDemo\\Module());
\`\`\`

### Attachment Seam & Hook Ordering

1. **With Framework Active**: If the framework helper function \`wpdev_on_load\` is present, \`attach()\` defers the module's \`boot()\` lifecycle, registering it to run on the framework's \`wpdev_load\` hook.
2. **Fallback (Without Framework)**: If the framework is not active, the module's \`boot()\` method is called sequentially during the standard kit bootstrap.

## Seam Map

| WPDev Seam                     | Kit Equivalent                  |
| ------------------------------ | ------------------------------- |
| \`modules/\*/setup.php\` entry | \`ModuleInterface::boot()\`     |
| Module slug                    | \`ModuleInterface::get_slug()\` |
| \`Module_Loader::load_all()\`  | \`WPDev\\Core\\ModuleLoader\`   |
