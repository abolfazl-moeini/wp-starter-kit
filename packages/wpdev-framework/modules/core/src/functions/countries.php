<?php
/**
 * Country Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Returns the list of countries.
 *
 * @since 2.0.0
 * @return array
 */
function wpdev_get_countries() {

	return apply_filters('wpdev_get_countries', array(
		'AF' => __('Afghanistan', 'wpdev-locations'),
		'AX' => __('&#197;land Islands', 'wpdev-locations'),
		'AL' => __('Albania', 'wpdev-locations'),
		'DZ' => __('Algeria', 'wpdev-locations'),
		'AS' => __('American Samoa', 'wpdev-locations'),
		'AD' => __('Andorra', 'wpdev-locations'),
		'AO' => __('Angola', 'wpdev-locations'),
		'AI' => __('Anguilla', 'wpdev-locations'),
		'AQ' => __('Antarctica', 'wpdev-locations'),
		'AG' => __('Antigua and Barbuda', 'wpdev-locations'),
		'AR' => __('Argentina', 'wpdev-locations'),
		'AM' => __('Armenia', 'wpdev-locations'),
		'AW' => __('Aruba', 'wpdev-locations'),
		'AU' => __('Australia', 'wpdev-locations'),
		'AT' => __('Austria', 'wpdev-locations'),
		'AZ' => __('Azerbaijan', 'wpdev-locations'),
		'BS' => __('Bahamas', 'wpdev-locations'),
		'BH' => __('Bahrain', 'wpdev-locations'),
		'BD' => __('Bangladesh', 'wpdev-locations'),
		'BB' => __('Barbados', 'wpdev-locations'),
		'BY' => __('Belarus', 'wpdev-locations'),
		'BE' => __('Belgium', 'wpdev-locations'),
		'PW' => __('Belau', 'wpdev-locations'),
		'BZ' => __('Belize', 'wpdev-locations'),
		'BJ' => __('Benin', 'wpdev-locations'),
		'BM' => __('Bermuda', 'wpdev-locations'),
		'BT' => __('Bhutan', 'wpdev-locations'),
		'BO' => __('Bolivia', 'wpdev-locations'),
		'BQ' => __('Bonaire, Saint Eustatius and Saba', 'wpdev-locations'),
		'BA' => __('Bosnia and Herzegovina', 'wpdev-locations'),
		'BW' => __('Botswana', 'wpdev-locations'),
		'BV' => __('Bouvet Island', 'wpdev-locations'),
		'BR' => __('Brazil', 'wpdev-locations'),
		'IO' => __('British Indian Ocean Territory', 'wpdev-locations'),
		'VG' => __('British Virgin Islands', 'wpdev-locations'),
		'BN' => __('Brunei', 'wpdev-locations'),
		'BG' => __('Bulgaria', 'wpdev-locations'),
		'BF' => __('Burkina Faso', 'wpdev-locations'),
		'BI' => __('Burundi', 'wpdev-locations'),
		'KH' => __('Cambodia', 'wpdev-locations'),
		'CM' => __('Cameroon', 'wpdev-locations'),
		'CA' => __('Canada', 'wpdev-locations'),
		'CV' => __('Cape Verde', 'wpdev-locations'),
		'KY' => __('Cayman Islands', 'wpdev-locations'),
		'CF' => __('Central African Republic', 'wpdev-locations'),
		'TD' => __('Chad', 'wpdev-locations'),
		'CL' => __('Chile', 'wpdev-locations'),
		'CN' => __('China', 'wpdev-locations'),
		'CX' => __('Christmas Island', 'wpdev-locations'),
		'CC' => __('Cocos (Keeling) Islands', 'wpdev-locations'),
		'CO' => __('Colombia', 'wpdev-locations'),
		'KM' => __('Comoros', 'wpdev-locations'),
		'CG' => __('Congo (Brazzaville)', 'wpdev-locations'),
		'CD' => __('Congo (Kinshasa)', 'wpdev-locations'),
		'CK' => __('Cook Islands', 'wpdev-locations'),
		'CR' => __('Costa Rica', 'wpdev-locations'),
		'HR' => __('Croatia', 'wpdev-locations'),
		'CU' => __('Cuba', 'wpdev-locations'),
		'CW' => __('Cura&ccedil;ao', 'wpdev-locations'),
		'CY' => __('Cyprus', 'wpdev-locations'),
		'CZ' => __('Czech Republic', 'wpdev-locations'),
		'DK' => __('Denmark', 'wpdev-locations'),
		'DJ' => __('Djibouti', 'wpdev-locations'),
		'DM' => __('Dominica', 'wpdev-locations'),
		'DO' => __('Dominican Republic', 'wpdev-locations'),
		'EC' => __('Ecuador', 'wpdev-locations'),
		'EG' => __('Egypt', 'wpdev-locations'),
		'SV' => __('El Salvador', 'wpdev-locations'),
		'GQ' => __('Equatorial Guinea', 'wpdev-locations'),
		'ER' => __('Eritrea', 'wpdev-locations'),
		'EE' => __('Estonia', 'wpdev-locations'),
		'ET' => __('Ethiopia', 'wpdev-locations'),
		'FK' => __('Falkland Islands', 'wpdev-locations'),
		'FO' => __('Faroe Islands', 'wpdev-locations'),
		'FJ' => __('Fiji', 'wpdev-locations'),
		'FI' => __('Finland', 'wpdev-locations'),
		'FR' => __('France', 'wpdev-locations'),
		'GF' => __('French Guiana', 'wpdev-locations'),
		'PF' => __('French Polynesia', 'wpdev-locations'),
		'TF' => __('French Southern Territories', 'wpdev-locations'),
		'GA' => __('Gabon', 'wpdev-locations'),
		'GM' => __('Gambia', 'wpdev-locations'),
		'GE' => __('Georgia', 'wpdev-locations'),
		'DE' => __('Germany', 'wpdev-locations'),
		'GH' => __('Ghana', 'wpdev-locations'),
		'GI' => __('Gibraltar', 'wpdev-locations'),
		'GR' => __('Greece', 'wpdev-locations'),
		'GL' => __('Greenland', 'wpdev-locations'),
		'GD' => __('Grenada', 'wpdev-locations'),
		'GP' => __('Guadeloupe', 'wpdev-locations'),
		'GU' => __('Guam', 'wpdev-locations'),
		'GT' => __('Guatemala', 'wpdev-locations'),
		'GG' => __('Guernsey', 'wpdev-locations'),
		'GN' => __('Guinea', 'wpdev-locations'),
		'GW' => __('Guinea-Bissau', 'wpdev-locations'),
		'GY' => __('Guyana', 'wpdev-locations'),
		'HT' => __('Haiti', 'wpdev-locations'),
		'HM' => __('Heard Island and McDonald Islands', 'wpdev-locations'),
		'HN' => __('Honduras', 'wpdev-locations'),
		'HK' => __('Hong Kong', 'wpdev-locations'),
		'HU' => __('Hungary', 'wpdev-locations'),
		'IS' => __('Iceland', 'wpdev-locations'),
		'IN' => __('India', 'wpdev-locations'),
		'ID' => __('Indonesia', 'wpdev-locations'),
		'IR' => __('Iran', 'wpdev-locations'),
		'IQ' => __('Iraq', 'wpdev-locations'),
		'IE' => __('Ireland', 'wpdev-locations'),
		'IM' => __('Isle of Man', 'wpdev-locations'),
		'IL' => __('Israel', 'wpdev-locations'),
		'IT' => __('Italy', 'wpdev-locations'),
		'CI' => __('Ivory Coast', 'wpdev-locations'),
		'JM' => __('Jamaica', 'wpdev-locations'),
		'JP' => __('Japan', 'wpdev-locations'),
		'JE' => __('Jersey', 'wpdev-locations'),
		'JO' => __('Jordan', 'wpdev-locations'),
		'KZ' => __('Kazakhstan', 'wpdev-locations'),
		'KE' => __('Kenya', 'wpdev-locations'),
		'KI' => __('Kiribati', 'wpdev-locations'),
		'KW' => __('Kuwait', 'wpdev-locations'),
		'KG' => __('Kyrgyzstan', 'wpdev-locations'),
		'LA' => __('Laos', 'wpdev-locations'),
		'LV' => __('Latvia', 'wpdev-locations'),
		'LB' => __('Lebanon', 'wpdev-locations'),
		'LS' => __('Lesotho', 'wpdev-locations'),
		'LR' => __('Liberia', 'wpdev-locations'),
		'LY' => __('Libya', 'wpdev-locations'),
		'LI' => __('Liechtenstein', 'wpdev-locations'),
		'LT' => __('Lithuania', 'wpdev-locations'),
		'LU' => __('Luxembourg', 'wpdev-locations'),
		'MO' => __('Macao S.A.R., China', 'wpdev-locations'),
		'MK' => __('Macedonia', 'wpdev-locations'),
		'MG' => __('Madagascar', 'wpdev-locations'),
		'MW' => __('Malawi', 'wpdev-locations'),
		'MY' => __('Malaysia', 'wpdev-locations'),
		'MV' => __('Maldives', 'wpdev-locations'),
		'ML' => __('Mali', 'wpdev-locations'),
		'MT' => __('Malta', 'wpdev-locations'),
		'MH' => __('Marshall Islands', 'wpdev-locations'),
		'MQ' => __('Martinique', 'wpdev-locations'),
		'MR' => __('Mauritania', 'wpdev-locations'),
		'MU' => __('Mauritius', 'wpdev-locations'),
		'YT' => __('Mayotte', 'wpdev-locations'),
		'MX' => __('Mexico', 'wpdev-locations'),
		'FM' => __('Micronesia', 'wpdev-locations'),
		'MD' => __('Moldova', 'wpdev-locations'),
		'MC' => __('Monaco', 'wpdev-locations'),
		'MN' => __('Mongolia', 'wpdev-locations'),
		'ME' => __('Montenegro', 'wpdev-locations'),
		'MS' => __('Montserrat', 'wpdev-locations'),
		'MA' => __('Morocco', 'wpdev-locations'),
		'MZ' => __('Mozambique', 'wpdev-locations'),
		'MM' => __('Myanmar', 'wpdev-locations'),
		'NA' => __('Namibia', 'wpdev-locations'),
		'NR' => __('Nauru', 'wpdev-locations'),
		'NP' => __('Nepal', 'wpdev-locations'),
		'NL' => __('Netherlands', 'wpdev-locations'),
		'NC' => __('New Caledonia', 'wpdev-locations'),
		'NZ' => __('New Zealand', 'wpdev-locations'),
		'NI' => __('Nicaragua', 'wpdev-locations'),
		'NE' => __('Niger', 'wpdev-locations'),
		'NG' => __('Nigeria', 'wpdev-locations'),
		'NU' => __('Niue', 'wpdev-locations'),
		'NF' => __('Norfolk Island', 'wpdev-locations'),
		'MP' => __('Northern Mariana Islands', 'wpdev-locations'),
		'KP' => __('North Korea', 'wpdev-locations'),
		'NO' => __('Norway', 'wpdev-locations'),
		'OM' => __('Oman', 'wpdev-locations'),
		'PK' => __('Pakistan', 'wpdev-locations'),
		'PS' => __('Palestinian Territory', 'wpdev-locations'),
		'PA' => __('Panama', 'wpdev-locations'),
		'PG' => __('Papua New Guinea', 'wpdev-locations'),
		'PY' => __('Paraguay', 'wpdev-locations'),
		'PE' => __('Peru', 'wpdev-locations'),
		'PH' => __('Philippines', 'wpdev-locations'),
		'PN' => __('Pitcairn', 'wpdev-locations'),
		'PL' => __('Poland', 'wpdev-locations'),
		'PT' => __('Portugal', 'wpdev-locations'),
		'PR' => __('Puerto Rico', 'wpdev-locations'),
		'QA' => __('Qatar', 'wpdev-locations'),
		'RE' => __('Reunion', 'wpdev-locations'),
		'RO' => __('Romania', 'wpdev-locations'),
		'RU' => __('Russia', 'wpdev-locations'),
		'RW' => __('Rwanda', 'wpdev-locations'),
		'BL' => __('Saint Barth&eacute;lemy', 'wpdev-locations'),
		'SH' => __('Saint Helena', 'wpdev-locations'),
		'KN' => __('Saint Kitts and Nevis', 'wpdev-locations'),
		'LC' => __('Saint Lucia', 'wpdev-locations'),
		'MF' => __('Saint Martin (French part)', 'wpdev-locations'),
		'SX' => __('Saint Martin (Dutch part)', 'wpdev-locations'),
		'PM' => __('Saint Pierre and Miquelon', 'wpdev-locations'),
		'VC' => __('Saint Vincent and the Grenadines', 'wpdev-locations'),
		'SM' => __('San Marino', 'wpdev-locations'),
		'ST' => __('S&atilde;o Tom&eacute; and Pr&iacute;ncipe', 'wpdev-locations'),
		'SA' => __('Saudi Arabia', 'wpdev-locations'),
		'SN' => __('Senegal', 'wpdev-locations'),
		'RS' => __('Serbia', 'wpdev-locations'),
		'SC' => __('Seychelles', 'wpdev-locations'),
		'SL' => __('Sierra Leone', 'wpdev-locations'),
		'SG' => __('Singapore', 'wpdev-locations'),
		'SK' => __('Slovakia', 'wpdev-locations'),
		'SI' => __('Slovenia', 'wpdev-locations'),
		'SB' => __('Solomon Islands', 'wpdev-locations'),
		'SO' => __('Somalia', 'wpdev-locations'),
		'ZA' => __('South Africa', 'wpdev-locations'),
		'GS' => __('South Georgia/Sandwich Islands', 'wpdev-locations'),
		'KR' => __('South Korea', 'wpdev-locations'),
		'SS' => __('South Sudan', 'wpdev-locations'),
		'ES' => __('Spain', 'wpdev-locations'),
		'LK' => __('Sri Lanka', 'wpdev-locations'),
		'SD' => __('Sudan', 'wpdev-locations'),
		'SR' => __('Suriname', 'wpdev-locations'),
		'SJ' => __('Svalbard and Jan Mayen', 'wpdev-locations'),
		'SZ' => __('Swaziland', 'wpdev-locations'),
		'SE' => __('Sweden', 'wpdev-locations'),
		'CH' => __('Switzerland', 'wpdev-locations'),
		'SY' => __('Syria', 'wpdev-locations'),
		'TW' => __('Taiwan', 'wpdev-locations'),
		'TJ' => __('Tajikistan', 'wpdev-locations'),
		'TZ' => __('Tanzania', 'wpdev-locations'),
		'TH' => __('Thailand', 'wpdev-locations'),
		'TL' => __('Timor-Leste', 'wpdev-locations'),
		'TG' => __('Togo', 'wpdev-locations'),
		'TK' => __('Tokelau', 'wpdev-locations'),
		'TO' => __('Tonga', 'wpdev-locations'),
		'TT' => __('Trinidad and Tobago', 'wpdev-locations'),
		'TN' => __('Tunisia', 'wpdev-locations'),
		'TR' => __('Turkey', 'wpdev-locations'),
		'TM' => __('Turkmenistan', 'wpdev-locations'),
		'TC' => __('Turks and Caicos Islands', 'wpdev-locations'),
		'TV' => __('Tuvalu', 'wpdev-locations'),
		'UG' => __('Uganda', 'wpdev-locations'),
		'UA' => __('Ukraine', 'wpdev-locations'),
		'AE' => __('United Arab Emirates', 'wpdev-locations'),
		'GB' => __('United Kingdom (UK)', 'wpdev-locations'),
		'US' => __('United States (US)', 'wpdev-locations'),
		'UM' => __('United States (US) Minor Outlying Islands', 'wpdev-locations'),
		'VI' => __('United States (US) Virgin Islands', 'wpdev-locations'),
		'UY' => __('Uruguay', 'wpdev-locations'),
		'UZ' => __('Uzbekistan', 'wpdev-locations'),
		'VU' => __('Vanuatu', 'wpdev-locations'),
		'VA' => __('Vatican', 'wpdev-locations'),
		'VE' => __('Venezuela', 'wpdev-locations'),
		'VN' => __('Vietnam', 'wpdev-locations'),
		'WF' => __('Wallis and Futuna', 'wpdev-locations'),
		'EH' => __('Western Sahara', 'wpdev-locations'),
		'WS' => __('Samoa', 'wpdev-locations'),
		'YE' => __('Yemen', 'wpdev-locations'),
		'ZM' => __('Zambia', 'wpdev-locations'),
		'ZW' => __('Zimbabwe', 'wpdev-locations'),
	));

} // end wpdev_get_countries;

