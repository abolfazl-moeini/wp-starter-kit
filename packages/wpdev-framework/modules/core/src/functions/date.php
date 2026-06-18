<?php
/**
 * Date Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

/**
 * Checks if a date is valid in the Gregorian calendar.
 *
 * @param  string|false|null  $date  Date to check.
 * @param  string  $format  Format to check against.
 *
 * @return bool
 * @since 2.0.0
 *
 */
function wpdev_validate_date( $date, $format = 'Y-m-d H:i:s' ) {

	if ( is_null( $date ) ) {

		return true;

	} elseif ( ! $date ) {

		return false;

	} // end if;

	try {

		$d = \DateTime::createFromFormat( $format, $date );

	} catch ( \Throwable $exception ) {

		return false;

	} // end try;

	return $d && $d->format( $format ) === $date;

} // end wpdev_validate_date;

/**
 * Returns a Carbon object to deal with dates in a more compelling way.
 *
 * Note: this function uses the wpdev_validate function to check
 * if the string passed is a valid date string. If the string
 * is not valid, now is used.
 *
 * @param  string|false  $date  Parsable date string.
 *
 * @return \WPDevFramework\Dependencies\Carbon\Carbon
 * @since 2.0.0
 * @see https://carbon.nesbot.com/docs/
 *
 */
function wpdev_date( $date = false ) {

	if ( ! wpdev_validate_date( $date ) ) {

		$date = date_i18n( 'Y-m-d H:i:s' );

	} // end if;

	return \WPDevFramework\Dependencies\Carbon\Carbon::parse( $date );

} // end wpdev_date;

/**
 * Returns how many days ago the first date was in relation to the second date.
 *
 * If second date is empty, now is used.
 *
 * @param  string  $date_1  First date to compare.
 * @param  string|false  $date_2  Second date to compare.
 *
 * @return integer Negative if days ago, positive if days in the future.
 * @since 1.7.0
 *
 */
function wpdev_get_days_ago( $date_1, $date_2 = false ) {

	$datetime_1 = wpdev_date( $date_1 );

	$datetime_2 = wpdev_date( $date_2 );

	return - $datetime_1->diffInDays( $datetime_2, false );

} // end wpdev_get_days_ago;

/**
 * Returns the current time from the network
 *
 * @param  string  $type  Type of the return string to return.
 * @param  bool  $gmt  If the date returned should be GMT or not.
 *
 * @return string
 */
function wpdev_get_current_time( $type = 'mysql', $gmt = false ) {

	return current_time( $type, $gmt ); // phpcs:ignore

} // end wpdev_get_current_time;

/**
 * Returns a more user friendly version of the duration unit string.
 *
 * @param  string  $unit  The duration unit string.
 * @param  int  $length  The duration.
 *
 * @return string
 * @since 2.0.0
 *
 */
function wpdev_filter_duration_unit( $unit, $length ) {

	$new_unit = '';

	switch ( $unit ) {
		case 'day':
			$new_unit = $length > 1 ? __( 'Days', 'wpdev' ) : __( 'Day', 'wpdev' );
			break;
		case 'month':
			$new_unit = $length > 1 ? __( 'Months', 'wpdev' ) : __( 'Month', 'wpdev' );
			break;
		case 'year':
			$new_unit = $length > 1 ? __( 'Years', 'wpdev' ) : __( 'Year', 'wpdev' );
			break;
		default:
			$new_unit = $new_unit;
			break;
	}

	return $new_unit;

} // end wpdev_filter_duration_unit;
/**
 * Get the human time diff.
 *
 * @param  string  $from  The time to calculate from.
 * @param  string  $limit  The limit to switch back to a normal date representation.
 * @param  string  $to  The date to compare against.
 *
 * @since 2.0.0
 *
 */
function wpdev_human_time_diff( $from, $limit = '-5 days', $to = false ): string {

	$timestamp_from = is_numeric( $from ) ? $from : strtotime( get_date_from_gmt( $from ) );

	$limit = strtotime( $limit );

	if ( $timestamp_from <= $limit ) {

		// translators: %s: date.
		return sprintf( __( 'on %s', 'wpdev' ), date_i18n( get_option( 'date_format' ), $timestamp_from ) );

	} // end if;

	if ( $to === false ) {

		$to = wpdev_get_current_time( 'timestamp' ); // phpcs:ignore

	} // end if;

	$placeholder = wpdev_get_current_time( 'timestamp' ) > $timestamp_from ? __( '%s ago', 'wpdev' ) : __( 'In %s',
		'wpdev' ); // phpcs:ignore

	return sprintf( $placeholder, human_time_diff( $timestamp_from, $to ) );

} // end wpdev_human_time_diff;

/**
 * Converts php DateTime format to Javascript Moment format.
 *
 * @param  string  $php_date_format  The PHP date format to convert.
 *
 * @return string The moment.js date format
 * @since 2.0.10
 *
 */
function wpdev_convert_php_date_format_to_moment_js_format( $php_date_format ): string {

	$replacements = array(
		'A' => 'A',      // for the sake of escaping below
		'a' => 'a',      // for the sake of escaping below
		'B' => '',       // Swatch internet time (.beats), no equivalent
		'c' => 'YYYY-MM-DD[T]HH:mm:ssZ', // ISO 8601
		'D' => 'ddd',
		'd' => 'DD',
		'e' => 'zz',     // deprecated since version 1.6.0 of moment.js
		'F' => 'MMMM',
		'G' => 'H',
		'g' => 'h',
		'H' => 'HH',
		'h' => 'hh',
		'I' => '',       // Daylight Saving Time? => moment().isDST();
		'i' => 'mm',
		'j' => 'D',
		'L' => '',       // Leap year? => moment().isLeapYear();
		'l' => 'dddd',
		'M' => 'MMM',
		'm' => 'MM',
		'N' => 'E',
		'n' => 'M',
		'O' => 'ZZ',
		'o' => 'YYYY',
		'P' => 'Z',
		'r' => 'ddd, DD MMM YYYY HH:mm:ss ZZ', // RFC 2822
		'S' => 'o',
		's' => 'ss',
		'T' => 'z',      // deprecated since version 1.6.0 of moment.js
		't' => '',       // days in the month => moment().daysInMonth();
		'U' => 'X',
		'u' => 'SSSSSS', // microseconds
		'v' => 'SSS',    // milliseconds (from PHP 7.0.0)
		'W' => 'W',      // for the sake of escaping below
		'w' => 'e',
		'Y' => 'YYYY',
		'y' => 'YY',
		'Z' => '',       // time zone offset in minutes => moment().zone();
		'z' => 'DDD',
	);

	// Converts escaped characters.
	foreach ( $replacements as $from => $to ) {

		$replacements[ '\\' . $from ] = '[' . $from . ']';

	} // end foreach;

	return strtr( $php_date_format, $replacements );

} // end wpdev_convert_php_date_format_to_moment_js_format;
