# Adversarial Review — Contextual Capability Delegation

**Spec:** `docs/contextual-capability-delegation-plan.md`
**Mode:** report-only. Nothing in `packages/framework` was modified.
**Verdict:** the mechanism is sound and the premise is now _proven_ — but as written the
plan cannot work in the target codebase, and its stated security invariant is false by a
factor of 32.

---

## 0. What I verified (not assumed)

The spec's entire justification rests on an unverified claim about Wordfence internals. I
read the installed plugin and the **actual compiled ruleset** at
`wp-content/wflogs/rules.php` rather than trusting the summary.

| Claim in spec                                     | Verified? | Evidence                                                                                                                  |
| ------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `getCurrentUserRole()` hardcodes a role list      | ✅        | `lib/wordfenceClass.php:9100`                                                                                             |
| It is called during WAF auth-cookie assembly      | ✅        | sole call site `wordfenceClass.php:5910`, inside `initAction()`                                                           |
| `initAction()` runs at a point we can hook before | ✅        | `add_action('init', 'wordfence::initAction')` — **priority 10** (`:1197`)                                                 |
| Rule 507 fires on `post.php` custom-field bodies  | ✅        | matches `server.script_filename =~ #/wp-admin/post\.php$#` AND `request.body.{meta,metavalue,metakeyinput,metakeyselect}` |
| Rule 507 trusts editors                           | ✅        | condition ends `currentUserIsNot('administrator') AND currentUserIsNot('editor')`                                         |
| Rule 507 is gated on WP version                   | ❌        | **no version condition exists** — the title says "Core < 6.0.2" but the rule fires on any version                         |
| The trust predicate is capability-based           | ❌        | `currentUserCan` appears **0 times** in the 695-rule ruleset; only `currentUserIs` / `currentUserIsNot` are used          |

Two consequences, both favourable to the plan:

1. **The spoof will work for rule 507.** The predicate is `currentUserIsNot('editor')`, read
   from the signed cookie's `role` field. Making `role === 'editor'` satisfies it.
2. **`getCurrentUserCapabilities()` is irrelevant.** Since no rule consults
   `checkCapability()`, the `capabilities` field in the cookie has no bearing on rule
   evaluation. Spoofing the role alone is sufficient — the plan does not need to touch caps.

That is the good news, and it is worth stating plainly: the previous review could not confirm
the premise, this one can. **The mechanism is correct.**

---

## 1. Q1 — O(1) Fast-Fail: the claim is right, the implementation is not

**Tier 1 and Tier 2 are genuinely O(1)** and correctly ordered. `isset()` on a small map and
one array lookup before any backtrace is the right shape. Concede that.

But the invariant as written — _"completely eliminate CPU overhead"_ — is false in this
codebase, for a reason the spec did not look for.

`have_access()` is called on a **fresh instance every time**:

```php
// src/Support/Access.php:41
return (new ThemeFieldsAccess())->have_access(ThemeFieldsAccess::MANAGE_SETTINGS);
```

`QualifierBase::$rules` memoises **per instance**, and the spec's `attach_mock_cap_filter()`
has **no idempotency guard**:

```php
protected function attach_mock_cap_filter(): void
{
    if (function_exists('add_filter')) {
        add_filter('user_has_cap', [$this, 'filter_contextual_mock_caps'], 10, 3);
    }
}
```

So every `nik_tp_can()` call constructs a new object, runs `describe()`, and appends **another
identical `user_has_cap` callback**. An admin screen performing 40 permission checks installs
40 copies of the filter. Each one then runs `isset()` on every subsequent capability query —
exactly the per-query overhead Tier 1 was supposed to eliminate — and 40 separate `$this`
references are retained for the request.

**Required:** a `static bool $attached` guard (or attach once from a boot method, see §2), and
a test that asserts `add_filter` fires exactly once across N `have_access()` calls.

---

## 2. Q2 — Lifecycle: this is not a risk, it is a deterministic failure