/**
 * Returns the list of countries with an additional empty state option.
 *
 * @since 2.0.0
 * @return array
 */
function wpdev_get_countries_as_options() {

	return array_merge(array(
		'' => __('Select Country', 'wpdev'),
	), wpdev_get_countries());

} // end wpdev_get_countries_as_options;

/**
 * Returns the country object.
 *
 * @since 2.0.11
 *
 * @param string      $country_code Two-letter country ISO code.
 * @param string|null $name The country name.
 * @param array       $fallback_attributes Fallback attributes if the country class is not present.
 * @return \WPDevFramework\Country\Country
 */
function wpdev_get_country($country_code, $name = null, $fallback_attributes = array()) {

	$country_code = strtoupper($country_code);

	$country_class = "\\WPDev\\Country\\Country_{$country_code}";

	if (class_exists($country_class)) {

		return $country_class::get_instance();

	} // end if;

	return \WPDevFramework\Country\Country_Default::build($country_code, $name, $fallback_attributes);

} // end wpdev_get_country;

/**
 * Get the state list for a country.
 *
 * @since 2.0.12
 *
 * @param string $country_code The country code.
 * @param string $key_name The name to use for the key entry.
 * @param string $value_name The name to use for the value entry.
 * @return array
 */
function wpdev_get_country_states($country_code, $key_name = 'id', $value_name = 'value') {

	static $state_options = array();

	$options = array();

	$cache = wpdev_get_isset($state_options, $country_code, false);

	if ($cache) {

		$options = $cache;

	} else {

		$country = wpdev_get_country($country_code);

		$state_options[$country_code] = $country->get_states_as_options(false);

		$options = $state_options[$country_code];

	} // end if;

	if (empty($key_name)) {

		return $options;

	} // end if;

	return wpdev_key_map_to_array($options, $key_name, $value_name);

} // end wpdev_get_country_states;

