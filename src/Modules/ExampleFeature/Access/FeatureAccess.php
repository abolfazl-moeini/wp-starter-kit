<?php
declare(strict_types=1);

namespace WPDev\Modules\ExampleFeature\Access;

use WPDev\Support\AccessManager\BluePrint\BluePrint;
use WPDev\Support\AccessManager\UserAccess;

/**
 * Named access map for ExampleFeature.
 *
 * This is the canonical AccessManager example in the starter kit.
 * Declare every feature gate once here, then call have_access() from
 * REST handlers, admin menus, and shortcodes — do not scatter
 * current_user_can() calls across the module.
 *
 * Patterns (from AccessManager fixtures):
 * - any()     — OR of capabilities (Single/Any)
 * - all()     — AND of capabilities (Single/All)
 * - custom()  — arbitrary callback (Single/Custom)
 * - Multiple describe() with the same id — OR of rule groups (Combine/*)
 *
 * @see \WPDev\Support\AccessManager\UserAccess
 * @see \WPDev\Support\Auth\CapabilityPolicy::access()
 */
final class FeatureAccess extends UserAccess
{
    /** Logged-in users who can read content. */
    public const VIEW_ITEMS = 'view_items';

    /**
     * Mutating endpoints (POST items). Requires edit_posts (author+).
     * Matches the security contract in ExampleFeatureSecurityTest.
     */
    public const EDIT_ITEMS = 'edit_items';

    /** Needs both edit_posts and publish_posts (AND — fixture Single/All). */
    public const PUBLISH_ITEMS = 'publish_items';

    /**
     * Admin OR editor-level access (OR groups — fixture Combine/*).
     * First group: manage_options; second group: edit_others_posts.
     */
    public const MANAGE_FEATURE = 'manage_feature';

    protected function describe(BluePrint $blue_print): void
    {
        // --- any(): pass if user has at least one of these caps ---
        $blue_print->describe(self::VIEW_ITEMS)
            ->any('read', 'edit_posts');

        // --- any() with a single cap (common REST gate) ---
        $blue_print->describe(self::EDIT_ITEMS)
            ->any('edit_posts');

        // --- all(): pass only when every cap is present ---
        $blue_print->describe(self::PUBLISH_ITEMS)
            ->all('edit_posts', 'publish_posts');

        // --- custom(): free-form check (e.g. role meta, options, etc.) ---
        // Chained custom() rules in the same group are AND'd.
        $blue_print->describe(self::MANAGE_FEATURE)
            ->custom(static function (): bool {
                return current_user_can('manage_options');
            });

        // Second OR-group for the same id: editors who can edit others' posts.
        $blue_print->describe(self::MANAGE_FEATURE)
            ->any('edit_others_posts');
    }
}
