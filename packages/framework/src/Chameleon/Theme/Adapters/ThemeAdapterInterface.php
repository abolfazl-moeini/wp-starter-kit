<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme\Adapters;

use WP_Theme;
use WPDev\Chameleon\Theme\HostTokens\HostTokenRecord;

/**
 * ThemeAdapterInterface: Contract for extracting design tokens from specific host themes.
 */
interface ThemeAdapterInterface {
    /**
     * Whether this adapter supports the currently active theme.
     *
     * @param WP_Theme $theme Active theme object.
     * @return bool
     */
    public function supports(WP_Theme $theme): bool;

    /**
     * Extract token records from the host theme.
     *
     * @return HostTokenRecord[]
     */
    public function records(): array;

    /**
     * Supported version range description.
     *
     * @return string
     */
    public function version_range(): string;
}
