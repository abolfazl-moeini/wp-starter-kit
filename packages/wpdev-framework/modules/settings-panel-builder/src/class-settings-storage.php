<?php
/**
 * Settings storage collaborator (K3-01).
 *
 * Owns the option-level read/write + in-memory cache for the v2_settings
 * option. Extracted from the Settings monolith so persistence is isolated from
 * section definition (Settings_Sections) and the save pipeline (Settings_Save).
 *
 * @package WPDevFramework\Modules\SettingsPanelBuilder
 * @since   2.6.0
 */

namespace WPDevFramework\Modules\SettingsPanelBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Reads and writes the WPDev settings option with a request-level cache.
 */
class Settings_Storage {

	/**
	 * Option key.
	 *
	 * @var string
	 */
	const KEY = 'v2_settings';

	/**
	 * Cached settings array (null when not yet loaded).
	 *
	 * @var array|null
	 */
	private $settings = null;

	/**
	 * Whether the cache is loaded.
	 *
	 * @since 2.6.0
	 * @return bool
	 */
	public function is_loaded() {

		return null !== $this->settings;

	} // end is_loaded;

	/**
	 * Whether the stored settings are empty/missing.
	 *
	 * @since 2.6.0
	 * @return bool
	 */
	public function is_empty() {

		if ( null === $this->settings ) {
			$this->settings = wpdev_get_option( self::KEY );
		}

		return false === $this->settings || empty( $this->settings );

	} // end is_empty;

	/**
	 * Return the raw settings array (loading from the option once).
	 *
	 * @since 2.6.0
	 * @return array
	 */
	public function all() {

		if ( null === $this->settings ) {
			$this->settings = wpdev_get_option( self::KEY );
		}

		return is_array( $this->settings ) ? $this->settings : array();

	} // end all;

	/**
	 * Prime the in-memory cache without writing to the database.
	 *
	 * @since 2.6.0
	 *
	 * @param array $settings Settings array.
	 * @return void
	 */
	public function prime( array $settings ) {

		$this->settings = $settings;

	} // end prime;

	/**
	 * Persist the full settings array.
	 *
	 * @since 2.6.0
	 *
	 * @param array $settings Settings array.
	 * @return bool
	 */
	public function replace( array $settings ) {

		$status         = wpdev_save_option( self::KEY, $settings );
		$this->settings = $settings;

		return $status;

	} // end replace;

	/**
	 * Get a single setting value with the legacy filter applied.
	 *
	 * @since 2.6.0
	 *
	 * @param string $setting Setting key.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	public function get( $setting, $default = false ) {

		$settings = $this->all();

		if ( strpos( $setting, '-' ) !== false ) {
			_doing_it_wrong( $setting, __( 'Dashes are no longer supported when registering a setting. You should change it to underscores in later versions.', 'wpdev' ), '2.0.0' );
		}

		$setting_value = isset( $settings[ $setting ] ) ? $settings[ $setting ] : $default;

		return apply_filters( 'wpdev_get_setting', $setting_value, $setting, $default, $settings );

	} // end get;

	/**
	 * Save a single setting value.
	 *
	 * @since 2.6.0
	 *
	 * @param string $setting Setting key.
	 * @param mixed  $value   Value.
	 * @return bool
	 */
	public function set( $setting, $value ) {

		$settings = $this->all();

		$value = apply_filters( 'wpdev_save_setting', $value, $setting, $settings );

		if ( is_callable( $value ) ) {
			$value = call_user_func( $value );
		}

		$settings[ $setting ] = $value;

		return $this->replace( $settings );

	} // end set;

	/**
	 * Whether a single setting key is present in the cache.
	 *
	 * @since 2.6.0
	 *
	 * @param string $setting Setting key.
	 * @return bool
	 */
	public function has( $setting ) {

		$settings = $this->all();

		return isset( $settings[ $setting ] );

	} // end has;

} // end class Settings_Storage;
