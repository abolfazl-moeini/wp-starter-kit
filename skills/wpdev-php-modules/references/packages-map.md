# PHP packages map (generated plugin)

Relative to project root after scaffold.

| Path                                            | Namespace / entry              | Role                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/framework/src/Core/`                  | `WPDev\Core\`                  | `Plugin`, `ModuleLoader`, `ModuleInterface`, `AbstractModule`                                                                                                      |
| `packages/framework/src/Support/Rest/`          | `WPDev\Support\Rest\`          | `RestSetup`, `RestHandler`, batch — [support-packages.md](support-packages.md)                                                                                     |
| `packages/framework/src/Support/Shortcodes/`    | `WPDev\Support\Shortcodes\`    | `ShortcodesSetup`, `Shortcode` — [support-packages.md](support-packages.md)                                                                                        |
| `packages/framework/src/Support/WpCli/`         | `WPDev\Support\WpCli\`         | `CliSetup`, `Command` — [support-packages.md](support-packages.md)                                                                                                 |
| `packages/framework/src/Support/AccessManager/` | `WPDev\Support\AccessManager\` | UserAccess, BluePrint, QualifierBase — **agent usage:** [support-packages.md](support-packages.md)                                                                 |
| `packages/framework/src/Support/Auth/`          | `WPDev\Support\Auth\`          | CapabilityPolicy — [support-packages.md](support-packages.md)                                                                                                      |
| `packages/framework/src/Support/Queue/`         | `WPDev\Support\Queue\`         | DeferredCall — [support-packages.md](support-packages.md)                                                                                                          |
| `packages/framework/src/Support/Templates/`     | `WPDev\Support\Templates\`     | Template helpers — [support-packages.md](support-packages.md)                                                                                                      |
| `packages/framework/src/Support/Assets.php`     | `WPDev\Support\Assets`         | Bundle register/enqueue — [support-packages.md](support-packages.md)                                                                                               |
| `packages/framework/src/Adapters/`              | `WPDev\Adapters\`              | WpdevModuleAdapter (phpFramework:wpdev)                                                                                                                            |
| `packages/php-fault-tolerance/`                 | via bootstrap                  | Real/Stub dual load; Composer path repo with `symlink: false` (never host-absolute kit paths — breaks Docker)                                                      |
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

## Support usage (agents)

Do/don’t and AccessManager patterns for every Support package:
**[support-packages.md](support-packages.md)**. Human API signatures:
`docs/php-core-libs.md`.
