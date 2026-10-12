<?php
/**
 * Sandbox-aware bootstrap decisions.
 *
 * @package WPDev
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'wpdev_should_skip_heavy_bootstrap' ) ) {
	/**
	 * Whether the framework should avoid its expensive bootstrap path.
	 *
	 * WordPress defines WP_SANDBOX_SCRAPING while testing a plugin during
	 * activation. The filter provides a deterministic seam for tests and
	 * controlled hosts without changing WordPress's global constant.
	 *
	 * @return bool
	 */
	function wpdev_should_skip_heavy_bootstrap() {
		$skip = defined( 'WP_SANDBOX_SCRAPING' ) && WP_SANDBOX_SCRAPING;

		/**
		 * Filter whether to skip Action Scheduler, modules, and the singleton.
		 *
		 * @param bool $skip Whether the current request is a sandbox scrape.
		 */
		return (bool) apply_filters( 'wpdev_should_skip_heavy_bootstrap', $skip );
	}
}
