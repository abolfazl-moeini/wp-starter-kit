# @wpdev/standalone-build

Standalone plugin assemble/deploy pipeline for wp-starter-kit consumers.

- Default build is **clean** (no AST mangling, no spaghetti inlining beyond the normal release packager).
- Profile S obfuscation is **opt-in**: `--obfuscate` or `--profile=s`.
- `--obfuscate` fails closed if `plan3/transformer.php` cannot be resolved.

## Commands

From a WordPress `wp-content` directory (or with `WPDEV_CONTENT_ROOT` set):

```bash
# Clean standalone assemble (no obfuscation)
node packages/standalone-build/build-all-standalone-plugins.mjs --build-only

# Profile S obfuscation + deploy
node packages/standalone-build/build-all-standalone-plugins.mjs --obfuscate --deploy --jobs=4
```

Per-plugin (from a `*-dev` plugin root):

```bash
npm run release              # clean dist/{slug}
npm run release:obfuscate    # same + Profile S transformer
```
