<?php
/**
 * Contains deprecated functions that get loaded at sunrise.
 *
 * @package WPDev
 * @subpackage Deprecated
 * @since 2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Deprecated: wpdev_Domain_Mapping
 *
 * This class was rewritten from scratch.
 * The methods below are helper methods that are being implemented to
 * prevent fatal errors.
 *
 * @deprecated 2.0.0
 */
class wpdev_Domain_Mapping {

	/**
	 * Deprecated: get_ip_address
	 *
	 * @deprecated 2.0.0
	 * @return string
	 */
	public static function get_ip_address() {

		_deprecated_function(__METHOD__, '2.0.0', '\WPDevFramework\Domain_Mapping\Helper::get_network_public_ip()');

		$ip = \WPDevFramework\Domain_Mapping\Helper::get_network_public_ip();

		return apply_filters('wpdev_domain_mapping_get_ip_address', $ip, $_SERVER['SERVER_ADDR']);

	} // end get_ip_address;

	/**
	 * Deprecated: get_hosting_support_text
	 *
	 * @deprecated 2.0.0
	 * @return string
	 */
	public static function get_hosting_support_text() {

		_deprecated_function(__METHOD__, '2.0.0');

		return '';

	} // end get_hosting_support_text;

} // end class wpdev_Domain_Mapping;