The spec asks whether "an early Wordfence WAF check" might beat `structure()`. The answer is
worse than that: **`structure()` never runs before Wordfence needs it, on any request.**

The chain:

- `QualifierBase::structure()` is called only from `have_access()` (`QualifierBase.php:47`).
- `ThemeFieldsAccess::register()` — invoked at file scope in `Access.php:119` — only calls
  `register_caps()`. It never touches `structure()`.
- The first `have_access()` in a request comes from `nik_tp_can()`, which is reached from
  admin page rendering / menu building / REST permission callbacks — i.e. `admin_menu`,
  `admin_init`, or later.
- Wordfence resolves the role at **`init`, priority 10**.

Therefore the filter is attached _after_ the cookie has already been signed with
`role=other`. And because each request is a new process, it is attached too late again on the
next request. **The cookie is never written with `role=editor`.** The 403 persists, and the
fix looks broken while being perfectly correct in unit tests.

This is the single most important finding: the plan replaces a _DB mutation_ (which is
timing-independent, and is why the current `add_cap('editor')` hack works) with a
_latched hook_ that has a hard timing dependency the plan does not address.

**Required:** attach at `plugins_loaded` (priority 1) or `init` at priority < 10. That needs a
boot path independent of `have_access()`, e.g.:

```php
// UserAccess
public static function boot(): void   // hooked at plugins_loaded, prio 1
{
    if (self::$booted) { return; }
    self::$booted = true;
    // build blueprint once, cache mock_caps statically, attach filter once
}
```

Note this forces `$mock_caps` to be **static**, not the instance property the spec declares —
another sign the design was written for the `have_access()` path and not the boot path.

---

## 3. Q3 — Memory & confinement: adequate for memory, wrong for confinement

**Memory: fine.** `DEBUG_BACKTRACE_IGNORE_ARGS` omits both `args` and `object`, so no object
graph is retained. 15 frames is a few hundred bytes, freed on return. No bloat.

**Leakage across calls: none.** The filter is stateless; each invocation re-inspects its own
stack. Correct as claimed.

**Leakage _downward_ within a call: yes, and the spec misses it.** Any code invoked _by_ the
trusted caller while the frame is live inherits the spoof. At this call site the window is
narrow (`getCurrentUserRole()` does nothing but query), so practical risk is low — but the
mechanism is generic and the framework will be reused.

**Confinement is also looser than necessary.** Scanning 15 frames with `stristr()` on the file
path means any frame whose path merely _contains_ `wordfence` grants the escalation. At this
call site the Wordfence frame is 6–8 deep, so a bounded exact match on the immediate frames
(depth 3) would be both tighter and cheaper:

```php
$trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 4);
// match basename exactly, or a normalized path prefix
```

Recommendation: default `$max_depth` to **3**, clamp with `min(50, max(1, $n))`, and match
`basename($file) === $caller` (or a path _prefix_) rather than a substring anywhere in 15
frames. Note the spec's `max(1, $max_depth)` has **no upper bound** — `mock_cap(..., 100000)`
is accepted.

---

## 4. Q4 — API ergonomics: not cohesive, and the name is wrong

Honest answer: `mock_cap()` does not belong on `BluePrint`.

**The name misleads.** It does not mock a capability; it makes WordPress _report a role_ to a
specific caller. `mock_cap('editor', …)` reads as "pretend the user has the editor capability",
which is precisely the anti-pattern §1.2 condemns. A reviewer skimming `describe()` will
misread it. `report_as_role()` / `trust_vendor_as_role()` says what it does.

**The cohesion claim is backwards.** `describe()` declares _inbound_ access rules — what the
current user may do. `mock_cap()` declares an _outbound_ vendor-specific lie — what we tell a
third party about the user. Different audience, different lifecycle, different risk class.
Sharing a builder is not cohesion; it is co-location. A security reviewer auditing
`describe()` should not have to also audit an escalation primitive.

**Minimalist counter-proposal** (zero new classes, zero new directories — the spec's own
constraint):

