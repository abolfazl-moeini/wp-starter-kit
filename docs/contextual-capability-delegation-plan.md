# Architectural Specification: Minimalist Contextual Capability Mocking in AccessManager

- **Target Package:** `WPDev\Support\AccessManager`
- **Framework Root:** `/Users/moeini/Documents/ideas/extend-kit/wp-starter-kit`
- **Target Files:**
  - `packages/framework/src/Support/AccessManager/BluePrint/BluePrint.php`
  - `packages/framework/src/Support/AccessManager/UserAccess.php`
- **Target Tests:** `tests/phpunit/Support/AccessManager/UserAccessTest.php`
- **Design Philosophy:** Minimalist, Zero-Overengineering, Cohesive (All permissions declared in one place on `BluePrint` and handled in `UserAccess`).

---

## 1. Executive Summary & Problem Background

### 1.1 The Real-World Friction

In the WordPress ecosystem, several third-party security firewalls (notably **Wordfence WAF**) and legacy commercial plugins (e.g., **NirWeb Support**) evaluate user authorizations using a fixed list of standard WordPress roles:

- Wordfence WAF (e.g. `Rule 507` blocking Stored XSS) inspects requests at PHP bootstrap and executes:
  ```php
  // plugins/wordfence/lib/wordfenceClass.php:9100
  private static function getCurrentUserRole() {
      if (current_user_can('administrator') || is_super_admin()) return 'administrator';
      foreach (array('editor', 'author', 'contributor', 'subscriber') as $role) {
          if (current_user_can($role)) return $role;
      }
      return 'other';
  }
  ```
- Any custom business role (e.g., `content_manager`, `shop_manager`, `instructor`) is categorized as **`'other'`**.
- When these users save custom fields or embeds, Wordfence treats them as untrusted and issues an **HTTP 403 Forbidden** block.

### 1.2 The Anti-Pattern to Avoid

A common but flawed workaround is to permanently grant the standard WordPress `editor` or `administrator` capability to the custom role in `wp_roles` or dynamically across all requests.  
**Why this is dangerous:**