/**
 * Get cities for a collection of states of a country.
 *
 * @since 2.0.11
 *
 * @param string $country_code The country code.
 * @param array  $states The list of state codes to retrieve.
 * @param string $key_name The name to use for the key entry.
 * @param string $value_name The name to use for the value entry.
 * @return array
 */
function wpdev_get_country_cities($country_code, $states, $key_name = 'id', $value_name = 'value') {

	static $city_options = array();

	$states = (array) $states;

	$options = array();

	foreach ($states as $state_code) {

		$cache = wpdev_get_isset($city_options, $state_code, false);

		if ($cache) {

			$options = array_merge($options, $cache);

		} else {

			$country = wpdev_get_country($country_code);

			$city_options[$state_code] = $country->get_cities_as_options($state_code, false);

			$options = array_merge($options, $city_options[$state_code]);

		} // end if;

	} // end foreach;

	if (empty($key_name)) {

		return $options;

	} // end if;

	return wpdev_key_map_to_array($options, $key_name, $value_name);

} // end wpdev_get_country_cities;

/**
 * Returns the country name for a given country code.
 *
 * @since 2.0.0
 *
 * @param string $country_code Country code.
 * @return string
 */
function wpdev_get_country_name($country_code) {

	$country_name = wpdev_get_isset(wpdev_get_countries(), $country_code, __('Not found', 'wpdev'));

	return apply_filters('wpdev_get_country_name', $country_name, $country_code);

} // end wpdev_get_country_name;

