<?php
/**
 * GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: contract/components.manifest.json (hash: dc618883de6dda32)
 * Run: node packages/polaris-stack/tools/generate-contracts.mjs
 *
 * @package WPDev\Chameleon\Generated
 */

namespace WPDev\Chameleon\Generated;

final class ClassNames {
    public const ALERT = 'ps-alert';
    public const ALERT_TONE_DANGER = 'ps-alert-danger';
    public const ALERT_TONE_INFO = 'ps-alert-info';
    public const ALERT_TONE_SUCCESS = 'ps-alert-success';
    public const ALERT_TONE_WARNING = 'ps-alert-warning';
    public const BADGE = 'ps-badge';
    public const BADGE_TONE_DANGER = 'ps-badge-danger';
    public const BADGE_TONE_INFO = 'ps-badge-info';
    public const BADGE_TONE_NEUTRAL = 'ps-badge-neutral';
    public const BADGE_TONE_SUCCESS = 'ps-badge-success';
    public const BADGE_TONE_WARNING = 'ps-badge-warning';
    public const BOX = 'ps-box';
    public const BUTTON = 'ps-button';
    public const BUTTON_GHOST = 'ps-button-ghost';
    public const BUTTON_ICON = 'ps-button-icon';
    public const BUTTON_ICON_ONLY = 'ps-button-icon-only';
    public const BUTTON_LOADING = 'ps-button-loading';
    public const BUTTON_SIZE_LG = 'ps-button-lg';
    public const BUTTON_SIZE_MD = 'ps-button-md';
    public const BUTTON_SIZE_SM = 'ps-button-sm';
    public const BUTTON_SOFT = 'ps-button-soft';
    public const BUTTON_SOLID = 'ps-button-solid';
    public const BUTTON_WIDTH_BLOCK = 'ps-button-block';
    public const CARD = 'ps-card';
    public const CARD_ELEVATION_1 = 'ps-card-elevation-1';
    public const CARD_ELEVATION_2 = 'ps-card-elevation-2';
    public const CARD_ELEVATION_3 = 'ps-card-elevation-3';
    public const CARD_ELEVATION_4 = 'ps-card-elevation-4';
    public const CARD_INTERACTIVE = 'ps-card-interactive';
    public const CENTER = 'ps-center';
    public const CLUSTER = 'ps-cluster';
    public const CONTAINER = 'ps-container';
    public const COVER = 'ps-cover';
    public const DASHBOARD_CONTAINER = 'ps-dashboard-container';
    public const DETAILS = 'ps-details';
    public const DETAILS_CONTENT = 'ps-details-content';
    public const DIVIDER = 'ps-divider';
    public const FRAME = 'ps-frame';
    public const GRID = 'ps-grid';
    public const HEADING = 'ps-heading';
    public const HEADING_1 = 'ps-heading-1';
    public const HEADING_2 = 'ps-heading-2';
    public const HEADING_3 = 'ps-heading-3';
    public const HEADING_4 = 'ps-heading-4';
    public const HEADING_5 = 'ps-heading-5';
    public const HEADING_6 = 'ps-heading-6';
    public const IMPOSTER = 'ps-imposter';
    public const IMPOSTER_FIXED = 'ps-imposter-fixed';
    public const KBD = 'ps-kbd';
    public const MODAL = 'ps-modal';
    public const MODAL_BODY = 'ps-modal-body';
    public const MODAL_DIALOG = 'ps-modal-dialog';
    public const MODAL_FALLBACK_OPEN = 'ps-modal-fallback-open';
    public const MODAL_FOOTER = 'ps-modal-footer';
    public const MODAL_HEADER = 'ps-modal-header';
    public const POPOVER = 'ps-popover';
    public const REEL = 'ps-reel';
    public const ROOT = 'ps-root';
    public const SCOPE = 'ps-scope';
    public const SIDEBAR = 'ps-sidebar';
    public const SPINNER = 'ps-spinner';
    public const STACK = 'ps-stack';
    public const SUMMARY = 'ps-summary';
    public const SUMMARY_TITLE = 'ps-summary-title';
    public const SWITCHER = 'ps-switcher';
    public const TEXT = 'ps-text';
    public const TEXT_SIZE_BASE = 'ps-text-base';
    public const TEXT_SIZE_LG = 'ps-text-lg';
    public const TEXT_SIZE_SM = 'ps-text-sm';
    public const TEXT_SIZE_XL = 'ps-text-xl';
    public const TEXT_SIZE_XS = 'ps-text-xs';
    public const TEXT_TONE_MUTED = 'ps-text-tone-muted';
    public const TEXT_TONE_STRONG = 'ps-text-tone-strong';
    public const TEXT_TONE_SUBTLE = 'ps-text-tone-subtle';
    public const TEXT_TRUNCATE = 'ps-text-truncate';
    public const TEXT_WEIGHT_BOLD = 'ps-text-weight-bold';
    public const TEXT_WEIGHT_MEDIUM = 'ps-text-weight-medium';
    public const TEXT_WEIGHT_NORMAL = 'ps-text-weight-normal';
    public const TEXT_WEIGHT_SEMIBOLD = 'ps-text-weight-semibold';

