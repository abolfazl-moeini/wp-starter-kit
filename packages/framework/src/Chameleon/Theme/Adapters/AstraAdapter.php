<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme\Adapters;

use WP_Theme;
use WPDev\Chameleon\Theme\HostTokens\HostTokenRecord;
use WPDev\Chameleon\Theme\HostTokens\Sanitizer;
use WPDev\Chameleon\Theme\HostTokens\Palette;

/**
 * AstraAdapter: Extracts design tokens from Astra theme options and theme_mods (Plan 2 §1.6).
 */
final class AstraAdapter implements ThemeAdapterInterface {
    public function supports(WP_Theme $theme): bool {
        $template = strtolower($theme->get_template());
        $stylesheet = strtolower($theme->get_stylesheet());
        return $template === 'astra' || $stylesheet === 'astra';
    }

    public function version_range(): string {
        return '4.x - 5.x';
    }

    /**
     * @return HostTokenRecord[]
     */
    public function records(): array {
        $records = [];
        $astraSettings = function_exists('get_option') ? get_option('astra-settings', []) : [];
        if (!is_array($astraSettings)) {
            $astraSettings = [];
        }

        $themeColor = $astraSettings['theme-color'] ?? null;
        if (!empty($themeColor) && is_string($themeColor)) {
            $cleanColor = Sanitizer::sanitize_color($themeColor);
            if ($cleanColor !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_COLOR_PRIMARY,
                    $cleanColor,
                    'adapter:astra@4.x',
                    0.85
                );
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_COLOR_ON_PRIMARY,
                    Palette::optimal_on_color($cleanColor),
                    'adapter:astra@4.x',
                    0.85
                );
            }
        }

        $btnRadius = $astraSettings['button-radius'] ?? null;
        if (!empty($btnRadius)) {
            $cleanRadius = Sanitizer::sanitize_length((string) $btnRadius . 'px');
            if ($cleanRadius !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_RADIUS_CONTROL,
                    $cleanRadius,
                    'adapter:astra@4.x',
                    0.85
                );
            }
        }

        $bodyFont = $astraSettings['body-font-family'] ?? null;
        if (!empty($bodyFont) && is_string($bodyFont)) {
            $cleanFont = Sanitizer::sanitize_font_family($bodyFont);
            if ($cleanFont !== null) {
                $records[] = new HostTokenRecord(
                    HostTokenRecord::ROLE_FONT_BODY,
                    $cleanFont,
                    'adapter:astra@4.x',
                    0.85
                );
            }
        }

        return $records;
    }
}