/**
 * Get the list of countries and counts based on customers.
 *
 * @since 2.0.0
 * @param integer        $count The number of results to return.
 * @param boolean|string $start_date The start date.
 * @param boolean|string $end_date The end date.
 * @return array
 */
function wpdev_get_countries_of_customers($count = 10, $start_date = false, $end_date = false) {

	global $wpdb;

	$table_name          = wpdev_get_db_table( 'customermeta' );
	$customer_table_name = wpdev_get_db_table( 'customers' );

	$date_query = '';

	if ($start_date || $end_date) {

		$date_query = 'AND c.date_registered >= %s AND c.date_registered <= %s';

		$date_query = $wpdb->prepare($date_query, $start_date . ' 00:00:00', $end_date . " 23:59:59"); // phpcs:ignore

	} // end if;

	$query = "
		SELECT m.meta_value as country, COUNT(distinct c.id) as count
		FROM `{$table_name}` as m
		INNER JOIN `{$customer_table_name}` as c ON m.wpdev_customer_id = c.id
		WHERE m.meta_key = 'ip_country' AND m.meta_value != ''
		$date_query
		GROUP BY m.meta_value
		ORDER BY count DESC
		LIMIT %d
	";

	$query = $wpdb->prepare($query, $count); // phpcs:ignore

	$results = $wpdb->get_results($query); // phpcs:ignore

	$countries = array();

	foreach ($results as $result) {

		$countries[$result->country] = $result->count;

	} // end foreach;

	return $countries;

} // end wpdev_get_countries_of_customers;

