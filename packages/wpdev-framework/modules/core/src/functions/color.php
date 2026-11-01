<?php
/**
 * Color Functions
 *
 * Uses the Mexitek\PHPColors\Color class as a basis.
 *
 * @see https://github.com/mexitek/phpColors
 * @see http://mexitek.github.io/phpColors/
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

use \WPDev\Dependencies\Mexitek\PHPColors\Color;

/**
 * Returns a Color object.
 *
 * @since 2.0.0
 *
 * @param string $hex Hex code for the color. E.g. #000.
 * @return \WPDev\Dependencies\Mexitek\PHPColors\Color
 */
if (!function_exists('wpdev_color')) {
function wpdev_color($hex) {

	try {

		$color = new Color($hex);

	} catch (Exception $exception) {

		$color = new Color('#f9f9f9');

	} // end try;

	return $color;

}
}
 // end wpdev_color;

/**
 * Gets a random color for the progress bar.
 *
 * @since 2.0.0
 *
 * @param int $index The index number.
 * @return string
 */
if (!function_exists('wpdev_get_random_color')) {
function wpdev_get_random_color($index) {

	$colors = array(
		'wpdev-surface-red-500',
		'wpdev-surface-green-500',
		'wpdev-surface-blue-500',
		'wpdev-surface-yellow-500',
		'wpdev-surface-orange-500',
		'wpdev-surface-purple-500',
		'wpdev-surface-pink-500',
	);

	return wpdev_get_isset($colors, $index, $colors[ rand(0, count($colors) - 1) ]);

}
}
 // end wpdev_get_random_color;
