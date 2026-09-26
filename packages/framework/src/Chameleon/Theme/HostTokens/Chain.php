<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Theme\HostTokens;

use WP_Theme;
use WPDev\Chameleon\Theme\Adapters\ThemeAdapterInterface;
use WPDev\Chameleon\Theme\Adapters\BlockThemeAdapter;
use WPDev\Chameleon\Theme\Adapters\AstraAdapter;

/**
 * Chain: Prioritized host design token resolution engine (Plan 2 §1.2).
 * Priority: manual > adapter:<theme> > global-styles > vendor-vars > probe > fallback.
 */
final class Chain {
    public const CONFIDENCE_THRESHOLD = 0.7;

    /**
     * @var ThemeAdapterInterface[]
     */
    private $adapters = [];

    public function __construct() {
        // Register default adapters
        $this->adapters[] = new BlockThemeAdapter();
        $this->adapters[] = new AstraAdapter();
    }

    /**
     * Register a custom theme adapter.
     */
    public function register_adapter(ThemeAdapterInterface $adapter): void {
        array_unshift($this->adapters, $adapter);
    }

    /**
     * Resolve all winning tokens across roles according to priority chain.
     *
     * @return array{winners: array<string, HostTokenRecord>, warnings: array<string, string>}
     */
    public function resolve(): array {
        $candidates = [];

        // 1. Manual Overrides (Highest priority)
        $overrides = function_exists('get_option') ? get_option('wpdev_ps_host_overrides', []) : [];
        if (is_array($overrides)) {
            foreach ($overrides as $role => $rawVal) {
                if (!is_string($role) || !preg_match('/^[a-zA-Z0-9_.-]+$/', $role)) {
                    continue;
                }
                if (is_string($rawVal) && !empty($rawVal)) {
                    $clean = $this->sanitize_for_role($role, $rawVal);
                    if ($clean !== null) {
                        $candidates[$role][] = new HostTokenRecord($role, $clean, 'manual', 1.0);
                    }
                }
            }
        }

        // 2. Active Theme Adapters
        $theme = function_exists('wp_get_theme') ? wp_get_theme() : null;
        if ($theme instanceof WP_Theme) {
            foreach ($this->adapters as $adapter) {
                if ($adapter->supports($theme)) {
                    foreach ($adapter->records() as $record) {
                        $candidates[$record->getRole()][] = $record;
                    }
                }
            }
        }

        // 3. Select winner for each role
        $winners = [];
        $warnings = [];

        foreach ($candidates as $role => $roleRecords) {
            // Sort by source priority
            usort($roleRecords, function (HostTokenRecord $a, HostTokenRecord $b) {
                $priority = [
                    'manual' => 10,
                    'adapter' => 8,
                    'global-styles' => 7,
                    'vendor-vars' => 5,
                    'probe' => 3,
                ];

                $getWeight = function (string $source) use ($priority) {
                    foreach ($priority as $prefix => $weight) {
                        if (str_starts_with($source, $prefix)) {
                            return $weight;
                        }
                    }
                    return 0;
                };

                $weightDiff = $getWeight($b->getSource()) <=> $getWeight($a->getSource());
                if ($weightDiff !== 0) {
                    return $weightDiff;
                }
                return $b->getConfidence() <=> $a->getConfidence();
            });

            // Find first with confidence >= threshold
            $chosen = null;
            foreach ($roleRecords as $rec) {
                if ($rec->getConfidence() >= self::CONFIDENCE_THRESHOLD) {
                    $chosen = $rec;
                    break;
                }
            }

            if ($chosen !== null) {
                $winners[$role] = $chosen;
            } else {
                $warnings[$role] = sprintf('No token source met confidence threshold (>= %s) for role %s', self::CONFIDENCE_THRESHOLD, $role);
            }
        }

        return [
            'winners' => $winners,
            'warnings' => $warnings,
        ];
    }

    /**
     * Generate CSS string emitting winning tokens in @layer ps.host { .ps-root { ... } }.
     */
    public function generate_css(): string {
        $resolution = $this->resolve();
        $winners = $resolution['winners'];

        if (empty($winners)) {
            return '';
        }

        $declarations = [];
        foreach ($winners as $record) {
            $varName = $record->getCssVariableName();
            $val = $record->getValue();
            $declarations[] = "{$varName}: {$val};";
        }

        // Allow developers to filter the resolved token declarations
        if (function_exists('apply_filters')) {
            $declarations = apply_filters('wpdev_chameleon_host_token_declarations', $declarations, $winners);
        }

        return "@layer ps.host {\n  .ps-root {\n    " . implode("\n    ", $declarations) . "\n  }\n}\n";
    }

    private function sanitize_for_role(string $role, string $val): ?string {
        if (strncmp($role, 'color.', 6) === 0) {
            return Sanitizer::sanitize_color($val);
        }
        if (strncmp($role, 'radius.', 7) === 0) {
            return Sanitizer::sanitize_length($val);
        }
        if (strncmp($role, 'font.', 5) === 0) {
            return Sanitizer::sanitize_font_family($val);
        }
        return Sanitizer::sanitize_length($val);
    }
}