```php
final class ThemeFieldsAccess extends UserAccess
{
    protected function describe(BluePrint $bp): void
    {
        $bp->describe(self::MANAGE_SETTINGS)->any(self::CAP_MANAGE_SETTINGS, 'manage_options');
    }

    /** @return array<string, array{vendor:string, role:string}> */
    protected function vendor_role_reports(): array
    {
        return ['editor' => ['vendor' => 'wordfence', 'role' => 'content_manager']];
    }
}
```

Same one-line declaration cost, no builder pollution, and the escalation surface is a named,
greppable, separately-reviewable method.

**Data-structure bug regardless of API shape:** `$mock_caps[$target_cap]` is keyed by target
only. Two rules for the same capability from two vendors — `editor` for `content_manager` via
`wordfence`, `editor` for `shop_manager` via `nirweb` — **silently overwrite**, last wins.
Key by `vendor + target`, or store a list per target.

---

## 5. Q5 — TDD: the matrix tests the happy path and skips every failure that matters

The six planned tests are fine as far as they go. They miss:

| Missing test                                                                 | Why it matters                                                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Filter attached **exactly once** across repeated `have_access()`             | catches the duplicate-hook defect in §1                                                                             |
| Filter attached **before `init`** (boot-path test)                           | catches the §2 failure — the one that actually ships broken                                                         |
| Two rules, same `$target_cap`, different vendors                             | catches the silent overwrite                                                                                        |
| `user_has_cap` invoked for a **different user** than the current one         | the filter ignores `$args[1]`; `$other_user->has_cap('editor')` from a Wordfence frame would be spoofed too         |
| `$allcaps` returned **strictly identical** (`assertSame`) on every fail path | proves "fails closed" rather than "fails almost closed"                                                             |
| Real Wordfence frame, not a synthetic helper                                 | test 4 uses a helper whose file/class matches the pattern; it never proves the pattern matches `wordfenceClass.php` |
| `$max_depth` upper clamp                                                     | `mock_cap(..., 100000)` currently accepted                                                                          |
| Capability-query path (`$args[0]` absent / non-string)                       | `$asked_cap = $args[0] ?? ''` then `isset($mock_caps[''])` — fine, but untested                                     |

The most important omission is the same one from the previous review: **tests that prove the
wiring, not the arithmetic.** A suite can be green while the cookie is still `role=other`.

---

## 6. The security invariant is false — blast radius is 32 rules, not 1

§3.2 claims _"Zero Scope Creep"_ and _"strictly scoped"_. Scoped to one vendor, yes. Scoped to
one rule, no.

The ruleset contains **695 rules**. Of those:

- **389** exempt `administrator`
- **32** exempt `editor`
- **0** consult `checkCapability()`

Spoofing `role=editor` exempts `content_manager` from **all 32 rules that treat editors as
trusted** — not just rule 507. The list includes rules that have nothing to do with embeds:

| Rule | Category          | Title                                                     |
| ---- | ----------------- | --------------------------------------------------------- |
| #68  | file_upload       | Malicious File Upload (Patterns)                          |
| #76  | file_upload       | Malicious File Upload (PHP)                               |
| #794 | file_upload       | WAF-RULE-794                                              |
| #69  | file_upload       | N-Media Post Front-end Form < 1.1 — Arbitrary File Upload |
| #236 | file_upload       | MapPress ≤ 2.53.8 — Stored XSS & RCE                      |
| #233 | priv-esc          | Rank Math SEO ≤ 1.0.40.2 — Unprotected REST Endpoints     |
| #520 | insufficient-auth | Betheme ≤ 26.6.2 — Missing Authorization Checks           |
| #675 | insufficient-auth | LeadConnector ≤ 1.7 — Arbitrary Post Deletion             |
| #507 | xss               | WordPress Core < 6.0.2 — Contributor+ Stored XSS          |
| …    |                   | 23 more (auth-bypass, xss, sde)                           |

