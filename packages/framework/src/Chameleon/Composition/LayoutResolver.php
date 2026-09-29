<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Composition;

use WPDev\Chameleon\Contracts\DashboardContextV1;

/**
 * LayoutResolver: Evaluates the Canonical Composition Graph (G_v) against the
 * Tenant Delta Manifest (P_c) to produce G_effective at SSR runtime (SPEC §3.4).
 */
final class LayoutResolver {
    /**
     * Resolve patches onto the canonical tree.
     *
     * @param array<string, array{sections: array<string, array<string, mixed>>}> $canonical
     * @param array<int, array<string, mixed>> $patches
     * @return array<string, array{sections: array<string, array<string, mixed>>}>
     */
    public static function resolve(array $canonical, array $patches): array {
        $tree = $canonical;
        $injected_slots = [];

        foreach ($patches as $patch) {
            $op = (string) ($patch['op'] ?? '');

            switch ($op) {
                case 'hide':
                    self::apply_hide($tree, (string) ($patch['target'] ?? ''));
                    break;

                case 'move':
                    self::apply_move(
                        $tree,
                        (string) ($patch['target'] ?? ''),
                        (string) ($patch['to_region'] ?? ''),
                        (int) ($patch['new_weight'] ?? 10)
                    );
                    break;

                case 'replace':
                    self::apply_replace(
                        $tree,
                        (string) ($patch['target'] ?? ''),
                        $patch['renderer'] ?? null,
                        (array) ($patch['requires'] ?? [])
                    );
                    break;

                case 'inject':
                    self::apply_inject($tree, $injected_slots, $patch);
                    break;

                default:
                    // Unknown op fails soft (SPEC §3.7)
                    if (function_exists('_doing_it_wrong')) {
                        _doing_it_wrong(__METHOD__, sprintf('Unknown Chameleon manifest operation: %s', esc_html($op)), '2.0.0');
                    }
                    break;
            }
        }

        // Attach resolved slot injections into corresponding section slots
        self::attach_injected_slots($tree, $injected_slots);

        // Sort sections within each region by weight ascending
        foreach ($tree as $region_id => &$region_data) {
            if (!empty($region_data['sections'])) {
                uasort($region_data['sections'], function (array $a, array $b): int {
                    return ($a['weight'] ?? 10) <=> ($b['weight'] ?? 10);
                });
            }
        }

        return $tree;
    }

    /**
     * Render the resolved composition tree to output buffer.
     *
     * @param array<string, array{sections: array<string, array<string, mixed>>}> $resolved_tree
     * @param DashboardContextV1 $context
     * @return void
     */
    public static function render_tree(array $resolved_tree, DashboardContextV1 $context): void {
        foreach ($resolved_tree as $region_id => $region) {
            if (empty($region['sections'])) {
                continue;
            }

            echo sprintf("<div class='ps-region ps-region-%s' data-region='%s'>\n", esc_attr($region_id), esc_attr($region_id));

            foreach ($region['sections'] as $section_id => $section) {
                echo sprintf("<div class='ps-section ps-section-%s' data-section='%s'>\n", esc_attr($section_id), esc_attr($section_id));

                if (is_callable($section['renderer'] ?? null)) {
                    FailSoftBoundary::execute($section['renderer'], $context, "section:{$section_id}");
                }

                // Render any slots associated with this section
                if (!empty($section['injected_items'])) {
                    uasort($section['injected_items'], fn($a, $b) => ($a['weight'] ?? 10) <=> ($b['weight'] ?? 10));
                    foreach ($section['injected_items'] as $item) {
                        if (is_callable($item['renderer'] ?? null)) {
                            FailSoftBoundary::execute($item['renderer'], $context, "slot_item:{$item['id']}");
                        }
                    }
                }

                echo "</div>\n";
            }

            echo "</div>\n";
        }
    }

