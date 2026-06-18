<?php
/**
 * Generic module manager / admin-page helpers (replaces functions-waas.php).
 *
 * @package WPDevFramework\Core
 * @since   2.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * BC: honor legacy wpdev_waas_module_enabled for wpdev-* module ids.
 *
 * @since 2.8.0
 */
add_filter(
	'wpdev_module_enabled',
	static function ( $enabled, $module_id ) {
		if ( ! $enabled || 0 !== strpos( (string) $module_id, 'wpdev-' ) ) {
			return $enabled;
		}

		/**
		 * Legacy filter from the WaaS era (renamed hook; same semantics).
		 *
		 * @param bool   $enabled   Whether the module is enabled.
		 * @param string $module_id Module slug.
		 */
		return (bool) apply_filters( 'wpdev_domain_module_enabled', $enabled, $module_id );
	},
	9,
	2
);

/**
 * Register admin page classes for a module on wpdev_admin_pages.
 *
 * @since 2.8.0
 *
 * @param string   $module_id    Module slug.
 * @param string[] $page_classes Admin page FQCNs.
 * @param int      $priority     Hook priority.
 * @param array<string, array<string, mixed>> $overrides_map Optional overrides.
 * @return void
 */
function wpdev_register_module_admin_pages( $module_id, array $page_classes, $priority = 10, array $overrides_map = array() ) {

	add_action(
		'wpdev_admin_pages',
		static function () use ( $module_id, $page_classes, $overrides_map ) {

			if ( ! apply_filters( 'wpdev_module_enabled', true, $module_id ) ) {
				return;
			}

			foreach ( $page_classes as $class_name ) {
				if ( ! class_exists( $class_name ) ) {
					continue;
				}

				$overrides = $overrides_map[ $class_name ] ?? array();

				new $class_name( is_array( $overrides ) ? $overrides : array() );
			}

			do_action( 'wpdev_module_admin_pages_registered', $module_id, $page_classes );
		},
		$priority
	);

} // end wpdev_register_module_admin_pages;

/**
 * Boot a manager from a module on wpdev_load.
 *
 * @since 2.8.0
 *
 * @param string      $module_id     Module slug.
 * @param string      $manager_class Manager FQCN.
 * @param string|null $manager_path  Optional require path.
 * @param int         $priority      Hook priority.
 * @return void
 */
function wpdev_boot_module_manager( $module_id, $manager_class, $manager_path = null, $priority = 5 ) {

	add_action(
		'wpdev_load',
		static function () use ( $module_id, $manager_class, $manager_path ) {

			if ( ! apply_filters( 'wpdev_module_enabled', true, $module_id ) ) {
				return;
			}

			if ( $manager_path && is_readable( $manager_path ) ) {
				require_once $manager_path;
			}

			if ( class_exists( $manager_class ) ) {
				$manager_class::get_instance();
			}
		},
		$priority
	);

} // end wpdev_boot_module_manager;

/**
 * Whether a module owns manager boot for the given id.
 *
 * @since 2.8.0
 *
 * @param string $module_id Module slug.
 * @return bool
 */
function wpdev_module_boots_managers( $module_id ) {

	return (bool) apply_filters( 'wpdev_module_enabled', true, $module_id );

} // end wpdev_module_boots_managers;