/**
 * Get the list of countries and counts based on customers.
 *
 * @since 2.0.0
 * @param string         $country_code The country code.
 * @param integer        $count The number of results to return.
 * @param boolean|string $start_date The start date.
 * @param boolean|string $end_date The end date.
 * @return array
 */
function wpdev_get_states_of_customers($country_code, $count = 100, $start_date = false, $end_date = false) {

	global $wpdb;

	static $states = array();

	$table_name          = wpdev_get_db_table( 'customermeta' );
	$customer_table_name = wpdev_get_db_table( 'customers' );

	$date_query = '';

	if ($start_date || $end_date) {

		$date_query = 'AND c.date_registered >= %s AND c.date_registered <= %s';

		$date_query = $wpdb->prepare($date_query, $start_date . ' 00:00:00', $end_date . " 23:59:59"); // phpcs:ignore

	} // end if;

	$states = wpdev_get_country_states('BR', false);

	if (empty($states)) {

		return array();

	} // end if;

	$states_in = implode("','", array_keys($states));

	$query = "
		SELECT m.meta_value as state, COUNT(distinct c.id) as count
		FROM `{$table_name}` as m
		INNER JOIN `{$customer_table_name}` as c ON m.wpdev_customer_id = c.id
		WHERE m.meta_key = 'ip_state' AND m.meta_value IN ('$states_in')
		$date_query
		GROUP BY m.meta_value
		ORDER BY count DESC
		LIMIT %d
	";

	$query = $wpdb->prepare($query, $count); // phpcs:ignore

	$results = $wpdb->get_results($query); // phpcs:ignore

	if (empty($results)) {

		return array();

	} // end if;

	$_states = array();

	foreach ($results as $result) {

		$final_label = sprintf('%s (%s)', $states[$result->state], $result->state);

		$_states[$final_label] = absint($result->count);

	} // end foreach;

	return $_states;

} // end wpdev_get_states_of_customers;
