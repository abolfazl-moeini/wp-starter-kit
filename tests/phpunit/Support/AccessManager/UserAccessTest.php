<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\AccessManager;

use WPDev\Support\AccessManager\BluePrint\BluePrint;
use WPDev\Support\AccessManager\UserAccess;
use WPDev\Support\Auth\CapabilityPolicy;

/**
 * Fixture-style access rules mirroring betterstudio/access-manager tests.
 */
final class SampleUserAccess extends UserAccess
{
    /** @var callable|null */
    private $describeCallback;

    public function __construct(?callable $describeCallback = null)
    {
        $this->describeCallback = $describeCallback;
    }

    protected function describe(BluePrint $blue_print): void
    {
        if ($this->describeCallback !== null) {
            ($this->describeCallback)($blue_print);
        }
    }
}

class UserAccessTest extends \WPDevTest\TestCases\TestCase
{
    public function test_unknown_id_denies_access(): void
    {
        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->describe('known')->any('read');
        });

        $this->assertFalse($access->have_access('unknown'));
    }

    public function test_any_requires_at_least_one_cap(): void
    {
        $this->login('subscriber');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            // Single/Any: empty caps → false; with read → true for subscriber
            $bp->describe('sample')->any('manage_options', 'read');
        });

        $this->assertTrue($access->have_access('sample'));
    }

    public function test_any_fails_when_user_has_none(): void
    {
        $this->login('subscriber');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->describe('sample')->any('manage_options', 'edit_posts');
        });

        $this->assertFalse($access->have_access('sample'));
    }

    public function test_all_requires_every_cap(): void
    {
        $this->login('author');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            // Single/All: author has edit_posts + publish_posts
            $bp->describe('sample')->all('edit_posts', 'publish_posts');
        });

        $this->assertTrue($access->have_access('sample'));
    }

    public function test_all_fails_when_any_cap_missing(): void
    {
        $this->login('contributor');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->describe('sample')->all('edit_posts', 'publish_posts');
        });

        $this->assertFalse($access->have_access('sample'));
    }

    public function test_all_fails_closed_when_caps_array_is_empty(): void
    {
        $this->login('subscriber');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->describe('restricted')->all();
        });

        $this->assertFalse($access->have_access('restricted'));
    }

    public function test_custom_callback(): void
    {
        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->describe('deny')->custom('__return_false');
            $bp->describe('allow')->custom('__return_true');
        });

        $this->assertFalse($access->have_access('deny'));
        $this->assertTrue($access->have_access('allow'));
    }

    public function test_or_groups_via_multiple_describe(): void
    {
        $this->login('editor');

        // Combine/* pattern: first group fails, second group passes
        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->describe('sample')->all('manage_options');
            $bp->describe('sample')->any('edit_others_posts');
        });

        $this->assertTrue($access->have_access('sample'));
    }

    public function test_capability_policy_access_helpers(): void
    {
        $this->login('editor');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->describe('edit')->any('edit_posts');
        });

        $this->assertTrue(CapabilityPolicy::access($access, 'edit'));

        $callback = CapabilityPolicy::rest_access($access, 'edit');
        $this->assertTrue($callback());

        $this->login('subscriber');
        $this->assertFalse(CapabilityPolicy::access($access, 'edit'));
    }

    protected function tearDown(): void
    {
        UserAccess::reset_mock_caps();
        parent::tearDown();
    }

    public function test_mock_cap_stores_rules_in_blueprint(): void
    {
        $bp = new BluePrint();
        $bp->mock_cap('editor', 'content_manager', 'wordfence', 12);

        $mock_caps = $bp->get_mock_caps();
        $this->assertArrayHasKey('editor', $mock_caps, 'BluePrint should store rules under target_cap key');
        $this->assertCount(1, $mock_caps['editor'], 'BluePrint should store rule in list');
        $this->assertSame('content_manager', $mock_caps['editor'][0]['role'], 'Role should match');
        $this->assertSame('wordfence', $mock_caps['editor'][0]['caller'], 'Caller should match');
        $this->assertSame(12, $mock_caps['editor'][0]['depth'], 'Depth should match');
    }

    public function test_mock_cap_ignores_identical_cap_and_role(): void
    {
        $bp = new BluePrint();
        $bp->mock_cap('editor', 'editor', 'wordfence');

        $this->assertEmpty($bp->get_mock_caps(), 'BluePrint should ignore self-referential mock cap');
    }

    public function test_mock_cap_clamps_depth_boundaries(): void
    {
        $bp = new BluePrint();
        $bp->mock_cap('editor', 'content_manager', 'wordfence', 999);
        $this->assertSame(50, $bp->get_mock_caps()['editor'][0]['depth'], 'Depth should be clamped to max 50');

        $bp2 = new BluePrint();
        $bp2->mock_cap('editor', 'content_manager', 'wordfence', -5);
        $this->assertSame(1, $bp2->get_mock_caps()['editor'][0]['depth'], 'Depth should be clamped to min 1');
    }

    public function test_mock_cap_supports_multiple_rules_for_same_capability(): void
    {
        $bp = new BluePrint();
        $bp->mock_cap('editor', 'content_manager', 'wordfence');
        $bp->mock_cap('editor', 'shop_manager', 'another_vendor');

        $this->assertCount(2, $bp->get_mock_caps()['editor'], 'BluePrint should store multiple rules for the same cap');
    }

    public function test_denies_mock_cap_when_user_lacks_prerequisite_role(): void
    {
        $this->login('subscriber');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->mock_cap('editor', 'content_manager', 'FakeWordfenceCaller');
        });
        $access->have_access('any_dummy');

        $result = FakeWordfenceCaller::queryCap('editor');
        $this->assertFalse($result, 'Subscriber lacking content_manager role must be denied editor cap');
    }

    public function test_grants_mock_cap_when_caller_and_prerequisite_role_match(): void
    {
        if (!get_role('content_manager')) {
            add_role('content_manager', 'Content Manager', ['read' => true]);
        }

        $user_id = $this->factory()->user->create(['role' => 'content_manager']);
        wp_set_current_user($user_id);

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->mock_cap('editor', 'content_manager', 'FakeWordfenceCaller');
        });
        $access->have_access('dummy');

        // Outside caller: must receive false
        $this->assertFalse(current_user_can('editor'), 'Standard WordPress context must not receive mocked editor cap');

        // Audit action spy
        $audit_fired = false;
        $captured_cap = '';
        $captured_role = '';
        $captured_caller = '';
        $action_hook = function ($cap, $role, $caller) use (&$audit_fired, &$captured_cap, &$captured_role, &$captured_caller): void {
            $audit_fired = true;
            $captured_cap = $cap;
            $captured_role = $role;
            $captured_caller = $caller;
        };
        add_action('wpdev_contextual_mock_cap_applied', $action_hook, 10, 3);

        // Inside caller: must receive true
        $result = FakeWordfenceCaller::queryCap('editor');
        $this->assertTrue($result, 'FakeWordfenceCaller must receive true for mocked editor cap');
        $this->assertTrue($audit_fired, 'Audit action wpdev_contextual_mock_cap_applied must be fired');
        $this->assertSame('editor', $captured_cap);
        $this->assertSame('content_manager', $captured_role);
        $this->assertSame('FakeWordfenceCaller', $captured_caller);

        remove_action('wpdev_contextual_mock_cap_applied', $action_hook, 10);
    }

    public function test_denies_mock_cap_when_caller_does_not_match(): void
    {
        if (!get_role('content_manager')) {
            add_role('content_manager', 'Content Manager', ['read' => true]);
        }

        $user_id = $this->factory()->user->create(['role' => 'content_manager']);
        wp_set_current_user($user_id);

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->mock_cap('editor', 'content_manager', 'FakeWordfenceCaller');
        });
        $access->have_access('dummy');

        $result = FakeOtherCaller::queryCap('editor');
        $this->assertFalse($result, 'Unmatched caller must receive false');
    }

    public function test_idempotent_filter_attachment(): void
    {
        global $wp_filter;

        $access1 = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->mock_cap('editor', 'content_manager', 'FakeWordfenceCaller');
        });
        $access1->have_access('d1');

        $access2 = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->mock_cap('editor', 'content_manager', 'FakeWordfenceCaller');
        });
        $access2->have_access('d2');

        $callbacks = $wp_filter['user_has_cap']->callbacks[10] ?? [];
        $match_count = 0;
        foreach ($callbacks as $entry) {
            $fn = $entry['function'] ?? null;
            if (is_array($fn) && ($fn[0] === UserAccess::class || $fn[0] instanceof UserAccess) && $fn[1] === 'filter_contextual_mock_caps') {
                $match_count++;
            }
        }

        $this->assertSame(1, $match_count, 'user_has_cap filter must be attached exactly once');
    }

    public function test_boot_registers_mock_caps_early(): void
    {
        if (!get_role('content_manager')) {
            add_role('content_manager', 'Content Manager', ['read' => true]);
        }

        $user_id = $this->factory()->user->create(['role' => 'content_manager']);
        wp_set_current_user($user_id);

        // Call boot() directly - NO have_access() called!
        SampleBootUserAccess::boot();

        // Standard context: false
        $this->assertFalse(current_user_can('editor'), 'Standard WP context must be false after early boot');

        // Caller context: true
        $this->assertTrue(FakeWordfenceCaller::queryCap('editor'), 'FakeWordfenceCaller must be true after early boot');
    }

    public function test_map_cap_stores_mapped_caps_in_blueprint(): void
    {
        $bp = new BluePrint();
        $bp->map_cap('custom_manage_cap', ['administrator', 'content_manager']);

        $mapped = $bp->get_mapped_caps();
        $this->assertArrayHasKey('custom_manage_cap', $mapped, 'BluePrint should store mapped cap');
        $this->assertSame(['administrator', 'content_manager'], $mapped['custom_manage_cap']);
    }

    public function test_map_cap_grants_capability_in_memory_to_allowed_roles(): void
    {
        if (!get_role('content_manager')) {
            add_role('content_manager', 'Content Manager', ['read' => true]);
        }

        $user_id = $this->factory()->user->create(['role' => 'content_manager']);
        wp_set_current_user($user_id);

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->map_cap('nikamooz_manage_theme_settings', ['administrator', 'content_manager']);
        });
        $access->have_access('dummy');

        $this->assertTrue(
            current_user_can('nikamooz_manage_theme_settings'),
            'User with content_manager role must be granted mapped cap in memory'
        );
    }

    public function test_map_cap_denies_capability_to_unmapped_roles(): void
    {
        $this->login('subscriber');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->map_cap('nikamooz_manage_theme_settings', ['administrator', 'content_manager']);
        });
        $access->have_access('dummy');

        $this->assertFalse(
            current_user_can('nikamooz_manage_theme_settings'),
            'Subscriber must not receive mapped cap'
        );
    }

    public function test_user_access_register_boots_class(): void
    {
        if (!get_role('content_manager')) {
            add_role('content_manager', 'Content Manager', ['read' => true]);
        }

        $user_id = $this->factory()->user->create(['role' => 'content_manager']);
        wp_set_current_user($user_id);

        SampleRegisterUserAccess::register();

        $this->assertTrue(
            current_user_can('mapped_register_cap'),
            'Register must boot class and grant mapped capability'
        );
    }

    public function test_reentrancy_guard_prevents_infinite_recursion_when_audit_hook_queries_caps(): void
    {
        if (!get_role('content_manager')) {
            add_role('content_manager', 'Content Manager', ['read' => true]);
        }

        $user_id = $this->factory()->user->create(['role' => 'content_manager']);
        wp_set_current_user($user_id);

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->mock_cap('editor', 'content_manager', 'FakeWordfenceCaller');
        });
        $access->have_access('dummy');

        $reentrant_calls_count = 0;
        $reentrant_action = function () use (&$reentrant_calls_count): void {
            $reentrant_calls_count++;
            // This reentrant query MUST NOT cause infinite recursion!
            current_user_can('editor');
            current_user_can('read');
        };

        add_action('wpdev_contextual_mock_cap_applied', $reentrant_action, 10, 0);

        // Invoke through caller
        $result = FakeWordfenceCaller::queryCap('editor');

        remove_action('wpdev_contextual_mock_cap_applied', $reentrant_action, 10);

        $this->assertTrue($result, 'Primary call must succeed');
        $this->assertSame(1, $reentrant_calls_count, 'Re-entrant query must be prevented from recurring into infinite loop');
    }

    public function test_filter_attachment_is_strictly_idempotent_across_repeated_have_access_calls(): void
    {
        global $wp_filter;

        // Instantiate 50 separate objects and call have_access 50 times
        for ($i = 0; $i < 50; $i++) {
            $access = new SampleUserAccess(static function (BluePrint $bp): void {
                $bp->mock_cap('editor', 'content_manager', 'wordfence');
            });
            $access->have_access('dummy_' . $i);
        }

        $callbacks_at_prio_10 = $wp_filter['user_has_cap']->callbacks[10] ?? [];
        $filter_count = 0;
        foreach ($callbacks_at_prio_10 as $cb) {
            if (isset($cb['function']) && is_array($cb['function']) && $cb['function'][0] === UserAccess::class) {
                $filter_count++;
            }
        }

        $this->assertSame(
            1,
            $filter_count,
            'user_has_cap filter must be attached exactly ONCE regardless of how many UserAccess instances run'
        );
    }

    public function test_fast_fail_performance_on_unrelated_capabilities(): void
    {
        $this->login('subscriber');

        $access = new SampleUserAccess(static function (BluePrint $bp): void {
            $bp->map_cap('custom_admin_cap', ['administrator']);
            $bp->mock_cap('editor', 'content_manager', 'wordfence');
        });
        $access->have_access('dummy');

        // Query 2,000 unrelated capabilities
        $start = microtime(true);
        for ($i = 0; $i < 2000; $i++) {
            current_user_can('unrelated_random_cap_' . ($i % 10));
        }
        $elapsed = (microtime(true) - $start) * 1000; // in milliseconds

        $this->assertLessThan(
            200.0,
            $elapsed,
            "2000 capability checks must pass O(1) fast-fail gate in under 200ms (took {$elapsed}ms)"
        );
    }

    public function test_map_cap_ignores_self_referential_mapping(): void
    {
        $bp = new BluePrint();
        $bp->map_cap('administrator', ['administrator', 'content_manager']);

        $mapped = $bp->get_mapped_caps();
        $this->assertArrayHasKey('administrator', $mapped);
        $this->assertNotContains(
            'administrator',
            $mapped['administrator'],
            'map_cap must filter out self-referential capability mapping'
        );
        $this->assertContains('content_manager', $mapped['administrator']);
    }
}

class SampleRegisterUserAccess extends UserAccess
{
    protected function describe(BluePrint $bp): void
    {
        $bp->map_cap('mapped_register_cap', ['content_manager']);
    }
}


class SampleBootUserAccess extends UserAccess
{
    protected function describe(BluePrint $bp): void
    {
        $bp->mock_cap('editor', 'content_manager', 'FakeWordfenceCaller');
    }
}


class FakeWordfenceCaller
{
    public static function queryCap(string $cap): bool
    {
        return current_user_can($cap);
    }
}

class FakeOtherCaller
{
    public static function queryCap(string $cap): bool
    {
        return current_user_can($cap);
    }
}

