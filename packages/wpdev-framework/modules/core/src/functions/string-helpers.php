<?php
/**
 * String Helper Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Converts a string (e.g. 'yes' or 'no' or '1' or '0') to a bool.
 *
 * @since 2.0.0
 *
 * @param string $string The string to convert.
 * @return bool
 */
function wpdev_string_to_bool($string) {

	return is_bool($string) ? $string : ('on' === strtolower($string) || 'yes' === strtolower($string) || 1 === $string || 'true' === strtolower($string) || '1' === $string);

} // end wpdev_string_to_bool;

/**
 * Converts a slug to a name.
 *
 * This function turns discount_code into Discount Code, by removing _- and using ucwords.
 *
 * @since 2.0.0
 *
 * @param string $slug The slug to convert.
 * @return string
 */
function wpdev_slug_to_name($slug) {

	$slug = str_replace(array('-', '_'), ' ', $slug);

	return ucwords($slug);

} // end wpdev_slug_to_name;

/**
 * Replaces dashes with underscores on strings.
 *
 * @since 2.0.0
 *
 * @param string $str String to replace dashes in.
 * @return string
 */
function wpdev_replace_dashes($str) {

	return str_replace('-', '_', $str);

} // end wpdev_replace_dashes;

/**
 * Get the initials for a string.
 *
 * E.g. Brazilian People will return BP.
 *
 * @since 2.0.0
 *
 * @param string  $string String to process.
 * @param integer $max_size Number of initials to return.
 * @return string
 */
function wpdev_get_initials($string, $max_size = 2) {

	$words = explode(' ', $string);

	$initials = '';

	for ($i = 0; $i < $max_size; $i++) {

		if (!isset($words[$i])) {

			break;

		} // end if;

		$initials .= substr($words[$i], 0, 1);

	} // end for;

	return strtoupper($initials);

} // end wpdev_get_initials;
