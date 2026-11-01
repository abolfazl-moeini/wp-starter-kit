<?php
/**
 * Dedicated Option Store per Settings Panel (P4).
 *
 * Each panel / settings section stores its state in its own isolated option
 * named by panel ID (option_name = {panel_id}), avoiding the giant shared
 * wpdev_v2_settings blob while providing seamless dual-read fallback.
 *
 * @package WPDevFramework\Modules\SettingsPanelBuilder
 * @since   2.15.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Modules\SettingsPanelBuilder;

use InvalidArgumentException;

defined( 'ABSPATH' ) || exit;

/**
 * Option_Store manages isolated persistence per settings panel.
 */
class Option_Store {

	/**
	 * Reserved WordPress core option names that cannot be used as panel IDs.
	 *
	 * @var array<string>
	 */
	private const RESERVED_OPTIONS = [
		'siteurl',
		'home',
		'blogname',
		'blogdescription',
		'users_can_register',
		'admin_email',
		'start_of_week',
		'use_balancetags',
		'use_smilies',
		'require_name_email',
		'comments_notify',
		'posts_per_rss',
		'rss_use_excerpt',
		'mailserver_url',
		'mailserver_login',
		'mailserver_pass',
		'mailserver_port',
		'default_category',
		'default_comment_status',
		'default_ping_status',
		'default_pingback_flag',
		'default_post_format',
		'posts_per_page',
		'date_format',
		'time_format',
		'links_updated_date_format',
		'comment_moderation',
		'moderation_notify',
		'permalink_structure',
		'rewrite_rules',
		'hack_file',
		'blog_charset',
		'moderation_keys',
		'active_plugins',
		'category_base',
		'ping_sites',
		'comment_max_links',
		'gmt_offset',
		'default_email_category',
		'recently_edited',
		'template',
		'stylesheet',
		'comment_whitelist',
		'page_for_posts',
		'page_on_front',
		'default_role',
		'wpdev_v2_settings',
	];

	/**
	 * Active instances keyed by panel ID.
	 *
	 * @var array<string, self>
	 */
	private static array $instances = [];

	/**
	 * The panel ID.
	 *
	 * @var string
	 */
	private string $panel_id;

	/**
	 * The physical option name in the database.
	 *
	 * @var string
	 */
	private string $option_name;

	/**
	 * In-memory cache for this panel.
	 *
	 * @var array<string, mixed>|null
	 */
	private ?array $cache = null;

	/**
	 * Constructor.
	 *
	 * @param string $panel_id    Logical panel ID.
	 * @param string $option_name Physical WordPress option name.
	 */
	private function __construct( string $panel_id, string $option_name ) {
		$this->panel_id    = $panel_id;
		$this->option_name = $option_name;
	}

	/**
	 * Get or create an Option_Store instance for a given panel ID.
	 *
	 * @param string $panel_id    Panel ID or section slug.
	 * @param string $option_name Optional explicit option name override.
	 * @return self
	 * @throws InvalidArgumentException When panel ID or option name collides with a reserved WP option.
	 */
	public static function for( string $panel_id, string $option_name = '' ): self {
		$clean_panel_id = sanitize_key( $panel_id );

		if ( empty( $clean_panel_id ) ) {
			throw new InvalidArgumentException( 'Panel ID cannot be empty.' );
		}

		$target_option = ! empty( $option_name ) ? sanitize_key( $option_name ) : $clean_panel_id;

		if ( self::is_reserved_option_name( $target_option ) ) {
			throw new InvalidArgumentException(
				sprintf( "Option name or Panel ID '%s' collides with a reserved WordPress option name.", $target_option )
			);
		}

		if ( ! isset( self::$instances[ $clean_panel_id ] ) ) {
			self::$instances[ $clean_panel_id ] = new self( $clean_panel_id, $target_option );
		}

		return self::$instances[ $clean_panel_id ];
	}

	/**
	 * Check whether an option name is reserved by WordPress core.
	 *
	 * @param string $name Option name to inspect.
	 * @return bool
	 */
	public static function is_reserved_option_name( string $name ): bool {
		return in_array( strtolower( trim( $name ) ), self::RESERVED_OPTIONS, true );
	}

	/**
	 * Reset in-memory instances (useful for unit testing isolation).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$instances = [];
	}

	/**
	 * Return the panel ID.
	 *
	 * @return string
	 */
	public function get_panel_id(): string {
		return $this->panel_id;
	}

	/**
	 * Return the option name.
	 *
	 * @return string
	 */
	public function get_option_name(): string {
		return $this->option_name;
	}

