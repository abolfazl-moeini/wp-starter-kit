<?php
declare(strict_types=1);

namespace WPDev\MCP\Abilities;

use WPDev\MCP\Support\Admin\MissingApiNotice;

/**
 * Collects AbilityInterface instances and registers them with
 * WordPress strictly inside the wp_abilities_api_init action hook.
 *
 * Safety rules enforced here (idea.md §2, §3):
 *  - never register at file-load time (only inside the hook),
 *  - never call wp_register_ability() if it does not exist,
 *  - show an admin notice and abort when the Abilities API is missing.
 */
final class AbilityRegistry
{
    private static ?AbilityRegistry $instance = null;

    /** @var array<string, AbilityInterface> name => ability */
    private array $abilities = [];

    private bool $hooked = false;

    private function __construct()
    {
    }

    public static function instance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /** Add one ability to be registered later (on the hook). Idempotent by name. */
    public function register(AbilityInterface $ability): void
    {
        $name = $ability->get_name();
        if (isset($this->abilities[$name])) {
            return;
        }
        $this->abilities[$name] = $ability;
    }

    /** @return array<int, AbilityInterface> */
    public function all(): array
    {
        return array_values($this->abilities);
    }

    /**
     * Hook register_all() onto wp_abilities_api_init. Idempotent.
     * Does nothing when add_action is unavailable (tests call
     * register_all() directly).
     */
    public function boot(): void
    {
        if ($this->hooked) {
            return;
        }
        if (function_exists('add_action')) {
            \add_action('wp_abilities_api_init', [$this, 'register_all']);
            $this->hooked = true;
        }
    }

    /**
     * The wp_abilities_api_init callback. Registers every ability,
     * or aborts safely with an admin notice when the Abilities API
     * is not available.
     */
    public function register_all(): void
    {
        if (!function_exists('wp_register_ability')) {
            MissingApiNotice::queue();
            return;
        }

        foreach ($this->abilities as $ability) {
            \wp_register_ability($ability->get_name(), $ability->to_args());
        }
    }

    public static function reset_for_tests(): void
    {
        self::$instance = null;
        MissingApiNotice::reset_for_tests();
    }
}