    /**
     * Component taxonomy and rules catalog.
     *
     * @var array<string, mixed>
     */
    private static $catalog = [
        'button' => [
            'root' => 'ps-button',
            'variants' => [
                'variant' => [
                    'ps-button-solid',
                    'ps-button-soft',
                    'ps-button-ghost'
                ],
                'size' => [
                    'ps-button-sm',
                    'ps-button-md',
                    'ps-button-lg'
                ],
                'width' => [
                    'ps-button-block'
                ]
            ],
            'parts' => [
                'ps-button-icon',
                'ps-button-icon-only'
            ],
            'states' => [
                'ps-button-loading'
            ]
        ],
        'card' => [
            'root' => 'ps-card',
            'variants' => [
                'elevation' => [
                    'ps-card-elevation-1',
                    'ps-card-elevation-2',
                    'ps-card-elevation-3',
                    'ps-card-elevation-4'
                ],
                'interactive' => [
                    'ps-card-interactive'
                ]
            ],
            'parts' => [

            ],
            'states' => [

            ]
        ],
        'badge' => [
            'root' => 'ps-badge',
            'variants' => [
                'tone' => [
                    'ps-badge-info',
                    'ps-badge-success',
                    'ps-badge-warning',
                    'ps-badge-danger',
                    'ps-badge-neutral'
                ]
            ],
            'parts' => [

            ],
            'states' => [

            ]
        ],
        'alert' => [
            'root' => 'ps-alert',
            'variants' => [
                'tone' => [
                    'ps-alert-info',
                    'ps-alert-success',
                    'ps-alert-warning',
                    'ps-alert-danger'
                ]
            ],
            'parts' => [

            ],
            'states' => [

            ]
        ],
        'heading' => [
            'root' => 'ps-heading',
            'variants' => [
                'level' => [
                    'ps-heading-1',
                    'ps-heading-2',
                    'ps-heading-3',
                    'ps-heading-4',
                    'ps-heading-5',
                    'ps-heading-6'
                ]
            ],
            'parts' => [

            ],
            'states' => [

            ]
        ],
        'text' => [
            'root' => 'ps-text',
            'variants' => [
                'size' => [
                    'ps-text-xs',
                    'ps-text-sm',
                    'ps-text-base',
                    'ps-text-lg',
                    'ps-text-xl'
                ],
                'weight' => [
                    'ps-text-weight-normal',
                    'ps-text-weight-medium',
                    'ps-text-weight-semibold',
                    'ps-text-weight-bold'
                ],
                'tone' => [
                    'ps-text-tone-muted',
                    'ps-text-tone-subtle',
                    'ps-text-tone-strong'
                ],
                'overflow' => [
                    'ps-text-truncate'
                ]
            ],
            'parts' => [

            ],
            'states' => [

            ]
        ],
        'spinner' => [
            'root' => 'ps-spinner',
            'variants' => [

            ],
            'parts' => [

            ],
            'states' => [

            ]
        ],
        'kbd' => [
            'root' => 'ps-kbd',
            'variants' => [

            ],
            'parts' => [

            ],
            'states' => [

            ]
        ],
        'divider' => [
            'root' => 'ps-divider',
            'variants' => [

            ],
            'parts' => [

            ],
            'states' => [

            ]
        ]
    ];

    /**
     * Compose a standardized ps-* class string for a component.
     *
     * @param string $component Component name (e.g. 'button', 'card', 'badge').
     * @param array<string, string> $modifiers Modifier map (e.g. ['variant' => 'solid', 'size' => 'md']).
     * @param string $extra Additional classes (e.g. 'custom-wp-class').
     * @return string Validated class string.
     */
    public static function compose(string $component, array $modifiers = [], string $extra = ''): string {
        if (!isset(self::$catalog[$component])) {
            if (function_exists('_doing_it_wrong')) {
                _doing_it_wrong(__METHOD__, sprintf('Unknown Polaris component "%s"', esc_html($component)), '1.0.0');
            }
            return trim($extra);
        }

        $conf = self::$catalog[$component];
        $classes = [$conf['root']];

        foreach ($modifiers as $axis => $value) {
            if (!isset($conf['variants'][$axis])) {
                if (function_exists('_doing_it_wrong')) {
                    _doing_it_wrong(__METHOD__, sprintf('Unknown variant axis "%s" for component "%s"', esc_html($axis), esc_html($component)), '1.0.0');
                }
                continue;
            }

            $candidate = $conf['root'] . '-' . $value;
            // Handle specialized axes
            if ($component === 'card' && $axis === 'elevation') {
                $candidate = 'ps-card-elevation-' . $value;
            } elseif ($component === 'heading') {
                $candidate = 'ps-heading-' . $value;
            } elseif ($component === 'text') {
                if ($axis === 'weight') {
                    $candidate = 'ps-text-weight-' . $value;
                } elseif ($axis === 'tone') {
                    $candidate = 'ps-text-tone-' . $value;
                } else {
                    $candidate = 'ps-text-' . $value;
                }
            }

            if (in_array($candidate, $conf['variants'][$axis], true)) {
                $classes[] = $candidate;
            } elseif (function_exists('_doing_it_wrong')) {
                _doing_it_wrong(__METHOD__, sprintf('Invalid value "%s" for axis "%s" on component "%s"', esc_html($value), esc_html($axis), esc_html($component)), '1.0.0');
            }
        }

        if ($extra !== '') {
            $classes[] = trim($extra);
        }

        return implode(' ', array_filter($classes));
    }
}
