<?php
/**
 * WPDev helper class to handle global registering of scripts and styles.
 *
 * @package WPDev
 * @subpackage Scripts
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev helper class to handle global registering of scripts and styles.
 *
 * @since 2.0.0
 */
class Scripts {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Runs when the instantiation first occurs.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		add_action('init', array($this, 'register_default_scripts'));

		add_action('init', array($this, 'register_default_styles'));

		add_action('admin_init', array($this, 'enqueue_default_admin_styles'));

		add_action('admin_init', array($this, 'enqueue_default_admin_scripts'));

		wpdev_require_public_function( 'ajax' );
		wpdev_register_ajax_handler( 'wpdev_toggle_container', array( $this, 'update_use_container' ) );

		add_filter('admin_body_class', array($this, 'add_body_class_container_boxed'));

	} // end init;

	/**
	 * Ensure default WPDev scripts/styles are registered.
	 *
	 * When network setup is unfinished, WPDev::init() returns before
	 * Scripts::get_instance(), so wpdev-vue-apps is never registered.
	 * Edit/list pages still enqueue that handle — call this first.
	 *
	 * Safe after `init`: the constructor hooks are skipped once that fired,
	 * so this registers handles immediately instead of waiting for `init`.
	 *
	 * @since 2.8.6
	 * @return void
	 */
	public static function ensure_defaults_registered() {

		if ( wp_script_is( 'wpdev-vue-apps', 'registered' ) ) {
			return;
		}

		$scripts = self::get_instance();

		if ( wp_script_is( 'wpdev-vue-apps', 'registered' ) ) {
			return;
		}

		$scripts->register_default_scripts();
		$scripts->register_default_styles();

	} // end ensure_defaults_registered;

	/**
	 * Whether a WordPress locale is Persian (fa / fa_IR / fa-IR / …).
	 *
	 * @since 2.8.7
	 *
	 * @param mixed $locale Locale string.
	 * @return bool
	 */
	public static function is_persian_wp_locale( $locale ) {

		return is_string( $locale ) && 1 === preg_match( '/^fa([_-]|$)/i', $locale );

	} // end is_persian_wp_locale;

	/**
	 * Resolve Flatpickr locale: Jalali (`fa`) when any active WP locale is Persian.
	 *
	 * Checks `determine_locale()`, site `get_locale()`, and `get_user_locale()`
	 * so site language `fa_*` enables Shamsi even if the admin user profile is English.
	 *
	 * @since 2.8.7
	 *
	 * @return string `fa` or `default`
	 */
	protected function resolve_datepicker_locale() {

		$candidates = array();

		if ( function_exists( 'determine_locale' ) ) {
			$candidates[] = determine_locale();
		}

		$candidates[] = get_locale();

		if ( function_exists( 'get_user_locale' ) ) {
			$candidates[] = get_user_locale();
		}

		foreach ( $candidates as $locale ) {
			if ( self::is_persian_wp_locale( $locale ) ) {
				return 'fa';
			}
		}

		return 'default';

	} // end resolve_datepicker_locale;

	/**
	 * Wrapper for the register scripts function.
	 *
	 * @since 2.0.0
	 *
	 * @param string $handle The script handle. Used to enqueue the script.
	 * @param string $src URL to the file.
	 * @param array  $deps List of dependency scripts.
	 * @return void
	 */
	public function register_script($handle, $src, $deps = array(), $ver = null) {

		$ver = ( null !== $ver ) ? $ver : wpdev_get_version();

		global $wp_scripts;
		if ( isset( $wp_scripts->registered[ $handle ] ) ) {
			$existing = $wp_scripts->registered[ $handle ];
			$existing_src = (string) ( $existing->src ?? '' );
			$is_existing_closure = ( false !== strpos( $existing_src, 'FrameworkClosure' ) );
			$is_incoming_closure = ( false !== strpos( (string) $src, 'FrameworkClosure' ) );

			// Canonical always wins: Closure cannot override canonical even with a higher version.
			if ( ! $is_existing_closure && $is_incoming_closure ) {
				return;
			}

			// Canonical always overrides a pre-registered closure regardless of version.
			if ( $is_existing_closure && ! $is_incoming_closure ) {
				wp_deregister_script( $handle );
			} elseif ( version_compare( (string) $ver, (string) ( $existing->ver ?? '0.0.0' ), '>' ) ) {
				wp_deregister_script( $handle );
			} else {
				return;
			}
		}

		wp_register_script($handle, $src, $deps, $ver);

	} // end register_script;

	/**
	 * Wrapper for the register styles function.
	 *
	 * @since 2.0.0
	 *
	 * @param string $handle The script handle. Used to enqueue the script.
	 * @param string $src URL to the file.
	 * @param array  $deps List of dependency scripts.
	 * @param string|null $ver Optional version string.
	 * @return void
	 */
	public function register_style($handle, $src, $deps = array(), $ver = null) {

		$ver = ( null !== $ver ) ? $ver : wpdev_get_version();

		global $wp_styles;
		if ( isset( $wp_styles->registered[ $handle ] ) ) {
			$existing = $wp_styles->registered[ $handle ];
			$existing_src = (string) ( $existing->src ?? '' );
			$is_existing_closure = ( false !== strpos( $existing_src, 'FrameworkClosure' ) );
			$is_incoming_closure = ( false !== strpos( (string) $src, 'FrameworkClosure' ) );

			// Canonical always wins: Closure cannot override canonical even with a higher version.
			if ( ! $is_existing_closure && $is_incoming_closure ) {
				return;
			}

			// Canonical always overrides a pre-registered closure regardless of version.
			if ( $is_existing_closure && ! $is_incoming_closure ) {
				wp_deregister_style( $handle );
			} elseif ( version_compare( (string) $ver, (string) ( $existing->ver ?? '0.0.0' ), '>' ) ) {
				wp_deregister_style( $handle );
			} else {
				return;
			}
		}

		wp_register_style($handle, $src, $deps, $ver);

	} // end register_style;

	/**
	 * Registers the default WPDev scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_default_scripts() {
		/*
		 * Adds Vue JS
		 */
		$this->register_script('wpdev-vue', wpdev_get_module_asset_url('core', 'lib/vue.js', 'js'));

		/*
		 * Adds Sweet Alert
		 */
		$this->register_script('wpdev-sweet-alert', wpdev_get_module_asset_url('core', 'lib/sweetalert2.all.js', 'js'));

		/*
		 * Adds Flat Picker (flatpickr-wrap: Jalali UI when locale is fa / fa-IR)
		 */
		$this->register_script('wpdev-flatpicker', wpdev_get_module_asset_url('core', 'lib/flatpicker.js', 'js'));
		$this->register_script(
			'wpdev-flatpicker-fa',
			wpdev_get_module_asset_url('core', 'lib/flatpickr-l10n/fa.js', 'js'),
			array( 'wpdev-flatpicker' )
		);
		$this->register_script(
			'wpdev-jalaali',
			wpdev_get_module_asset_url('core', 'lib/jalaali.js', 'js')
		);

		/*
		 * Adds tipTip
		 */
		$this->register_script('wpdev-tiptip', wpdev_get_module_asset_url('core', 'lib/tiptip.js', 'js'), array('jquery-core'));

		$list_deps = array( 'jquery', 'wpdev-vue', 'underscore', 'wpdev-flatpicker', 'wpdev-flatpicker-fa', 'wpdev-jalaali' );

		$this->register_script(
			'wpdev-ajax-list-table-hooks',
			wpdev_get_module_asset_url( 'table-builder', 'list-tables/list-tables-hooks.js', 'js' ),
			$list_deps
		);

		/*
		 * Ajax list Table pagination
		 */
		$this->register_script(
			'wpdev-ajax-list-table',
			wpdev_get_module_asset_url( 'table-builder', 'list-tables/list-tables-factory.js', 'js' ),
			array( 'wpdev-ajax-list-table-hooks', 'jquery-ui-sortable' )
		);

		/*
		 * Adds jQueryBlockUI
		 */
		$this->register_script('wpdev-block-ui', wpdev_get_module_asset_url('core', 'lib/jquery.blockUI.js', 'js'), array('jquery-core'));

		/*
		 * Adds FontIconPicker
		 */
		$this->register_script('wpdev-fonticonpicker', wpdev_get_module_asset_url('core', 'lib/jquery.fonticonpicker.js', 'js'), array('jquery'));

		/*
		 * Adds Accounting.js
		 */
		$this->register_script('wpdev-accounting', wpdev_get_module_asset_url('core', 'lib/accounting.js', 'js'), array('jquery-core'));

		/*
		 * Adds Cookie Helpers
		 */
		$this->register_script('wpdev-cookie-helpers', wpdev_get_module_asset_url('core', 'cookie-helpers.js', 'js'), array('jquery-core'));

		/*
		 * Adds Input Masking
		 */
		$this->register_script('wpdev-money-mask', wpdev_get_module_asset_url('core', 'lib/v-money.js', 'js'), array('wpdev-vue'));
		$this->register_script('wpdev-input-mask', wpdev_get_module_asset_url('core', 'lib/vue-the-mask.js', 'js'), array('wpdev-vue'));

		/*
		 * Shared AJAX client (J-04): wpdev.ajax.post/get with nonce + envelope.
		 */
		$this->register_script('wpdev-ajax', wpdev_get_module_asset_url('core', 'wpdev-ajax.js', 'js'), array());

		wp_localize_script('wpdev-ajax', 'wpdev_ajax', array(
			'admin_ajax_url' => admin_url('admin-ajax.php'),
			'light_ajax_url' => wpdev_ajax_url(),
			'nonce'          => wp_create_nonce('wpdev-ajax-nonce'),
		));

		$functions_deps = array( 'jquery-core', 'wpdev-tiptip', 'wpdev-flatpicker', 'wpdev-flatpicker-fa', 'wpdev-jalaali', 'wpdev-block-ui', 'wpdev-accounting', 'clipboard', 'wp-hooks', 'wpdev-ajax' );

		$this->register_script(
			'wpdev-functions-utils',
			wpdev_get_module_asset_url( 'core', 'functions/functions-utils.js', 'js' ),
			$functions_deps
		);

		/*
		 * Adds General Functions
		 */
		$this->register_script(
			'wpdev-functions',
			wpdev_get_module_asset_url( 'core', 'functions/functions-core.js', 'js' ),
			array( 'wpdev-functions-utils' )
		);
		if ( function_exists( 'wp_add_inline_script' ) ) {
			wp_add_inline_script(
				'wpdev-functions',
				'window.wpdev_on_load = window.wpdev_on_load || function(){};',
				'before'
			);
		}

		$datepicker_locale = $this->resolve_datepicker_locale();

		/**
		 * Filter Flatpickr locale used by WPDev datepickers.
		 *
		 * Return `fa` or `fa-IR` for Jalali calendar UI (values stay Gregorian).
		 * Return `default` for Gregorian UI.
		 *
		 * By default, any WordPress locale matching `fa` / `fa_*` / `fa-*`
		 * (site, user, or `determine_locale()`) enables Jalali.
		 *
		 * @param string $datepicker_locale Locale key for Flatpickr.
		 * @param string $wp_locale         First matching Persian WP locale, or primary locale.
		 */
		$wp_locale_for_filter = get_locale();
		if ( function_exists( 'determine_locale' ) ) {
			$wp_locale_for_filter = determine_locale();
		} elseif ( function_exists( 'get_user_locale' ) ) {
			$wp_locale_for_filter = get_user_locale();
		}

		$datepicker_locale = apply_filters( 'wpdev_datepicker_locale', $datepicker_locale, $wp_locale_for_filter );

		wp_localize_script('wpdev-functions', 'wpdev_settings', array(
			'currency'           => wpdev_get_setting('currency_symbol', 'USD'),
			'currency_symbol'    => wpdev_get_currency_symbol(),
			'currency_position'  => wpdev_get_setting('currency_position'),
			'decimal_separator'  => wpdev_get_setting('decimal_separator'),
			'thousand_separator' => wpdev_get_setting('thousand_separator'),
			'precision'          => wpdev_get_setting('precision', 2),
			'use_container'      => get_user_setting('wpdev_use_container', false),
			'disable_image_zoom' => wpdev_get_setting('disable_image_zoom', false),
			'datepicker_locale'  => $datepicker_locale,
		));

		/*
		 * Adds Fields & Components
		 */
		$this->register_script('wpdev-fields', wpdev_get_module_asset_url('field-builder', 'fields.js', 'js'), array('jquery', 'jquery-ui-sortable', 'wpdev-vue', 'wpdev-selectizer', 'wp-color-picker'));

		/*
		 * Localize components
		 */
		wp_localize_script('wpdev-fields', 'wpdev_fields', array(
			'l10n' => array(
				'image_picker_title'       => __('Select an Image.', 'wpdev'),
				'image_picker_button_text' => __('Use this image', 'wpdev'),
			),
		));

		/*
		 * Adds Admin Script
		 */
		$this->register_script('wpdev-admin', wpdev_get_module_asset_url('core', 'admin.js', 'js'), array('jquery', 'wpdev-functions'));

		/*
		 * Adds Vue Apps
		 */
		// vue-apps.js calls `window.wubox.refresh()`, so make sure wubox loads first.
		$this->register_script('wpdev-vue-apps', wpdev_get_module_asset_url('field-builder', 'vue-apps.js', 'js'), array('wubox', 'wpdev-functions', 'wpdev-vue', 'wpdev-money-mask', 'wpdev-input-mask', 'wp-hooks', 'jquery-ui-sortable'));

		/*
		 * Adds Selectizer
		 */
		$this->register_script('wpdev-selectize', wpdev_get_module_asset_url('core', 'lib/selectize.js', 'js'), array('jquery'));
		$this->register_script('wpdev-selectizer', wpdev_get_module_asset_url('field-builder', 'selectizer.js', 'js'), array('wpdev-selectize', 'underscore', 'wpdev-vue-apps'));

		/*
		 * Localize selectizer
		 *
		 * Run after `init` so theme/plugin CPTs (e.g. professors) exist when
		 * Ajax::search_models() calls post_type_exists(). Default light ajax
		 * boots on plugins_loaded and would miss those registrations.
		 */
		wp_localize_script('wpdev-functions', 'wpdev_selectizer', array(
			'ajaxurl' => wpdev_ajax_url('init'),
		));

		/*
		 * Load variables to localized it
		 */
		wp_localize_script('wpdev-functions', 'wpdev_ticker', array(
			'server_clock_offset'          => (wpdev_get_current_time('timestamp') - time()) / 60 / 60, // phpcs:ignore
			'moment_clock_timezone_name'   => wp_date('e'),
			'moment_clock_timezone_offset' => wp_date('Z'),
		));

		/*
		 * Adds our thickbox fork.
		 */
		// wubox must be available before vue-apps; don't depend on wpdev-vue-apps.
		$this->register_script('wubox', wpdev_get_module_asset_url('core', 'wubox.js', 'js'), array());

		wp_localize_script('wubox', 'wuboxL10n', array(
			'next'             => __('Next &gt;', 'wpdev'),
			'prev'             => __('&lt; Prev', 'wpdev'),
			'image'            => __('Image', 'wpdev'),
			'of'               => __('of', 'wpdev'),
			'close'            => __('Close', 'wpdev'),
			'noiframes'        => __('This feature requires inline frames. You have iframes disabled or your browser does not support them.', 'wpdev'),
			'loadingAnimation' => includes_url('js/thickbox/loadingAnimation.gif'),
		));

		/*
		 * Multi-state conditional metaboxes driver.
		 */
		$this->register_script(
			'wpdev-metabox-conditions',
			wpdev_get_module_asset_url( 'metabox-builder', 'metabox-conditions.js', 'js' ),
			array()
		);

		/*
		 * WordPress localizes month names and all, but
		 * does not localize anything else. We need relative
		 * times to be translated, so we need to do it ourselves.
		 */
		$this->localize_moment();

	} // end register_default_scripts;

	/**
	 * Localize moment.js relative times.
	 *
	 * @since 2.0.8
	 * @return bool
	 */
	public function localize_moment() {

		$time_format = get_option('time_format', __('g:i a'));
		$date_format = get_option('date_format', __('F j, Y'));

		$long_date_formats = array_map('wpdev_convert_php_date_format_to_moment_js_format', array(
			'LT'   => $time_format,
			'LTS'  => str_replace(':i', ':i:s', (string) $time_format),
			/* translators: the day/month/year date format used by WPDev. You can changed it to localize this date format to your language. the default value is d/m/Y, which is the format 31/12/2021. */
			'L'    => __('d/m/Y', 'wpdev'),
			'LL'   => $date_format,
			'LLL'  => sprintf('%s %s', $date_format, $time_format),
			'LLLL' => sprintf('%s %s', $date_format, $time_format),
		));

		// phpcs:disable
		$strings = array(
			'relativeTime' => array(
				'future' => __('in %s', 'wpdev'),
				'past'   => __('%s ago', 'wpdev'),
				's'      => __('a few seconds', 'wpdev'),
				'ss'     => __('%d seconds', 'wpdev'),
				'm'      => __('a minute', 'wpdev'),
				'mm'     => __('%d minutes', 'wpdev'),
				'h'      => __('an hour', 'wpdev'),
				'hh'     => __('%d hours', 'wpdev'),
				'd'      => __('a day', 'wpdev'),
				'dd'     => __('%d days', 'wpdev'),
				'w'      => __('a week', 'wpdev'),
				'ww'     => __('%d weeks', 'wpdev'),
				'M'      => __('a month', 'wpdev'),
				'MM'     => __('%d months', 'wpdev'),
				'y'      => __('a year', 'wpdev'),
				'yy'     => __('%d years', 'wpdev'),
			),
			'longDateFormat' => $long_date_formats,
		);
		// phpcs:enable

		$inline_script = sprintf("moment.updateLocale( '%s', %s );", get_user_locale(), wp_json_encode($strings));

		return did_action('init') && wp_add_inline_script('moment', $inline_script, 'after');

	} // end localize_moment;

	/**
	 * Registers the default WPDev styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_default_styles() {

		$this->register_style('wpdev-styling', wpdev_get_module_asset_url('core', 'admin-layout.css', 'css'), array(), wpdev_get_version());

		$this->register_style('wpdev-admin', wpdev_get_module_asset_url('core', 'admin.css', 'css'), array('wpdev-styling'), wpdev_get_version());

		$extra_styles = apply_filters( 'wpdev_register_default_styles', array() );
		foreach ( $extra_styles as $handle => $args ) {
			$this->register_style(
				$handle,
				$args['src'],
				isset( $args['deps'] ) ? $args['deps'] : array(),
				isset( $args['ver'] ) ? $args['ver'] : wpdev_get_version()
			);
		}

	} // end register_default_styles;

	/**
	 * Loads the default admin styles.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function enqueue_default_admin_styles() {

		wp_enqueue_style('wpdev-admin');

	} // end enqueue_default_admin_styles;

	/**
	 * Loads the default admin scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function enqueue_default_admin_scripts() {

		wp_enqueue_script('wpdev-admin');

	} // end enqueue_default_admin_scripts;

	/**
	 * Update the use container setting.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function update_use_container() {

		check_ajax_referer('wpdev_toggle_container', 'nonce');

		$new_value = (bool) !(get_user_setting('wpdev_use_container', false));

		set_user_setting('wpdev_use_container', $new_value);

		wp_die();

	} // end update_use_container;

	/**
	 * Add body classes of container boxed if user has setting.
	 *
	 * @since 2.0.0
	 *
	 * @param string $classes Body classes.
	 * @return string
	 */
	public function add_body_class_container_boxed($classes) {

		if (get_user_setting('wpdev_use_container', false)) {

			$classes .= ' has-wpdev-container ';

		} // end if;

		return $classes;

	} // end add_body_class_container_boxed;

} // end class Scripts;
