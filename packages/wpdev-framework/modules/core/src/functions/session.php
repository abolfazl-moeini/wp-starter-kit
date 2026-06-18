<?php
/**
 * Session Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Gets or creates a Session object.
 *
 * @since 2.0.0
 *
 * @param string $session_key The session key.
 * @return \WPDevFramework\Contracts\Session
 */
function wpdev_get_session($session_key) {

	global $wpdev_session;

	$wpdev_session = (array) $wpdev_session;

	$session = wpdev_get_isset($wpdev_session, $session_key, false);

	if ($session && is_a( $session, \WPDevFramework\Session_Cookie::class)) {

		return $session;

	} // end if;

	$wpdev_session[$session_key] = new \WPDevFramework\Session_Cookie($session_key);

	return $wpdev_session[$session_key];

} // end wpdev_get_session;
