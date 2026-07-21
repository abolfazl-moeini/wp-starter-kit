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
}