- Grants extensive, unwanted permissions across WordPress core (e.g., editing other authors' posts, deleting drafts, publishing unreviewed content, managing taxonomies).
- Violates the **Principle of Least Privilege (PoLP)** and expands the application's attack surface.
- Spoofing `role=editor` in Wordfence exempts the user from **32 distinct WAF rules** (including generic upload and code execution rules). Global escalation creates unacceptable blast radius.

### 1.3 Historical Precedent: `NirwebSupportFix`

A production-verified precedent in this platform's history (`to-delete/nikamooz-plugin-legacy/src/NirwebSupportFix/Setup.php`, commits `6fa19b0` and `5f44a05`) solved an identical problem with an encrypted ticketing plugin that demanded `administrator` access. The fix inspected the call stack (`debug_backtrace`) inside `user_has_cap` to spoof the capability **strictly and exclusively when Nirweb queried it**, leaving the user unprivileged everywhere else.

### 1.4 The Minimalist Goal

Integrate this capability directly into **`WPDev\Support\AccessManager\BluePrint`** and **`UserAccess`**.

- **Zero new classes.**
- **Zero new directories.**
- **Zero extra registries.**  
  Developers declare both standard inbound permissions and outbound contextual mock rules in the **same familiar `describe()` method**.

---

## 2. Developer Experience (DX) in Host Plugins

Developers simply declare the mock rule in their existing `UserAccess` subclass (such as `ThemeFieldsAccess`):

```php
namespace NikamoozThemePanel\Modules\ThemeFields\Access;

use WPDev\Support\AccessManager\BluePrint\BluePrint;
use WPDev\Support\AccessManager\UserAccess;

final class ThemeFieldsAccess extends UserAccess
{
    public const MANAGE_SETTINGS = 'manage_theme_settings';
    public const CAP_MANAGE_SETTINGS = 'nikamooz_manage_theme_settings';

    public static function register(): void
    {
        // 1. Boot contextual mock caps early (before Wordfence init:10)
        self::boot();

        // 2. Ensure domain capabilities exist
        if (function_exists('add_action')) {
            add_action('init', [self::class, 'register_caps'], 5);
        }
        self::register_caps();
    }

    protected function describe(BluePrint $bp): void
    {
        // 1. Inbound access rule:
        $bp->describe(self::MANAGE_SETTINGS)
           ->any(self::CAP_MANAGE_SETTINGS, 'manage_options');

        // 2. Outbound contextual mock rule (One clean line):
        $bp->mock_cap('editor', 'content_manager', 'wordfence');
    }
}
```

### Result:

- When Wordfence calls `current_user_can('editor')` to assemble its WAF auth cookie, `UserAccess` verifies the caller frame matches `'wordfence'` and returns `editor = true`. Wordfence signs its cookie as `editor` and skips 403 blocks.
- When WordPress core, WooCommerce, or admin menus check `current_user_can('editor')`, the caller is NOT Wordfence. The user receives `false`.
- No global `editor` capability is ever added to the database or role registry.

---

## 3. Adversarial Review Corrections & Architectural Invariants

### 3.1 Lifecycle Timing Invariant (Early Boot)

- **Problem:** Wordfence calls `getCurrentUserRole()` inside `wordfence::initAction()` hooked to `init` at **priority 10**. Lazy evaluation inside `have_access()` (which runs at `admin_menu` or render time) attaches the filter too late on every request.
- **Remediation:**
  1. `UserAccess::boot()` executes at file load or module registration (`plugins_loaded` / `init:5`).
  2. `UserAccess::boot()` inspects `describe()`, caches mock rules statically in `UserAccess::$static_mock_caps`, and hooks `user_has_cap` at `priority 10`.
  3. As a safety net, `structure()` inside `have_access()` also ensures mock caps are registered if `boot()` was not called.

### 3.2 Idempotency Invariant (Zero Duplicate Filters)

- **Problem:** `have_access()` is called on fresh instances (e.g. `(new ThemeFieldsAccess())->have_access(...)`). Attaching per-instance hooks installs 40+ identical filter callbacks per request.
- **Remediation:**
  - `protected static bool $filter_attached = false;` ensures `add_filter('user_has_cap', ...)` is executed exactly once per request.
  - `protected static array $booted_classes = [];` ensures a subclass is described only once.
  - The filter callback is a static method: `[UserAccess::class, 'filter_contextual_mock_caps']`, eliminating `$this` memory leaks.

### 3.3 Multi-Rule Keying Invariant

- **Problem:** Keying `$mock_caps[$target_cap]` by `$target_cap` alone causes rules from different vendors/plugins to overwrite each other.
- **Remediation:**
  - Rules are stored as a list under each capability: `$static_mock_caps[$target_cap][] = ['role' => ..., 'caller' => ..., 'depth' => ...]`.

### 3.4 Bounded Inspection & Audit Logging Invariant

- Stack depth is strictly clamped: `$depth = min(50, max(1, $max_depth))` (default: 10 frames).
- Caller matching verifies `$class` or `$file` (substring or basename).
- Guard prevents self-spoofing (`$target_cap === $for_role`).
- Fires `do_action('wpdev_contextual_mock_cap_applied', $target_cap, $for_role, $caller, $user_id)` for observability.
- `UserAccess::reset_mock_caps()` cleans up state for 100% test isolation.

---

## 4. 3-Tier Filter Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Host Plugin                           │
│  ThemeFieldsAccess::boot() / describe(BluePrint $bp)        │
│    └── $bp->mock_cap('editor', 'content_manager', 'wf');    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            WPDev\Support\AccessManager\BluePrint            │
│  Stores: $mock_caps['editor'][] = [                         │
│    'role'   => 'content_manager',                           │
│    'caller' => 'wordfence',                                 │
│    'depth'  => 10                                           │
│  ]                                                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            WPDev\Support\AccessManager\UserAccess           │
│  Static Storage: UserAccess::$static_mock_caps              │
│  Static Hook: add_filter('user_has_cap', [UserAccess::class,│
│                          'filter_contextual_mock_caps'])    │
│                                                             │
│  [Tier 1: Fast-Fail Gate] O(1) isset($static_mock_caps[$cap])│
│       │ No ──► Return $allcaps immediately (< 0.0001ms)     │
│       ▼ Yes                                                 │
│  [Tier 2: Role Gate] !empty($allcaps[$rule['role']])        │
│       │ No ──► Continue / Return unaltered                  │
│       ▼ Yes                                                 │
│  [Tier 3: Bounded Stack Gate] debug_backtrace(IGNORE, depth)│
│       │ Matches caller pattern ──► $allcaps[$asked_cap]=true│
│       │ Audit Log: do_action('wpdev_contextual_mock_cap...')│
│       └── No match ─────────────► Return $allcaps unchanged │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Code Implementation Details

### 5.1 Modifications to `BluePrint.php`

```php
// In packages/framework/src/Support/AccessManager/BluePrint/BluePrint.php

final class BluePrint
{
    /**
     * Contextual mock capability rules:
     * [ targetCap => list<array{role: string, caller: string, depth: int}> ]
     *
     * @var array<string, list<array{role: string, caller: string, depth: int}>>
     */
    protected array $mock_caps = [];

    /**
     * Define a contextual mock capability granted strictly when a specific vendor or caller queries it.
     *
     * @param string $target_cap       Capability being queried (e.g. 'editor', 'administrator').
     * @param string $for_role         Prerequisite role the user must possess (e.g. 'content_manager').
     * @param string $when_called_from File path or class substring in the call stack (e.g. 'wordfence').
     * @param int    $max_depth        Maximum call stack depth to inspect (default: 10, clamped 1..50).
     */
    public function mock_cap(string $target_cap, string $for_role, string $when_called_from, int $max_depth = 10): self
    {
        $target_cap = strtolower(trim($target_cap));
        $for_role   = strtolower(trim($for_role));

        // Prevent redundant or self-referential spoofing
        if ($target_cap === '' || $for_role === '' || $target_cap === $for_role) {
            return $this;
        }

        $depth = min(50, max(1, $max_depth));

        $this->mock_caps[$target_cap][] = [
            'role'   => $for_role,
            'caller' => $when_called_from,
            'depth'  => $depth,
        ];

        return $this;
    }

    /**
     * Retrieve all registered mock capability rules.
     *
     * @return array<string, list<array{role: string, caller: string, depth: int}>>
     */
    public function get_mock_caps(): array
    {
        return $this->mock_caps;
    }
}
```

### 5.2 Modifications to `UserAccess.php`

```php
// In packages/framework/src/Support/AccessManager/UserAccess.php

abstract class UserAccess extends QualifierBase
{
    /**
     * Static registry of all mock caps across all UserAccess subclasses.
     *
     * @var array<string, list<array{role: string, caller: string, depth: int}>>
     */
    protected static array $static_mock_caps = [];

    /**
     * Idempotency guard for hook attachment.
     */
    protected static bool $filter_attached = false;

    /**
     * Registry of booted classes to prevent redundant descriptor inspection.
     *
     * @var array<string, bool>
     */
    protected static array $booted_classes = [];

    /**
     * Boot mock capabilities early (before Wordfence init:10).
     */
    public static function boot(?string $class = null): void
    {
        $class = $class ?? static::class;
        if ($class === self::class) {
            return;
        }

        if (isset(self::$booted_classes[$class])) {
            return;
        }
        self::$booted_classes[$class] = true;

        if (class_exists($class)) {
            $ref = new \ReflectionClass($class);
            if ($ref->isSubclassOf(self::class) && !$ref->isAbstract()) {
                /** @var self $instance */
                $instance = $ref->newInstanceWithoutConstructor();
                $blue_print = new BluePrint\BluePrint();
                $instance->describe($blue_print);

                self::register_blueprint_mock_caps($blue_print);
                self::attach_filter();
            }
        }
    }

    /**
     * Register mock caps from a BluePrint into static state.
     */
    protected static function register_blueprint_mock_caps(BluePrint\BluePrint $blue_print): void
    {
        foreach ($blue_print->get_mock_caps() as $target_cap => $rules) {
            if (!isset(self::$static_mock_caps[$target_cap])) {
                self::$static_mock_caps[$target_cap] = [];
            }
            foreach ($rules as $rule) {
                self::$static_mock_caps[$target_cap][] = $rule;
            }
        }
    }

    /**
     * Ensure the user_has_cap filter is attached (idempotent).
     */
    protected static function attach_filter(): void
    {
        if (self::$filter_attached) {
            return;
        }

        if (!empty(self::$static_mock_caps) && function_exists('add_filter')) {
            add_filter('user_has_cap', [self::class, 'filter_contextual_mock_caps'], 10, 4);
            self::$filter_attached = true;
        }
    }

    /**
     * Override structure() to register mock caps lazily as a fallback.
     */
    protected function structure(): array
    {
        $blue_print = new BluePrint\BluePrint();
        $this->describe($blue_print);

        self::register_blueprint_mock_caps($blue_print);
        self::attach_filter();

        return $blue_print->structure();
    }

    /**
     * 3-Tier Fast-Fail capability filter for contextual mocking.
     *
     * @param array<string, bool> $allcaps
     * @param array<int, string>  $caps
     * @param array<int, mixed>   $args
     * @param mixed               $user
     * @return array<string, bool>
     */
    public static function filter_contextual_mock_caps(array $allcaps, array $caps, array $args, $user = null): array
    {
        if (empty(self::$static_mock_caps)) {
            return $allcaps;
        }

        $asked_cap = $args[0] ?? '';
        if ($asked_cap === '' || !isset(self::$static_mock_caps[$asked_cap])) {
            // Tier 1: Fast-Fail Gate O(1)
            return $allcaps;
        }

        $rules = self::$static_mock_caps[$asked_cap];
        foreach ($rules as $rule) {
            // Tier 2: Prerequisite Role Gate
            if (empty($allcaps[$rule['role']])) {
                continue;
            }

            // Tier 3: Bounded Call Stack Inspection
            $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, $rule['depth']);
            foreach ($trace as $frame) {
                $file   = $frame['file'] ?? '';
                $class  = $frame['class'] ?? '';
                $caller = $rule['caller'];

                if (
                    ($class !== '' && stripos($class, $caller) !== false)
                    || ($file !== '' && (stripos($file, $caller) !== false || basename($file) === $caller))
                ) {
                    $allcaps[$asked_cap] = true;

                    if (function_exists('do_action')) {
                        $user_id = is_object($user) && isset($user->ID) ? (int) $user->ID : 0;
                        do_action('wpdev_contextual_mock_cap_applied', $asked_cap, $rule['role'], $caller, $user_id);
                    }

                    return $allcaps;
                }
            }
        }

        return $allcaps;
    }

    /**
     * Reset static state for test isolation.
     */
    public static function reset_mock_caps(): void
    {
        self::$static_mock_caps = [];
        self::$booted_classes   = [];
        if (self::$filter_attached) {
            if (function_exists('remove_filter')) {
                remove_filter('user_has_cap', [self::class, 'filter_contextual_mock_caps'], 10);
            }
            self::$filter_attached = false;
        }
    }
}
```

---

## 6. Strict TDD Verification Plan

Location: `tests/phpunit/Support/AccessManager/UserAccessTest.php`

1. **`test_mock_cap_stores_rule_in_blueprint()`**
   Assert `$bp->get_mock_caps()` stores array with role, caller, and clamped depth.
2. **`test_mock_cap_rejects_identical_role_and_cap()`**
   Assert `$bp->mock_cap('editor', 'editor', 'wf')` is ignored.
3. **`test_fast_fail_exits_immediately_for_unrelated_capabilities()`**
   Querying unmocked capability does not run backtrace and leaves `$allcaps` intact.
4. **`test_denies_mock_cap_when_user_lacks_prerequisite_role()`**
   Querying mocked cap without prerequisite role returns `false`.
5. **`test_grants_mock_cap_when_caller_matches_pattern()`**
   Helper function matching caller pattern asserts `$allcaps[$target_cap] === true` and verifies `wpdev_contextual_mock_cap_applied` action was fired.
6. **`test_denies_mock_cap_when_caller_does_not_match()`**
   User with prerequisite role querying from standard caller receives `false`.
7. **`test_respects_max_depth_boundary()`**
   Caller deeper than `depth` receives `false`.
8. **`test_idempotent_filter_attachment()`**
   Multiple calls to `boot()` or `have_access()` do not attach duplicate filters.
9. **`test_multi_rule_support_for_same_capability()`**
   Supports multiple rules for the same capability without collision.
