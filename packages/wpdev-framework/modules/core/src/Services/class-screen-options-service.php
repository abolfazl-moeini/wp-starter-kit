<?php
/**
 * Screen options service wrapper.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Services;

use WPDevFramework\Core\Contracts\Service_Contract;

defined( 'ABSPATH' ) || exit;

/**
 * Centralizes screen options registration for list tables and admin pages.
 */
class Screen_Options_Service implements Service_Contract {

	/**
	 * Registered screen option groups keyed by screen id.
	 *
	 * @var array<string, array>
	 */
	protected $groups = array();

	/**
	 * {@inheritdoc}
	 */
	public function id() {

		return 'screen_options';

	} // end id;

	/**
	 * {@inheritdoc}
	 */
	public function boot() {

		add_filter( 'screen_settings', array( $this, 'render_screen_settings' ), 10, 2 );

	} // end boot;

	/**
	 * Register screen options for a screen.
	 *
	 * @param string               $screen_id Screen identifier (usually page hook).
	 * @param array<string, mixed> $options   Option definitions.
	 * @return void
	 */
	public function register( $screen_id, $options ) {

		$this->groups[ $screen_id ] = $options;

	} // end register;

	/**
	 * Add a custom screen options panel to any admin page (J-14).
	 *
	 * Unlike register_per_page(), this works on non-list pages (dashboard,
	 * edit, custom) by appending arbitrary HTML to the Screen Options drawer.
	 *
	 * @since 2.6.0
	 *
	 * @param string $screen_id Screen id (WP_Screen::$id, usually the page hook).
	 * @param string $html      Panel markup.
	 * @return void
	 */
	public function add_panel( $screen_id, $html ) {

		$existing = isset( $this->groups[ $screen_id ]['html'] ) ? $this->groups[ $screen_id ]['html'] : '';

		$this->groups[ $screen_id ] = array(
			'html' => $existing . $html,
		);

	} // end add_panel;

	/**
	 * Register standard list table pagination screen option.
	 *
	 * @since 2.4.0
	 *
	 * @param string $option_name User meta option key.
	 * @param string $label       Label in Screen Options panel.
	 * @param int    $default     Default per-page value.
	 * @return void
	 */
	public function register_per_page( $option_name, $label, $default = 20 ) {

		add_screen_option(
			'per_page',
			array(
				'default' => $default,
				'label'   => $label,
				'option'  => $option_name,
			)
		);

	} // end register_per_page;

	/**
	 * Append registered screen settings markup.
	 *
	 * @param string    $settings Current settings HTML.
	 * @param \WP_Screen $screen   Current screen.
	 * @return string
	 */
	public function render_screen_settings( $settings, $screen ) {

		if ( empty( $this->groups[ $screen->id ] ) ) {
			return $settings;
		}

		/**
		 * Filter screen options markup before append.
		 *
		 * @since 2.4.0
		 *
		 * @param array    $options  Registered options.
		 * @param \WP_Screen $screen Current screen.
		 */
		$options = apply_filters( 'wpdev_screen_options_markup', $this->groups[ $screen->id ], $screen );

		if ( empty( $options['html'] ) ) {
			return $settings;
		}

		return $settings . $options['html'];

	} // end render_screen_settings;

} // end class Screen_Options_Service;
