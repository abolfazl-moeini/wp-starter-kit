<?php
/**
 * Admin page registration helpers (context-aware).
 *
 * @package WPDevFramework\Core
 * @since   2.7.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Map a registration context to Base_Admin_Page supported_panels keys.
 *
 * @since 2.7.0
 *
 * @param string $context    admin|network|both.
 * @param string $capability Required capability for each panel hook.
 * @return array<string, string>
 */
function wpdev_admin_page_context_to_supported_panels( $context, $capability ) {

	$context    = sanitize_key( (string) $context );
	$capability = (string) $capability;

	if ( '' === $capability ) {
		$capability = 'manage_options';
	}

	if ( 'both' === $context ) {
		return array(
			'admin_menu'         => $capability,
			'network_admin_menu' => $capability,
		);
	}

	if ( 'network' === $context ) {
		return array(
			'network_admin_menu' => $capability,
		);
	}

	return array(
		'admin_menu' => $capability,
	);

} // end wpdev_admin_page_context_to_supported_panels;

/**
 * Build registration overrides for an admin page class.
 *
 * @since 2.7.0
 *
 * @param array<string, mixed> $args {
 *     @type string $parent              Parent menu slug.
 *     @type string $type                menu|submenu.
 *     @type string $context             admin|network|both.
 *     @type string $capability          Capability when context is set.
 *     @type string $highlight_menu_slug Hidden page highlight slug.
 *     @type array  $supported_panels    Raw supported_panels (overrides context).
 * }
 * @return array<string, mixed>
 */
function wpdev_admin_page_build_overrides( array $args ) {

	$overrides = array();

	if ( ! empty( $args['parent'] ) ) {
		$overrides['parent'] = (string) $args['parent'];
	}

	if ( ! empty( $args['type'] ) ) {
		$overrides['type'] = (string) $args['type'];
	}

	if ( ! empty( $args['highlight_menu_slug'] ) ) {
		$overrides['highlight_menu_slug'] = (string) $args['highlight_menu_slug'];
	}

	if ( ! empty( $args['supported_panels'] ) && is_array( $args['supported_panels'] ) ) {
		$overrides['supported_panels'] = $args['supported_panels'];
	} elseif ( ! empty( $args['context'] ) ) {
		$overrides['supported_panels'] = wpdev_admin_page_context_to_supported_panels(
			$args['context'],
			$args['capability'] ?? 'manage_options'
		);
	}

	if ( isset( $args['position'] ) ) {
		$overrides['position'] = (int) $args['position'];
	}

	if ( isset( $args['fold_menu'] ) ) {
		$overrides['fold_menu'] = (bool) $args['fold_menu'];
	}

	if ( isset( $args['hide_admin_notices'] ) ) {
		$overrides['hide_admin_notices'] = (bool) $args['hide_admin_notices'];
	}

	return $overrides;

} // end wpdev_admin_page_build_overrides;

/**
 * Register a production admin page class with optional menu/context overrides.
 *
 * Instantiates the existing List/Edit/Settings admin page on wpdev_admin_pages — no duplicate
 * page implementation. Production network registrations remain unchanged when called with
 * network/both context at default priority; playground parity uses admin context + parent wpdev.
 * Network-only modules may register twice (network + site admin instances); list-table ajax ids are shared.
 *
 * @since 2.7.0
 *
 * @param string               $class_name Fully-qualified admin page class.
 * @param array<string, mixed> $args       See wpdev_admin_page_build_overrides().
 * @param int                  $priority   wpdev_admin_pages hook priority.
 * @return void
 */
function wpdev_register_admin_page( $class_name, array $args = array(), $priority = 100 ) {

	$class_name = (string) $class_name;

	if ( '' === $class_name ) {
		return;
	}

	$overrides = wpdev_admin_page_build_overrides( $args );

	$register = static function () use ( $class_name, $overrides, $args ) {

		if ( ! class_exists( $class_name ) ) {
			return;
		}

		if ( ! empty( $args['module_id'] ) && function_exists( 'wpdev_module_is_loaded' ) ) {
			$module_id = sanitize_key( (string) $args['module_id'] );

			if ( '' !== $module_id && ! wpdev_module_is_loaded( $module_id ) ) {
				return;
			}
		}

		new $class_name( $overrides );

	};

	// Playground_Parity_Registry calls this from inside wpdev_admin_pages; run now or the hook never fires.
	if ( function_exists( 'doing_action' ) && doing_action( 'wpdev_admin_pages' ) ) {
		$register();
		return;
	}

	add_action( 'wpdev_admin_pages', $register, (int) $priority );

} // end wpdev_register_admin_page;
