<?php
/**
 * Country Functions
 *
 * @package WPDevFramework\Functions
 * @since   1.4.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Get all the currencies we use in WPDev
 *
 * @return array Return the currencies array.
 */
function wpdev_get_currencies(): array {

	$currencies = apply_filters('wpdev_currencies', array(
		'AED' => __('United Arab Emirates Dirham', 'wpdev'),
		'ARS' => __('Argentine Peso', 'wpdev'),
		'AUD' => __('Australian Dollars', 'wpdev'),
		'BDT' => __('Bangladeshi Taka', 'wpdev'),
		'BRL' => __('Brazilian Real', 'wpdev'),
		'BGN' => __('Bulgarian Lev', 'wpdev'),
		'CAD' => __('Canadian Dollars', 'wpdev'),
		'CLP' => __('Chilean Peso', 'wpdev'),
		'CNY' => __('Chinese Yuan', 'wpdev'),
		'COP' => __('Colombian Peso', 'wpdev'),
		'CZK' => __('Czech Koruna', 'wpdev'),
		'DKK' => __('Danish Krone', 'wpdev'),
		'DOP' => __('Dominican Peso', 'wpdev'),
		'EUR' => __('Euros', 'wpdev'),
		'HKD' => __('Hong Kong Dollar', 'wpdev'),
		'HRK' => __('Croatia kuna', 'wpdev'),
		'HUF' => __('Hungarian Forint', 'wpdev'),
		'ISK' => __('Icelandic krona', 'wpdev'),
		'IDR' => __('Indonesia Rupiah', 'wpdev'),
		'INR' => __('Indian Rupee', 'wpdev'),
		'NPR' => __('Nepali Rupee', 'wpdev'),
		'ILS' => __('Israeli Shekel', 'wpdev'),
		'JPY' => __('Japanese Yen', 'wpdev'),
		'KES' => __('Kenyan Shilling', 'wpdev'),
		'KIP' => __('Lao Kip', 'wpdev'),
		'KRW' => __('South Korean Won', 'wpdev'),
		'MYR' => __('Malaysian Ringgits', 'wpdev'),
		'MXN' => __('Mexican Peso', 'wpdev'),
		'NGN' => __('Nigerian Naira', 'wpdev'),
		'NOK' => __('Norwegian Krone', 'wpdev'),
		'NZD' => __('New Zealand Dollar', 'wpdev'),
		'PYG' => __('Paraguayan Guaraní', 'wpdev'),
		'PHP' => __('Philippine Pesos', 'wpdev'),
		'PLN' => __('Polish Zloty', 'wpdev'),
		'GBP' => __('Pounds Sterling', 'wpdev'),
		'RON' => __('Romanian Leu', 'wpdev'),
		'RUB' => __('Russian Ruble', 'wpdev'),
		'SGD' => __('Singapore Dollar', 'wpdev'),
		'ZAR' => __('South African rand', 'wpdev'),
		'SAR' => __('Saudi Riyal', 'wpdev'),
		'SEK' => __('Swedish Krona', 'wpdev'),
		'CHF' => __('Swiss Franc', 'wpdev'),
		'TWD' => __('Taiwan New Dollars', 'wpdev'),
		'THB' => __('Thai Baht', 'wpdev'),
		'TRY' => __('Turkish Lira', 'wpdev'),
		'UAH' => __('Ukrainian Hryvnia', 'wpdev'),
		'USD' => __('US Dollars', 'wpdev'),
		'VND' => __('Vietnamese Dong', 'wpdev'),
		'EGP' => __('Egyptian Pound', 'wpdev'),
	));

	return array_unique($currencies);

} // end wpdev_get_currencies;

/**
 * Gets the currency symbol of a currency.
 *
 * @since 0.0.1
 *
 * @param string $currency Currency to get symbol of.
 * @return string
 */
function wpdev_get_currency_symbol($currency = '') {

	if (!$currency) {

		$currency = wpdev_get_setting('currency_symbol');

	} switch ($currency) {
     case 'AED':
         $currency_symbol = 'د.إ';
         break;
     case 'AUD':
     case 'ARS':
     case 'CAD':
     case 'CLP':
     case 'COP':
     case 'HKD':
     case 'MXN':
     case 'NZD':
     case 'SGD':
     case 'USD':
         $currency_symbol = '$';
         break;
     case 'BDT':
         $currency_symbol = '৳&nbsp;';
         break;
     case 'BGN':
         $currency_symbol = 'лв.';
         break;
     case 'BRL':
         $currency_symbol = 'R$';
         break;
     case 'CHF':
         $currency_symbol = 'CHF';
         break;
     case 'CNY':
     case 'JPY':
     case 'RMB':
         $currency_symbol = '&yen;';
         break;
     case 'CZK':
         $currency_symbol = 'Kč';
         break;
     case 'DKK':
         $currency_symbol = 'DKK';
         break;
     case 'DOP':
         $currency_symbol = 'RD$';
         break;
     case 'EGP':
         $currency_symbol = 'EGP';
         break;
     case 'EUR':
         $currency_symbol = '&euro;';
         break;
     case 'GBP':
         $currency_symbol = '&pound;';
         break;
     case 'HRK':
         $currency_symbol = 'Kn';
         break;
     case 'HUF':
         $currency_symbol = 'Ft';
         break;
     case 'IDR':
         $currency_symbol = 'Rp';
         break;
     case 'ILS':
         $currency_symbol = '₪';
         break;
     case 'INR':
         $currency_symbol = 'Rs.';
         break;
     case 'ISK':
         $currency_symbol = 'Kr.';
         break;
     case 'KES':
         $currency_symbol = 'KSh';
         break;
     case 'KIP':
         $currency_symbol = '₭';
         break;
     case 'KRW':
         $currency_symbol = '₩';
         break;
     case 'MYR':
         $currency_symbol = 'RM';
         break;
     case 'NGN':
         $currency_symbol = '₦';
         break;
     case 'NOK':
         $currency_symbol = 'kr';
         break;
     case 'NPR':
         $currency_symbol = 'Rs.';
         break;
     case 'PHP':
         $currency_symbol = '₱';
         break;
     case 'PLN':
         $currency_symbol = 'zł';
         break;
     case 'PYG':
         $currency_symbol = '₲';
         break;
     case 'RON':
         $currency_symbol = 'lei';
         break;
     case 'RUB':
         $currency_symbol = 'руб.';
         break;
     case 'SEK':
         $currency_symbol = 'kr';
         break;
     case 'THB':
         $currency_symbol = '฿';
         break;
     case 'TRY':
         $currency_symbol = '₺';
         break;
     case 'TWD':
         $currency_symbol = 'NT$';
         break;
     case 'UAH':
         $currency_symbol = '₴';
         break;
     case 'VND':
         $currency_symbol = '₫';
         break;
     case 'ZAR':
         $currency_symbol = 'R';
         break;
     case 'SAR':
         $currency_symbol = 'ر.س';
         break;
     default:
         $currency_symbol = $currency;
         break;
 } // end switch;

	return apply_filters('wpdev_currency_symbol', $currency_symbol, $currency);

} // end wpdev_get_currency_symbol;

