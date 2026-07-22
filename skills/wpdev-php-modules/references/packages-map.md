# PHP packages map (generated plugin)

Relative to project root after scaffold.

| Path                                            | Namespace / entry              | Role                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/framework/src/Core/`                  | `WPDev\Core\`                  | `Plugin`, `ModuleLoader`, `ModuleInterface`, `AbstractModule`                                                                                                      |
| `packages/framework/src/Support/Rest/`          | `WPDev\Support\Rest\`          | `RestSetup`, `RestHandler`, batch helpers                                                                                                                          |
| `packages/framework/src/Support/Shortcodes/`    | `WPDev\Support\Shortcodes\`    | `ShortcodesSetup`, `Shortcode`                                                                                                                                     |
| `packages/framework/src/Support/WpCli/`         | `WPDev\Support\WpCli\`         | `CliSetup`, `Command`                                                                                                                                              |
| `packages/framework/src/Support/AccessManager/` | `WPDev\Support\AccessManager\` | UserAccess, BluePrint, QualifierBase                                                                                                                               |
| `packages/framework/src/Support/Auth/`          | `WPDev\Support\Auth\`          | CapabilityPolicy                                                                                                                                                   |
| `packages/framework/src/Support/Queue/`         | `WPDev\Support\Queue\`         | DeferredCall                                                                                                                                                       |
| `packages/framework/src/Support/Templates/`     | `WPDev\Support\Templates\`     | Template helpers                                                                                                                                                   |
| `packages/framework/src/Support/Assets.php`     | `WPDev\Support\Assets`         | Bundle register/enqueue                                                                                                                                            |
| `packages/framework/src/Adapters/`              | `WPDev\Adapters\`              | WpdevModuleAdapter (phpFramework:wpdev)                                                                                                                            |
| `packages/php-fault-tolerance/`                 | via bootstrap                  | Real/Stub dual load                                                                                                                                                |
| `packages/mcp-integration/`                     | `WPDev\MCP\` (when feature on) | Abilities API                                                                                                                                                      |
| `packages/plugin-core-test/`                    | test package                   | PHPUnit base cases                                                                                                                                                 |
| `src/Modules/*/`                                | `{Vendor}\Modules\*`           | Feature modules (your code)                                                                                                                                        |
| `src/*-register.php`                            | files autoload                 | Register modules with loader (`plugins_loaded` @5). Preferred for generated features (PolarisDemo, mcp, phpFramework). Kit may instead register from `{slug}.php`. |

## Composer autoload sketch

```json
{
  "autoload": {
    "psr-4": {
      "MyVendor\\": "src/",
      "WPDev\\": "packages/framework/src/"
    },
    "files": ["src/my-feature-register.php"]
  }
}
```

After changing `files`: `composer dump-autoload -o`.