Three of these (#68, #76, #794) are **plugin-agnostic malicious-upload detection**. Exempting a
role from them is not a false-positive workaround; it is a real reduction in coverage. The
plugin-specific ones (#69, #236, #233, …) are moot if the plugin is absent — but the generic
upload rules are not.

So the trade the plan makes is:

> Give up a _visible, auditable, reversible_ WordPress capability expansion (which shows up in
> `wp_roles`, can be diffed, and can be revoked) in exchange for an _invisible_ security-control
> exemption across 32 WAF rules, with no audit trail, no UI, and no record that
> `content_manager` is now exempt from malicious-upload detection.

That is a defensible trade only if it is stated. The spec states the opposite. **This is the
paragraph that must change before coding**, not the code.

### 6.1 The framework-level risk is larger than this feature

`UserAccess` is framework code consumed by every plugin built on the kit. Adding `mock_cap()`
there ships a **generic capability-forging primitive**: any capability, any role, gated only by
a substring in a caller's file path. One line away:

```php
$bp->mock_cap('manage_options', 'content_manager', 'nikamooz-theme-panel');
```

Nothing prevents it. No allowlist, no logging, no debug warning, no restriction that the target
be a _role_ rather than a capability.

**Required guardrails** (cheap, and they make the feature defensible):

1. **Reject non-role targets.** Allow only `administrator|editor|author|contributor|subscriber`.
   This kills the `manage_options` class of abuse outright, since the target must be a role name
   that Wordfence already understands — which is the entire use case.
2. **Log once per request** (`error_log` or `do_action('wpdev_mock_cap_applied', …)`) when a
   spoof activates. Invisible escalation is the problem; make it visible.
3. **Refuse `$for_role === $target_cap`.**
4. **Prefix match, not substring** (§3).

---

## 7. Adjustments before coding (ordered)

1. **Fix the boot path** (§2) — attach at `plugins_loaded` prio 1, `$mock_caps` static,
   idempotent. Without this the feature ships dead.
2. **Correct §3.2** — replace "Zero Scope Creep" with the measured blast radius (32 rules,
   listing the generic upload rules). The reviewer of this code needs that number.
3. **Add the role-name allowlist + activation log** (§6.1). This is what makes a
   framework-level spoof primitive acceptable rather than a footgun.
4. **Add the `static bool $attached` guard** (§1).
5. **Re-key `$mock_caps` by vendor+target** (§4).
6. **Tighten the matcher** — `min(50, max(1, depth))`, default 3, basename/prefix match (§3).
7. **Rename** `mock_cap()` → `report_role_to()` / `vendor_role_reports()`; move it off
   `BluePrint` (§4).
8. **Add the 8 missing tests** (§5), especially the boot-timing and single-attach ones.

None of these adds a class or a directory, so the spec's minimalism constraint survives.

---

## 8. The question the plan does not ask

Even with everything above fixed, one thing is unresolved: **why does `content_manager` need to
submit raw HTML at all?**

If `content_manager` lacks `unfiltered_html`, `wp_kses_post()` strips `<iframe>` before the
request is ever signed — so the WAF block is not the binding constraint, and the whole
apparatus is solving a problem that sanitization already solved (by deleting the embed).

If something _does_ grant them raw HTML, then the WAF is the last remaining control on that
path, and this design removes it — for 32 rules.

Either way, the cheaper fix remains the one already merged in `b19dd1f`: store the provider URL,
build the iframe at render time. No HTML in the POST body, no 403, no spoof, no blast radius.

**Recommendation:** implement the delegation mechanism if you want it as a general framework
capability — it is genuinely well-designed for that — but do not make it the fix for the demo
video field. That field does not need it.

---

## 9. Verification limits

- Docker was not running, so I could not confirm the live `content_manager` capability set
  (`unfiltered_html` in particular). §8 is therefore posed as a question, not a claim.
- Ruleset read from `wp-content/wflogs/rules.php` as installed (695 rules). Wordfence updates
  this file; the 32-rule count is version-specific and should be re-measured after a ruleset
  update.
- I did not execute the plan's code; all findings are from reading the target classes and the
  Wordfence call graph.