/**
 * Formats a value into our defined format
 *
 * @param  string      $value Value to be processed.
 * @param  string|null $currency Currency code.
 * @param  string|null $format Format to return the string.
 * @param  string|null $thousands_sep Thousands separator.
 * @param  string|null $decimal_sep Decimal separator.
 * @param  string|null $precision Number of decimal places.
 * @return string Formatted Value.
 */
function wpdev_format_currency($value, $currency = null, $format = null, $thousands_sep = null, $decimal_sep = null, $precision = null) {

	$value = wpdev_to_float($value);

	$args = array(
		'currency'      => $currency,
		'format'        => $format,
		'thousands_sep' => $thousands_sep,
		'decimal_sep'   => $decimal_sep,
		'precision'     => $precision,
	);

	// Remove invalid args
	$args = array_filter($args);

	$atts = wp_parse_args($args, array(
		'currency'      => wpdev_get_setting('currency_symbol'),
		'format'        => wpdev_get_setting('currency_position'),
		'thousands_sep' => wpdev_get_setting('thousand_separator'),
		'decimal_sep'   => wpdev_get_setting('decimal_separator'),
		'precision'     => (int) wpdev_get_setting('precision', 2),
	));

	$currency_symbol = wpdev_get_currency_symbol($atts['currency']);

	$value = number_format($value, $atts['precision'], $atts['decimal_sep'], $atts['thousands_sep']);

	$format = str_replace('%v', $value, (string) $atts['format']);
	$format = str_replace('%s', $currency_symbol, $format);

	return apply_filters('wpdev_format_currency', $format, $currency_symbol, $value);

} // end wpdev_format_currency;

/**
 * Determines if WPDev is using a zero-decimal currency.
 *
 * @param  string $currency The currency code to check.
 *
 * @since  2.0.0
 * @return bool True if currency set to a zero-decimal currency.
 */
function wpdev_is_zero_decimal_currency($currency = 'USD') {

	$zero_dec_currencies = array(
		'BIF', // Burundian Franc
		'CLP', // Chilean Peso
		'DJF', // Djiboutian Franc
		'GNF', // Guinean Franc
		'JPY', // Japanese Yen
		'KMF', // Comorian Franc
		'KRW', // South Korean Won
		'MGA', // Malagasy Ariary
		'PYG', // Paraguayan Guarani
		'RWF', // Rwandan Franc
		'VND', // Vietnamese Dong
		'VUV', // Vanuatu Vatu
		'XAF', // Central African CFA Franc
		'XOF', // West African CFA Franc
		'XPF', // CFP Franc
	);

	return apply_filters('wpdev_is_zero_decimal_currency', in_array($currency, $zero_dec_currencies, true));

} // end wpdev_is_zero_decimal_currency;

/**
 * Sets the number of decimal places based on the currency.
 *
 * @param int $decimals The number of decimal places. Default is 2.
 *
 * @todo add the missing currency parameter?
 * @since  2.0.0
 * @return int The number of decimal places.
 */
function wpdev_currency_decimal_filter($decimals = 2) {

	$currency = 'USD';

	if (wpdev_is_zero_decimal_currency($currency)) {

		$decimals = 0;

	} // end if;

	return apply_filters('wpdev_currency_decimal_filter', $decimals, $currency);

} // end wpdev_currency_decimal_filter;

/**
 * Returns the multiplier for the currency. Most currencies are multiplied by 100.
 * Zero decimal currencies should not be multiplied so use 1.
 *
 * @since 2.0.0
 *
 * @param string $currency The currency code, all uppercase.
 * @return int
 */
function wpdev_stripe_get_currency_multiplier($currency = 'USD') {

	$multiplier = (wpdev_is_zero_decimal_currency($currency)) ? 1 : 100;

	return apply_filters('wpdev_stripe_get_currency_multiplier', $multiplier, $currency);

} // end wpdev_stripe_get_currency_multiplier;