	/**
	 * Whether the current runtime operates in site-admin context (vs network-admin).
	 *
	 * @return bool
	 */
	private function is_site_context(): bool {
		if ( function_exists( 'wpdev_uses_site_admin_context' ) && wpdev_uses_site_admin_context() ) {
			return true;
		}

		return ! ( function_exists( 'is_multisite' ) && is_multisite() );
	}

	/**
	 * Read the raw option directly from the database or cache.
	 *
	 * @return mixed
	 */
	private function read_raw_option(): mixed {
		if ( $this->is_site_context() || ! function_exists( 'get_network_option' ) ) {
			return function_exists( 'get_option' ) ? get_option( $this->option_name, null ) : null;
		}

		return get_network_option( null, $this->option_name, null );
	}

	/**
	 * Write the raw option directly to the database.
	 *
	 * @param array $values Full options array.
	 * @return bool
	 */
	private function write_raw_option( array $values ): bool {
		if ( $this->is_site_context() || ! function_exists( 'update_network_option' ) ) {
			if ( ! function_exists( 'update_option' ) ) {
				return false;
			}
			// Enforce autoload = false (no) on dedicated panel options
			return update_option( $this->option_name, $values, false );
		}

		return update_network_option( null, $this->option_name, $values );
	}

	/**
	 * Read the legacy shared blob (wpdev_v2_settings) for BC fallback.
	 *
	 * @return array
	 */
	private function read_legacy_blob(): array {
		$legacy = null;

		if ( function_exists( 'wpdev_get_option' ) ) {
			$legacy = wpdev_get_option( 'v2_settings', null );
		}

		if ( ( null === $legacy || false === $legacy ) && function_exists( 'get_option' ) ) {
			$legacy = get_option( 'wpdev_v2_settings', null );
		}

		return is_array( $legacy ) ? $legacy : [];
	}

	/**
	 * Retrieve all stored settings for this panel.
	 *
	 * @return array
	 */
	public function all(): array {
		$raw = $this->read_raw_option();

		if ( null !== $raw && false !== $raw && is_array( $raw ) ) {
			return $raw;
		}

		// Fall back to legacy shared blob
		return $this->read_legacy_blob();
	}

	/**
	 * Retrieve a setting value for this panel with dual-read fallback.
	 *
	 * Priority order:
	 * 1. Dedicated panel option: {panel_id}
	 * 2. Legacy shared option: wpdev_v2_settings
	 * 3. Default fallback value
	 *
	 * @param string $field_name Setting / field key.
	 * @param mixed  $default    Default value if not found.
	 * @return mixed
	 */
	public function get( string $field_name = '', mixed $default = null ): mixed {
		if ( '' === $field_name ) {
			return $this->all();
		}

		$raw = $this->read_raw_option();

		if ( null !== $raw && false !== $raw && is_array( $raw ) ) {
			if ( array_key_exists( $field_name, $raw ) ) {
				return $raw[ $field_name ];
			}
		}

		// Fallback to legacy v2_settings blob
		$legacy = $this->read_legacy_blob();
		if ( array_key_exists( $field_name, $legacy ) ) {
			return $legacy[ $field_name ];
		}

		return $default;
	}

	/**
	 * Save an array of values into this panel's dedicated option.
	 *
	 * Uses Settings_Save::merge_with_saved() and Settings_Write_Lock for atomicity.
	 *
	 * @param array $values Associative array of field values.
	 * @return bool
	 */
	public function save( array $values ): bool {
		$callback = function () use ( $values ) {
			$current = $this->read_raw_option();
			$saved   = ( null !== $current && false !== $current && is_array( $current ) ) ? $current : [];
			$merged  = Settings_Save::merge_with_saved( $saved, $values );

			$success = $this->write_raw_option( $merged );
			if ( $success ) {
				$this->cache = $merged;
			}

			return $success;
		};

		global $wpdb;
		if ( class_exists( Settings_Write_Lock::class ) && is_object( $wpdb ) && method_exists( $wpdb, 'prepare' ) && method_exists( $wpdb, 'get_var' ) ) {
			return (bool) Settings_Write_Lock::run( $this->option_name, $callback );
		}

		return (bool) $callback();
	}

	/**
	 * Save a single setting into this panel's option.
	 *
	 * @param string $field_name Field key.
	 * @param mixed  $value      Value.
	 * @return bool
	 */
	public function set( string $field_name, mixed $value ): bool {
		return $this->save( [ $field_name => $value ] );
	}

	/**
	 * Delete this panel's dedicated option.
	 *
	 * @return bool
	 */
	public function delete(): bool {
		$this->cache = null;

		if ( $this->is_site_context() || ! function_exists( 'delete_network_option' ) ) {
			return function_exists( 'delete_option' ) ? delete_option( $this->option_name ) : false;
		}

		return delete_network_option( null, $this->option_name );
	}
}
