<?php

use PHPUnit\Framework\TestCase;
use WPDev\Core\AbstractModule;
use WPDev\Core\ModuleInterface;
use WPDev\Core\ModuleLoader;

/**
 * A controllable test double for the ModuleInterface contract.
 *
 * Records the order in which modules were booted and exposes a way
 * for the test to swap the order in which the loader sees them —
 * making the boot-order assertion straightforward.
 */
final class RecordingModule implements ModuleInterface
{
    /** @var array<int, string> */
    public static array $bootLog = [];

    public string $slug;
    public int $priority;

    public function __construct(string $slug, int $priority = 10)
    {
        $this->slug = $slug;
        $this->priority = $priority;
    }

    public function boot(): void
    {
        self::$bootLog[] = $this->slug;
    }

    public function get_slug(): string
    {
        return $this->slug;
    }

    public static function reset(): void
    {
        self::$bootLog = [];
    }
}

/**
 * Module that can decline booting via should_boot().
 */
final class ConditionalModule extends AbstractModule
{
    public string $slug;
    public bool $allowBoot;

    public function __construct(string $slug, bool $allowBoot = true)
    {
        $this->slug = $slug;
        $this->allowBoot = $allowBoot;
    }

    public function boot(): void
    {
        RecordingModule::$bootLog[] = $this->slug;
    }

    public function get_slug(): string
    {
        return $this->slug;
    }

    public function should_boot(): bool
    {
        return $this->allowBoot;
    }
}

/**
 * Tests for WPDev\Core\ModuleLoader.
 *
 * Coverage:
 *  - register() stores the module by slug
 *  - register() rejects duplicate slugs (InvalidArgumentException)
 *  - boot_all() is lazy — modules are NOT booted at register time
 *  - boot_all() iterates registered modules exactly once and in
 *    registration order
 *  - get() / has() / all() are pure lookups
 */
class ModuleLoaderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        RecordingModule::$bootLog = [];
    }

    public function test_register_stores_module_by_slug(): void
    {
        $loader = new ModuleLoader('wpdev');

        $module = new RecordingModule('alpha');
        $loader->register($module);

        $this->assertTrue($loader->has('alpha'), 'Module must be retrievable by slug after register');
        $this->assertSame($module, $loader->get('alpha'), 'get() must return the exact same instance');
    }

    public function test_register_rejects_duplicate_slug(): void
    {
        $loader = new ModuleLoader('wpdev');
        $loader->register(new RecordingModule('dup'));

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('dup');

        $loader->register(new RecordingModule('dup'));
    }

    public function test_boot_all_is_lazy_until_invoked(): void
    {
        $loader = new ModuleLoader('wpdev');
        $loader->register(new RecordingModule('lazy-1'));
        $loader->register(new RecordingModule('lazy-2'));

        $this->assertSame(
            [],
            RecordingModule::$bootLog,
            'Modules must not be booted at register() time — boot_all() is the explicit trigger'
        );
    }

    public function test_boot_all_iterates_registered_modules_in_registration_order(): void
    {
        $loader = new ModuleLoader('wpdev');
        $loader->register(new RecordingModule('first'));
        $loader->register(new RecordingModule('second'));
        $loader->register(new RecordingModule('third'));

        $loader->boot_all();

        $this->assertSame(
            ['first', 'second', 'third'],
            RecordingModule::$bootLog,
            'boot_all() must iterate modules in the order they were registered'
        );
    }

    public function test_get_returns_null_for_unknown_slug(): void
    {
        $loader = new ModuleLoader('wpdev');

        $this->assertNull(
            $loader->get('does-not-exist'),
            'get() must return null for slugs that have not been registered'
        );
    }

    public function test_has_returns_false_for_unknown_slug(): void
    {
        $loader = new ModuleLoader('wpdev');

        $this->assertFalse(
            $loader->has('does-not-exist'),
            'has() must return false for slugs that have not been registered'
        );
    }

    public function test_all_returns_module_map_keyed_by_slug(): void
    {
        $loader = new ModuleLoader('wpdev');
        $alpha = new RecordingModule('alpha');
        $beta = new RecordingModule('beta');

        $loader->register($alpha);
        $loader->register($beta);

        $all = $loader->all();

        $this->assertSame(
            ['alpha' => $alpha, 'beta' => $beta],
            $all,
            'all() must return the registered modules keyed by slug, in registration order'
        );
    }

    public function test_boot_all_is_idempotent(): void
    {
        $loader = new ModuleLoader('wpdev');
        $loader->register(new RecordingModule('once'));

        $loader->boot_all();
        $loader->boot_all();

        $this->assertSame(
            ['once', 'once'],
            RecordingModule::$bootLog,
            'boot_all() is allowed to be called more than once; each call iterates the registered modules'
        );
    }

    public function test_boot_all_skips_module_when_should_boot_returns_false(): void
    {
        $loader = new ModuleLoader('wpdev');
        $loader->register(new ConditionalModule('skipped', false));
        $loader->register(new ConditionalModule('allowed', true));

        $loader->boot_all();

        $this->assertSame(
            ['allowed'],
            RecordingModule::$bootLog,
            'Modules with should_boot() === false must not have boot() invoked'
        );
    }

    public function test_boot_all_boots_module_when_should_boot_returns_true(): void
    {
        $loader = new ModuleLoader('wpdev');
        $loader->register(new ConditionalModule('always', true));

        $loader->boot_all();

        $this->assertSame(['always'], RecordingModule::$bootLog);
    }
}
