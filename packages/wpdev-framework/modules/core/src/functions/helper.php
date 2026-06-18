<?php
/**
 * Core Helper Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

use \WPDevFramework\Exception\Runtime_Exception;
use \WPDevFramework\Dependencies\Psr\Log\LogLevel;

/**
 * Returns the WPDev version.
 *
 * @since 2.0.0
 * @return string
 */
function wpdev_get_version() {

	return class_exists(\WPDev::class) ? \WPDev::VERSION : '';

} // end wpdev_get_version;

/**
 * Check the debug status.
 *
 * @since 2.0.11
 * @return bool
 */
function wpdev_is_debug() {

	return defined('WPDEV_DEBUG') && WPDEV_DEBUG;

} // end wpdev_is_debug;

/**
 * Checks if WPDev is being loaded as a must-use plugin.
 *
 * @since 2.0.0
 * @return bool
 */
function wpdev_is_must_use() {

	return defined('WPDEV_IS_MUST_USE') && WPDev_IS_MUST_USE;

} // end wpdev_is_must_use;

/**
 * Checks if an array key value is set and returns it.
 *
 * If the key is not set, returns the $default parameter.
 * This function is a helper to serve as a shorthand for the tedious
 * and ugly $var = isset($array['key'])) ? $array['key'] : $default.
 * Using this, that same line becomes wpdev_get_isset($array, 'key', $default);
 *
 * Since PHP 7.4, this can be replaced by the null-coalesce operator (??)
 * in almost any circunstante.
 *
 * @since 2.0.0
 *
 * @param array|object $array Array or object to check key.
 * @param string       $key Key to check.
 * @param mixed        $default Default value, if the key is not set.
 * @return mixed
 */
function wpdev_get_isset($array, $key, $default = false) {

	if (!is_array($array)) {

		$array = (array) $array;

	} // end if;

	return isset($array[$key]) ? $array[$key] : $default;

} // end wpdev_get_isset;

/**
 * Returns the main site id for the network.
 *
 * @since 2.0.0
 * @return int
 */
function wpdev_get_main_site_id() {

	if( ! is_multisite() ) {
		return 1;
	}

	_wpdev_require_hook('ms_loaded');

	global $current_site;

	return $current_site->blog_id;

} // end wpdev_get_main_site_id;

/**
 * This function return 'slugfied' options terms to be used as options ids.
 *
 * @since 0.0.1
 * @param string $term Returns a string based on the term and this plugin slug.
 * @return string
 */
function wpdev_slugify($term) {

	return "wpdev_$term";

} // end wpdev_slugify;
/**
 * Returns the full path to the plugin folder.
 *
 * @since 2.0.11
 * @param string $dir Path relative to the plugin root you want to access.
 */
function wpdev_path($dir): string {

	return WPDEV_PLUGIN_DIR . $dir; // @phpstan-ignore-line

} // end wpdev_path;

/**
 * Returns the URL to the plugin folder.
 *
 * @since 2.0.11
 * @param string $dir Path relative to the plugin root you want to access.
 * @return string
 */
function wpdev_url($dir) {

	return apply_filters('wpdev_url', WPDEV_PLUGIN_URL . $dir); // @phpstan-ignore-line

} // end wpdev_url;

/**
 * Shorthand to retrieving variables from $_GET, $_POST and $_REQUEST;
 *
 * @since 2.0.0
 *
 * @param string $key Key to retrieve.
 * @param mixed  $default Default value, when the variable is not available.
 * @return mixed
 */
function wpdev_request($key, $default = false) {

	$value = isset($_REQUEST[$key]) ? stripslashes_deep($_REQUEST[$key]) : $default;

	return apply_filters('wpdev_request', $value, $key, $default);

} // end wpdev_request;

/**
 * Throws an exception if a given hook was not yet run.
 *
 * @since 2.0.11
 *
 * @param string $hook The hook to check. Defaults to 'ms_loaded'.
 * @throws Runtime_Exception When the hook has not yet run.
 * @return void
 */
