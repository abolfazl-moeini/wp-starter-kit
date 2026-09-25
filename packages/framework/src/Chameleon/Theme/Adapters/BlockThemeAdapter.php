<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme\Adapters;

use WP_Theme;
use WPDev\Chameleon\Theme\HostTokens\HostTokenRecord;
use WPDev\Chameleon\Theme\HostTokens\Sanitizer;
use WPDev\Chameleon\Theme\HostTokens\Palette;

/**
 * BlockThemeAdapter: Extracts design tokens from Full Site Editing (FSE) block themes (theme.json).
 */
final class BlockThemeAdapter implements ThemeAdapterInterface {
    public function supports(WP_Theme $theme): bool {
        return function_exists('wp_is_block_theme') && wp_is_block_theme();
    }

    public function version_range(): string {
        return '>=6.5';
    }

    /**
     * @return HostTokenRecord[]
     */
    public function records(): array {
        $records = [];

        if (!function_exists('wp_get_global_settings')) {
            return $records;
        }

        $settings = wp_get_global_settings();
        $styles = function_exists('wp_get_global_styles') ? wp_get_global_styles() : [];

        // 1. Color Palette mapping
        $palette = $settings['color']['palette']['theme'] ?? [];
        $userPalette = $settings['color']['palette']['custom'] ?? [];
        $allColors = array_merge($palette, $userPalette);

        $colorMap = [];
        foreach ($allColors as $c) {
            if (isset($c['slug'], $c['color'])) {
                $colorMap[$c['slug']] = (string) $c['color'];
            }
        }

        // Semantic slug mapping:
        // accent-1 or accent or primary -> color.primary
        $primaryCandidate = $colorMap['accent-1'] ?? $colorMap['accent'] ?? $colorMap['primary'] ?? null;
        if ($primaryCandidate) {
            $clean = Sanitizer::sanitize_color($primaryCandidate);
            if ($clean !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_COLOR_PRIMARY,
                    $clean,
                    'global-styles',
                    0.9
                );
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_COLOR_ON_PRIMARY,
                    Palette::optimal_on_color($clean),
                    'global-styles',
                    0.9
                );
            }
        }

        // base -> color.bg
        $bgCandidate = $colorMap['base'] ?? $colorMap['background'] ?? null;
        if ($bgCandidate) {
            $clean = Sanitizer::sanitize_color($bgCandidate);
            if ($clean !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_COLOR_BG,
                    $clean,
                    'global-styles',
                    0.9
                );
            }
        }

        // contrast -> color.fg
        $fgCandidate = $colorMap['contrast'] ?? $colorMap['foreground'] ?? null;
        if ($fgCandidate) {
            $clean = Sanitizer::sanitize_color($fgCandidate);
            if ($clean !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_COLOR_FG,
                    $clean,
                    'global-styles',
                    0.9
                );
            }
        }

        // 2. Button border radius from global styles
        $buttonRadius = $styles['elements']['button']['border']['radius'] ?? null;
        if ($buttonRadius) {
            $clean = Sanitizer::sanitize_length((string) $buttonRadius);
            if ($clean !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_RADIUS_CONTROL,
                    $clean,
                    'global-styles',
                    0.85
                );
            }
        }

        // 3. Typography
        $bodyFont = $styles['typography']['fontFamily'] ?? null;
        if ($bodyFont) {
            $clean = Sanitizer::sanitize_font_family((string) $bodyFont);
            if ($clean !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_FONT_BODY,
                    $clean,
                    'global-styles',
                    0.85
                );
            }
        }

        return $records;
    }
}
