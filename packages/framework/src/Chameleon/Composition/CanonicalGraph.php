<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Composition;

/**
 * CanonicalGraph: Defines the vendor's default immutable tree structure (G_v).
 * Regions -> Sections -> Slots hierarchy.
 */
final class CanonicalGraph {
    /**
     * Get the default canonical layout tree.
     *
     * @return array<string, array{sections: array<string, array<string, mixed>>}>
     */
    public static function get_default(): array {
        return [
            'header' => [
                'sections' => [
                    'welcome_banner' => [
                        'weight'   => 10,
                        'renderer' => [self::class, 'render_default_welcome'],
                        'slots'    => ['header.actions'],
                        'requires' => ['user.identity@1'],
                    ],
                ],
            ],
            'nav' => [
                'sections' => [],
            ],
            'main' => [
                'sections' => [
                    'stats_grid' => [
                        'weight'   => 10,
                        'renderer' => [self::class, 'render_default_stats'],
                        'slots'    => ['stats.after_metrics'],
                        'requires' => ['stats.summary@1'],
                    ],
                    'activity_feed' => [
                        'weight'   => 20,
                        'renderer' => [self::class, 'render_default_activity'],
                        'slots'    => ['activity.empty_state'],
                        'requires' => [],
                    ],
                ],
            ],
            'aside' => [
                'sections' => [
                    'quick_actions' => [
                        'weight'   => 10,
                        'renderer' => [self::class, 'render_default_quick_actions'],
                        'slots'    => [],
                        'requires' => [],
                    ],
                ],
            ],
            'footer' => [
                'sections' => [],
            ],
        ];
    }

    /**
     * Default Fallback Renderers (Semantic HTML with polaris classes)
     */
    public static function render_default_welcome(\WPDev\Chameleon\Contracts\DashboardContextV1 $ctx): void {
        $name = esc_html((string) $ctx->get('user.display_name', 'Member'));
        echo "<div class='ps-welcome-banner ps-card' data-section='welcome_banner'>";
        echo "<h2 class='ps-heading'>Welcome, {$name}</h2>";
        echo "</div>";
    }

    public static function render_default_stats(\WPDev\Chameleon\Contracts\DashboardContextV1 $ctx): void {
        $active = (int) $ctx->get('stats.active_count', 0);
        $completed = (int) $ctx->get('stats.completed_count', 0);
        echo "<div class='ps-stats-grid ps-grid' data-section='stats_grid'>";
        echo "<div class='ps-card'><div class='ps-badge'>Active</div><strong>{$active}</strong></div>";
        echo "<div class='ps-card'><div class='ps-badge'>Completed</div><strong>{$completed}</strong></div>";
        echo "</div>";
    }

    public static function render_default_activity(\WPDev\Chameleon\Contracts\DashboardContextV1 $ctx): void {
        echo "<div class='ps-activity-feed ps-card' data-section='activity_feed'>";
        echo "<h3 class='ps-heading'>Recent Activity</h3>";
        echo "<p class='ps-text-muted'>No recent activity.</p>";
        echo "</div>";
    }

    public static function render_default_quick_actions(\WPDev\Chameleon\Contracts\DashboardContextV1 $ctx): void {
        echo "<div class='ps-quick-actions ps-card' data-section='quick_actions'>";
        echo "<h3 class='ps-heading'>Quick Actions</h3>";
        echo "</div>";
    }
}
