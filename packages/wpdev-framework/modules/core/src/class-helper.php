<?php
/**
 * WPDev helper methods for including and rendering files, assets, etc
 *
 * @package WPDev
 * @subpackage Helper
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev helper methods for including and rendering files, assets, etc
 *
 * @since 2.0.0
 */
class Helper {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Returns the full path to the plugin folder
	 *
	 * @since 0.0.1
	 * @param string $dir Path relative to the plugin root you want to access.
	 * @return string
	 */
	public function path($dir) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_path');

		return wpdev_path($dir);

	} // end path;

	/**
	 * Returns the URL to the plugin folder.
	 *
	 * @since 0.0.1
	 * @param string $dir Path relative to the plugin root you want to access.
	 * @return string
	 */
	public function url($dir) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_url');

		return wpdev_url($dir);

	} // end url;

	/**
	 * Shorthand for url('assets/img'). Returns the URL for assets inside the assets folder.
	 *
	 * @since 0.0.1
	 * @param string $asset Asset file name with the extension.
	 * @param string $assets_dir Assets sub-directory. Defaults to 'img'.
	 * @param string $base_dir   Base dir. Defaults to 'assets'.
	 * @return string
	 */
	public function get_asset($asset, $assets_dir = 'img', $base_dir = 'assets') {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_get_asset');

		return wpdev_get_asset($asset, $assets_dir, $base_dir);

	} // end get_asset;

	/**
	 * Renders a view file from the view folder.
	 *
	 * @since 0.0.1
	 * @param string       $view View file to render. Do not include the .php extension.
	 * @param boolean      $vars Key => Value pairs to be made available as local variables inside the view scope.
	 * @param string|false $default_view View to be used if the view passed is not found. Used as fallback.
	 * @return void
	 */
	public function render($view, $vars = false, $default_view = false) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_get_template');

		wpdev_get_template($view, $vars, $default_view);

	} // end render;

	/**
	 * This function return 'slugfied' options terms to be used as options ids.
	 *
	 * @since 0.0.1
	 * @param string $term Returns a string based on the term and this plugin slug.
	 * @return string
	 */
	public function slugfy($term) {

		// even the name is wrong, wtf!

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_slugify');

		return wpdev_slugify($term);

	} // end slugfy;

	/**
	 * Get the value of a slugified network option
	 *
	 * @since 1.9.6
	 * @param string $option_name Option name.
	 * @param mixed  $default The default value.
	 * @return mixed
	 */
	public function get_option($option_name = 'settings', $default = array()) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_get_option');

		return wpdev_get_option($option_name, $default);

	} // end get_option;

	/**
	 * Save slugified network option.
	 *
	 * @since 1.9.6
	 * @param string $option_name The option name to save.
	 * @param mixed  $value       The new value of the option.
	 * @return boolean
	 */
	public function save_option($option_name = 'settings', $value = false) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_save_option');

		return wpdev_save_option($option_name, $value);

	} // end save_option;

	/**
	 * Delete slugified network option
	 *
	 * @since 1.9.6
	 * @param string $option_name The option name to delete.
	 * @return boolean
	 */
	public function delete_option($option_name) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_delete_option');

		return wpdev_delete_option($option_name);

	} // end delete_option;

	/**
	 * Gets the URL for the folders created with maybe_create_folder().
	 *
	 * @see $this->maybe_create_folder()
	 * @since 2.0.0
	 *
	 * @param string $folder The name of the folder.
	 * @return string
	 */
	public function get_folder_url($folder) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_get_folder_url');

		return wpdev_get_folder_url($folder);

	} // end get_folder_url;

	/**
	 * Creates a WPDev folder inside the uploads folder. Returns the path to the folder.
	 *
	 * @since 2.0.0
	 *
	 * @deprecated
	 * @param string $folder Name of the folder.
	 * @return string
	 */
	public function maybe_create_folder($folder) {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_maybe_create_folder');

		return wpdev_maybe_create_folder($folder);

	} // end maybe_create_folder;

	/**
	 * Drop our custom tables.
	 *
	 * @since 2.0.0
	 * @throws \Exception In case of failures, an exception is thrown.
	 *
	 * @return void
	 */
	public function drop_tables() {

		_deprecated_function(__METHOD__, '2.0.11', 'wpdev_drop_tables');

		wpdev_drop_tables();

	} // end drop_tables;

} // end class Helper;