function _wpdev_require_hook($hook = 'ms_loaded') { // phpcs:ignore

	if (!did_action($hook)) {

		$message = "This function can not yet be run as it relies on processing that happens on hook {$hook}.";

		throw new Runtime_Exception($message);

	} // end if;

} // end _wpdev_require_hook;

/**
 * Checks if reflection is available.
 *
 * Opcache settings can stripe comments and
 * make reflection unavailable.
 *
 * @since 2.0.11
 * @return boolean
 */
function wpdev_are_code_comments_available() {

	static $res;

	if ($res === null) {

		$res = (bool) (new \ReflectionFunction(__FUNCTION__))->getDocComment();

	} // end if;

	return $res;

} // end wpdev_are_code_comments_available;

/**
 * Join string into a single path string.
 *
 * @since 2.0.11
 * @param string ...$parts The parts of the path to join.
 * @return string The URL string.
 */
function wpdev_path_join(...$parts): string {

	if (sizeof($parts) === 0) {

		return '';

	} // end if;

	$prefix = ($parts[0] === DIRECTORY_SEPARATOR) ? DIRECTORY_SEPARATOR : '';

	$processed = array_filter(array_map(fn($part) => rtrim((string) $part, DIRECTORY_SEPARATOR), $parts), fn($part) => !empty($part));

	return $prefix . implode(DIRECTORY_SEPARATOR, $processed);

} // end wpdev_path_join;


/**
 * Add a log entry to chosen file.
 *
 * @since 2.0.0
 *
 * @param string           $handle Name of the log file to write to.
 * @param string|\WP_Error $message Log message to write.
 * @param string           $log_level Log level to write.
 * @return void
 */
function wpdev_log_add($handle, $message, $log_level = LogLevel::INFO) {

	\WPDevFramework\Logger::add($handle, $message, $log_level);

} // end wpdev_log_add;

/**
 * Clear entries from chosen file.
 *
 * @since 2.0.0
 *
 * @param mixed $handle Name of the log file to clear.
 * @return void
 */
function wpdev_log_clear($handle) {

	\WPDevFramework\Logger::clear($handle);

} // end wpdev_log_clear;

/**
 * Maybe log errors to the file.
 *
 * @since 2.0.0
 *
 * @param \Throwable $e The exception object.
 * @return void
 */
function wpdev_maybe_log_error($e) {

	if (defined('WP_DEBUG') && WP_DEBUG) {

		error_log($e);

	} // end if;

} // end wpdev_maybe_log_error;

/**
 * Get the function caller.
 *
 * @since 2.0.0
 *
 * @param integer $depth The depth of the backtrace.
 * @return string|null
 */
function wpdev_get_function_caller($depth = 1) {

	$backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, $depth + 1);

	$caller = isset($backtrace[$depth]['function']) ? $backtrace[$depth]['function'] : null;

	return $caller;

} // end wpdev_get_function_caller;
/**
 * Checks if a particular plugin is skipped in a CLI context.
 *
 * @since 2.1.0
 *
 * @param mixed $plugin The plugin slug. E.g. wpdev.
 */
function wpdev_cli_is_plugin_skipped($plugin = null): bool {

	if (!class_exists(\WP_CLI::class)) {

		return false;

	} // end if;

	$skipped_plugins = \WP_CLI::get_config('skip-plugins');

	if (is_bool($skipped_plugins)) {

		return true;

	} // end if;

	$skipped_plugins = array_map(fn($plugin_slug) => trim((string) $plugin_slug), explode(',', (string) $skipped_plugins));

	return in_array($plugin, $skipped_plugins, true);

} // end wpdev_cli_is_plugin_skipped;

/**
 * Capture errors and exceptions thrown inside the callback to prevent breakage.
 *
 * @since 2.1.0
 *
 * @todo Implement the logging portion of the feature.
 * @param \Callable $fn A callable to be run inside the capture block.
 * @param bool      $log Wether or not captured errors should be logged to a file.
 *
 * @return void
 */
function wpdev_ignore_errors($fn, $log = false) {

	try {

		call_user_func($fn);

	} catch (\Throwable $exception) {

		// Ignore it or log it.

	} // end try;

} // end wpdev_ignore_errors;

require_once __DIR__ . '/module-require.php';
