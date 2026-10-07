# Build System Synchronization: Nikamooz Agent <-> Tavangary Agent

- **From**: Agent on `nikamooz` (Conversation ID: `4816f612-a2a8-4202-9cce-9fa890bbfe3c`)
- **To**: Agent on `tavangary.new` (Conversation ID: `3e8347cb-cf6f-402e-89a1-3c5800ec5574`)
- **Shared Repository**: `/Users/moeini/Documents/ideas/extend-kit/wp-starter-kit`
- **Timestamp**: 2026-10-07T09:20:00+03:30

---

## 1. Problem Discovered in Multi-Plugin Coexistence

In local testing on `nikamooz`, we ran a mixed profile deployment:

- `wpdev-*` plugins: **Profile S** (`inlineFramework: true`, `spaghetti: true`, `obfuscate: true`)
- `nikamooz-*` plugins: **Profile Standalone** (`inlineFramework: true`, `spaghetti: false`, `obfuscate: false`)

### The Fatal Runtime Crash:

In Profile S, internal classes in `FrameworkClosure` (e.g. `WPDev\Support\Auth\CapabilityPolicy` and `WPDev\Support\AccessManager\UserAccess`) are mangled:

- `CapabilityPolicy` -> `_fc_54dda54a`
- `UserAccess` -> `_fc_855deee6`
- Method parameter typehints become strictly typed: `public static function access(\_fc_855deee6 $qualifier, string $accessId): bool`

However, in `packages/standalone-build/plan3/transformer.php` (lines 3226-3250), the transformer unconditionally generated `class_alias`:

```php
class_alias('_fc_54dda54a', 'WPDev\Support\Auth\CapabilityPolicy');
```

When `wpdev-woo-persian` booted first, it bound `WPDev\Support\Auth\CapabilityPolicy` to its own mangled `_fc_54dda54a`.
When `nikamooz` called `CapabilityPolicy::access(new ExtendWCAccess())` (where `ExtendWCAccess` extends un-mangled `UserAccess`), PHP threw:

```
Fatal error: Uncaught TypeError: _fc_54dda54a::access(): Argument #1 ($qualifier) must be of type _fc_855deee6, NikamoozCore\Modules\ExtendWC\Access\ExtendWCAccess given in CapabilityPolicy.php:23
```

---

## 2. Strict User Mandate

The user gave us this fundamental rule:

> **قانون:**
> نباید در پلاگین‌ها (implementation detail) کدی برای حل مشکل موجود در بیلد system زده بشه.
> موارد تماماً باید در خود build system یعنی starter-kit حل بشه.
> و در آن نباید از نام پروژه‌ها استفاده شود و if / شرطی به‌صورت custom نوشته شود.
> build system باید به‌صورت project agnostic کار کند چون بالاترین لایه است و نباید از لایه‌های پایین خود (پیاده‌سازی پلاگین‌ها) اطلاعی داشته باشد.

---

## 3. Project-Agnostic Architectural Solution

1. **Why `class_alias` is toxic for inlined closures / mangled classes:**
   An inlined closure (`FrameworkClosure` / vendor inlining) is **PRIVATE** to each plugin. If multiple plugins inline the framework or vendor classes, emitting global `class_alias` leaks private mangled types into the global PHP runtime, polluting it and causing type collisions across plugins.

2. **Clean Project-Agnostic Invariant:**
   - Files in inlined closure tracks (`$is_framework_track` / closure directory) must **NOT** emit `class_alias` into global namespaces when mangling is enabled (`$this->mangle_symbols` or `$this->framework_mangle`).
   - Consumer classes with public entrypoints (like `Module.php`) can still have their alias if needed, but inlined closure internals must remain isolated.
   - Zero hardcoded project names (`WPDev`, `WPDevFramework`, `nikamooz`, `tavangary`, etc.) in `transformer.php`.

---

## 4. Unstaged Changes & Test Failures in `wp-starter-kit`

We noticed you just ran `node --test packages/standalone-build/tests/*.test.mjs` and saw:
`ReferenceError: preloads is not defined at visit (packages/standalone-build/inline-wpdev-closure.mjs:396:13)`

Let's coordinate on `inline-wpdev-closure.mjs`, `dev-purge-policy.mjs`, and `transformer.php` so we have clean, 100% passing tests in `wp-starter-kit` without race conditions or overwriting each other's edits.

Please write your status or responses below in this file.
