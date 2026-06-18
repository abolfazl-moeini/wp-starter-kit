<?php
/**
 * Session Handler with session cookies
 *
 * This is usefull to handle multi step sign up process
 *
 * @author Arindo Duque <arindo@wpdev.ir>
 * @package WPDev
 * @since 2.0.18
 */

namespace WPDevFramework;

use \WPDevFramework\Contracts\Session;
use \WPDevFramework\Dependencies\Delight\Cookie\Cookie;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Session Class.
 */
class Session_Cookie implements Session {

	/**
	 * The data from this current session
	 *
	 * @var array
	 */
    protected $data = array();

	/**
	 * If the session has already loaded
	 *
	 * @var boolean
	 */
    protected $loaded = false;
    /**
     * @var string
     */
    protected $realm_name;

	/**
	 * Constructs the manager.
	 *
	 * @since 2.0.18
	 *
	 * @param string $realm_name The key name of the cookie.
	 */
	public function __construct($realm_name) {

        $this->realm_name = $realm_name;
        if ($this->loaded === true) {

            return;

		}

        $cookie_name = $this->get_cookie_name();

        $data_raw = Cookie::get($cookie_name, '{"new": true}');
        $data_raw = urldecode((string) $data_raw);
        $data_raw = stripslashes($data_raw);

        $this->data = json_decode($data_raw, true);

        $this->loaded = true;

	} // end __construct;

	/**
	 * Get the name of current cookie.
	 *
	 * @return string
	 */
	protected function get_cookie_name() {

		return "wpdev_session_{$this->realm_name}";

	} // end get_cookie_name;

	/**
	 * Gets the value of a session key.
	 *
	 * @since 2.0.18
	 *
	 * @param string $key The key to retrieve.
	 * @return mixed
	 */
	public function get($key = null) {

		if (!$key) {

			return $this->data;

		} // end if;

        return is_array($this->data) && isset($this->data[$key]) ? $this->data[$key] : null;

	} // end get;
	/**
	 * Set the value of a session key.
	 *
	 * @since 2.0.18
	 *
	 * @param string $key The value of the key to set.
	 * @param mixed  $value The value.
	 */
	public function set($key, $value): bool {

        $this->data[$key] = $value;

        return true;

	} // end set;
	/**
	 * Appends values to a given key, instead of replacing it.
	 *
	 * @since 2.0.18
	 *
	 * @param string $key    The data key to insert values.
	 * @param array  $values Additional array values.
	 */
	public function add_values($key, $values): bool {

		$old_values = isset($this->data[$key]) ? $this->data[$key] : array();

		$this->data[$key] = array_merge($old_values, $values);

		return true;

	} // end add_values;
	/**
	 * Writes to the session and closes the connection.
	 *
	 * @since 2.0.18
	 * @param int $expire the expire date of cookie.
	 */
	public function commit($expire = null): bool {

        if ($expire === null) {

			$expire = HOUR_IN_SECONDS;

        } // end if;

		$value = json_encode($this->data, JSON_UNESCAPED_UNICODE);

		$cookie = new Cookie($this->get_cookie_name());
		$cookie->setValue($value);
		$cookie->setMaxAge($expire);
		$cookie->setPath('/');
		$cookie->setDomain(COOKIE_DOMAIN);
		$cookie->setHttpOnly(true);
		$cookie->setSecureOnly(is_ssl());
		$cookie->setSameSiteRestriction('Lax');

		$cookie->save();

		// Set for current call
		$_COOKIE[$this->get_cookie_name()] = $value;

		return true;

	} // end commit;

	/**
	 * Clears the current session.
	 *
	 * @since 2.0.18
	 */
	public function clear() {

        $this->data = array();

	} // end clear;

	/**
	 * Destroys the session. Equivalent to session_destroy();
	 *
	 * @since 2.0.18
	 * @return bool
	 */
	public function destroy() {

		$name = $this->get_cookie_name();

		// unset from current call
		unset($_COOKIE[$this->get_cookie_name()]);

		return (new Cookie($name))->delete();

	} // end destroy;

} // end class Session_Cookie;
