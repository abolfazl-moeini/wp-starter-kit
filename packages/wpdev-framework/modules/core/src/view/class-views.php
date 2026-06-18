<?php
/**
 * Default API hooks.
 *
 * @package WPDev
 * @subpackage API
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds a lighter ajax option to WPDev.
 *
 * @since 1.9.14
 */
class Views {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Adds hooks to be added at the original instantiation.
	 *
	 * @since 1.9.0
	 */
	public function init() {

		add_filter('wpdev_view_override', array($this, 'view_override'), 10, 3);

	} // end init;

	/**
	 * Custom locate template function that allows us to retrieve user overridden templates.
	 *
	 * This custom function is necessary instead of using locate_template because we need to retrieve
	 * templates while we still don't have the STYLESHEETPATH constant defined nor the TEMPLATEPATH constant.
	 *
	 * @todo Can this be improved? Do we need to re-check the Template Path in here? Not sure...
	 *
	 * @since 1.9.0
	 * @param string|array $template_names Template file(s) to search for, in order.
	 * @param bool         $load           If true the template file will be loaded if it is found.
	 * @param bool         $require_once   Whether to require_once or require. Default true. Has no effect if $load is false.
	 * @return string The template filename if one is located.
	 */
	public function custom_locate_template($template_names, $load = false, $require_once = true) {

		is_multisite() && switch_to_blog(get_current_site()->blog_id);

		$stylesheet_path = get_stylesheet_directory();

		is_multisite() && restore_current_blog();

		$located = '';

		foreach ((array) $template_names as $template_name) {

			if (!$template_name) {

				continue;

			} // end if;

			if (file_exists( $stylesheet_path . '/' . $template_name)) {

				$located = $stylesheet_path . '/' . $template_name;

				break;

			} elseif (file_exists(get_template_directory() . '/' . $template_name)) {

				$located = get_template_directory() . '/' . $template_name;

				break;

			} elseif (file_exists(ABSPATH . WPINC . '/theme-compat/' . $template_name)) {

				$located = ABSPATH . WPINC . '/theme-compat/' . $template_name;

				break;

			} // end if;

		} // end foreach;

		if ($load && '' !== $located) {

			load_template($located, $require_once);

		} // end if;

		return $located;

	} // end custom_locate_template;

	/**
	 * Check if an alternative view exists and override
	 *
	 * @param  string $original_path The original path of the view.
	 * @param  string $view          View path.
	 * @return string  The new path.
	 */
	public function view_override($original_path, $view) {

		$found = $this->custom_locate_template("wpdev/$view.php");

		return $found ? $found : $original_path;

	} // end view_override;

} // end class Views;