    private static function apply_hide(array &$tree, string $target): void {
        [$type, $id] = array_pad(explode(':', $target, 2), 2, '');
        if ($type === 'section') {
            foreach ($tree as &$region) {
                if (isset($region['sections'][$id])) {
                    unset($region['sections'][$id]);
                }
            }
        }
    }

    private static function apply_move(array &$tree, string $target, string $to_region, int $new_weight): void {
        [$type, $id] = array_pad(explode(':', $target, 2), 2, '');
        if ($type !== 'section' || !isset($tree[$to_region])) {
            return;
        }

        $section_data = null;
        foreach ($tree as &$region) {
            if (isset($region['sections'][$id])) {
                $section_data = $region['sections'][$id];
                unset($region['sections'][$id]);
                break;
            }
        }

        if ($section_data !== null) {
            $section_data['weight'] = $new_weight;
            $tree[$to_region]['sections'][$id] = $section_data;
        }
    }

    private static function apply_replace(array &$tree, string $target, $renderer, array $requires): void {
        [$type, $id] = array_pad(explode(':', $target, 2), 2, '');
        if ($type !== 'section' || !is_callable($renderer)) {
            return;
        }

        foreach ($tree as &$region) {
            if (isset($region['sections'][$id])) {
                $region['sections'][$id]['renderer'] = $renderer;
                if (!empty($requires)) {
                    $region['sections'][$id]['requires'] = $requires;
                }
                break;
            }
        }
    }

    private static function apply_inject(array &$tree, array &$injected_slots, array $patch): void {
        $slot = (string) ($patch['slot'] ?? '');
        $id = (string) ($patch['id'] ?? '');

        // Contract validation: Injected IDs must match ^[a-z0-9_.-]+$ (SPEC §3.7)
        if (!preg_match('/^[a-z0-9_.-]+$/i', $id) || !preg_match('/^[a-z0-9_.-]+$/i', $slot)) {
            if (function_exists('_doing_it_wrong')) {
                _doing_it_wrong(__METHOD__, sprintf("Invalid slot/id characters in Chameleon patch: '%s' / '%s'", esc_html($slot), esc_html($id)), '2.0.0');
            }
            return;
        }

        if (!is_callable($patch['renderer'] ?? null)) {
            return;
        }

        $injected_slots[$slot][] = [
            'id'       => $id,
            'weight'   => (int) ($patch['weight'] ?? 10),
            'renderer' => $patch['renderer'],
            'requires' => (array) ($patch['requires'] ?? []),
        ];
    }

    private static function attach_injected_slots(array &$tree, array $injected_slots): void {
        $all_known_slots = [];

        foreach ($tree as &$region) {
            foreach ($region['sections'] as &$section) {
                $slots = (array) ($section['slots'] ?? []);
                foreach ($slots as $slot_name) {
                    $all_known_slots[$slot_name] = true;
                    if (!empty($injected_slots[$slot_name])) {
                        if (!isset($section['injected_items'])) {
                            $section['injected_items'] = [];
                        }
                        foreach ($injected_slots[$slot_name] as $item) {
                            $section['injected_items'][] = $item;
                        }
                    }
                }
            }
        }

        // Detect unknown slot names and warn in WP_DEBUG (Plan §2.2)
        foreach (array_keys($injected_slots) as $injected_slot_name) {
            if (!isset($all_known_slots[$injected_slot_name])) {
                $message = sprintf("Unknown Chameleon slot injection target: '%s'", esc_html($injected_slot_name));
                if (function_exists('_doing_it_wrong')) {
                    _doing_it_wrong(__METHOD__, $message, '2.0.0');
                }
                $is_debug = (defined('WP_DEBUG') && WP_DEBUG) ||
                            (defined('WP_ENVIRONMENT_TYPE') && WP_ENVIRONMENT_TYPE !== 'production');
                if ($is_debug) {
                    echo sprintf("<!-- chameleon: unknown slot '%s' -->\n", esc_html($injected_slot_name));
                }
            }
        }
    }
}
