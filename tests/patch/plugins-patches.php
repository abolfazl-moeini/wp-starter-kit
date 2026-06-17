<?php
/**
 * Patch configuration for `tests/patch/apply-patches.php`.
 *
 * Returned shape: flat `name => /absolute/path/to/patch` map. The unified
 * `WPDev\TestTools\Patch\Cli::init($root, $config)` iterates this map and
 * applies each patch under `$root` using `git apply`.
 *
 * The wp-starter-kit starter ships an empty config — downstream projects
 * add their own entries here.
 *
 * Example (Elementor patch from sample-plugin, do NOT add to starter):
 *
 *     return [
 *         'elementor' => __DIR__ . '/elementor.patch',
 *     ];
 *
 * @see /Users/moeini/Documents/ideas/extend-kit/plan.md §6.0
 */

return [
    // 'elementor' => __DIR__ . '/elementor.patch',
];
