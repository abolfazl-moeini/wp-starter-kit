<?php
/**
 * View / template helper functions.
 *
 * @package WPDevFramework\Core\View
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Alias function to be used on the templates
 *
 * @param  string       $view Template to be get.
 * @param  array        $args Arguments to be parsed and made available inside the template file.
 * @param string|false $default_view View to be used if the view passed is not found. Used as fallback.
 * @return void
 */
function wpdev_get_template($view, $args = array(), $default_view = false) {

	/**
	 * Allow plugin developers to add extra variable to the render context globally.
	 *
	 * @since 2.0.0
	 * @param array $args Array containing variables passed by the render call.
	 * @param string $view Name of the view to be rendered.
	 * @param string $default_view Name of the fallback_view
	 * @return array
	 */
	$args = apply_filters('wpdev_render_vars', $args, $view, $default_view);

	$dir      = $args['dir'] ?? wpdev_path( 'views' );
	$template = "$dir/$view.php";

	$module_template = class_exists( '\WPDevFramework\Core\Module_View_Registry' )
		? \WPDevFramework\Core\Module_View_Registry::locate( $view )
		: '';

	if ( $module_template ) {
		$template = $module_template;
	}

	// Make passed variables available
	if (is_array($args)) {

		extract($args); // phpcs:ignore

	} // end if;

	/**
	 * Allows developers to add additional folders to the replaceable list.
	 *
	 * Be careful, as allowing additional folders might cause
	 * out-of-date copies to be loaded instead of the WPDev versions.
	 *
	 * @since 2.0.0
	 * @param array $replaceable_views List of allowed folders.
	 * @return array
	 */
	$replaceable_views = apply_filters('wpdev_view_override_replaceable_views', array(
		'signup',
		'emails',
		'forms',
		'checkout'
	));

	/*
		* Only allow template for emails and signup for now
		*/
	if (preg_match('/(' . implode('\/?|', $replaceable_views) . '\/?' . ')\w+/', $view)) {

		$template = apply_filters('wpdev_view_override', $template, $view, $default_view);

	} // end if;

	if ( ! file_exists( $template ) && $default_view ) {

		$template = wpdev_path( "views/$default_view.php" );

		$module_default = class_exists( '\WPDevFramework\Core\Module_View_Registry' )
			? \WPDevFramework\Core\Module_View_Registry::locate( $default_view )
			: '';

		if ( $module_default ) {
			$template = $module_default;
		}
	} // end if;

	/**
	 * Filter resolved template path before include.
	 *
	 * @since 2.5.0
	 *
	 * @param string $template Absolute path.
	 * @param string $view     View slug.
	 */
	$template = (string) apply_filters( 'wpdev_view_locate', $template, $view );

	if ( ! is_readable( $template ) ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_trigger_error
			trigger_error(
				sprintf( 'WPDev view not found: %s (resolved: %s)', $view, $template ),
				E_USER_WARNING
			);
		}
		return;
	}

	// Load our view
	include $template;

} // end wpdev_get_template;

/**
 * Alias function to be used on the templates;
 * Rather than directly including the template, it returns the contents inside a variable
 *
 * @param  string       $view Template to be get.
 * @param  array        $args Arguments to be parsed and made available inside the template file.
 * @param string|false $default_view View to be used if the view passed is not found. Used as fallback.
 * @return string
 */
function wpdev_get_template_contents($view, $args = array(), $default_view = false) {

	ob_start();

		wpdev_get_template($view, $args, $default_view); // phpcs:ignore

	return ob_get_clean();

} // end wpdev_get_template_contents;

/**
 * Render a WPDev view template (canonical API — J-004).
 *
 * @since 2.5.0
 *
 * @param string               $view         View path relative to views/ or module registry.
 * @param array<string, mixed> $args         Template variables.
 * @param string|false         $default_view Fallback view path.
 * @return void
 */
function wpdev_view( $view, $args = array(), $default_view = false ) {

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'view' ) ) {
		wpdev_services( 'view' )->render( $view, $args, $default_view );
		return;
	}

	wpdev_get_template( $view, $args, $default_view );

} // end wpdev_view;

/**
 * Render a view and return HTML (canonical API — J-004).
 *
 * @since 2.5.0
 *
 * @param string               $view         View path.
 * @param array<string, mixed> $args         Template variables.
 * @param string|false         $default_view Fallback view path.
 * @return string
 */
function wpdev_view_contents( $view, $args = array(), $default_view = false ) {

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'view' ) ) {
		return wpdev_services( 'view' )->render_contents( $view, $args, $default_view );
	}

	return wpdev_get_template_contents( $view, $args, $default_view );

} // end wpdev_view_contents;

/**
 * Resolve absolute path for a view slug.
 *
 * @since 2.5.0
 *
 * @param string $view View slug.
 * @return string
 */
function wpdev_view_locate( $view ) {

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'view' ) ) {
		return wpdev_services( 'view' )->locate( $view );
	}

	$module_template = class_exists( '\WPDevFramework\Core\Module_View_Registry' )
		? \WPDevFramework\Core\Module_View_Registry::locate( $view )
		: '';

	if ( $module_template ) {
		return $module_template;
	}

	return wpdev_path( 'views/' . $view . '.php' );

} // end wpdev_view_locate;
