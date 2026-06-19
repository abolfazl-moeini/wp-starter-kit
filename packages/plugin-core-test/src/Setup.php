<?php

namespace WPDevTest;

class Setup {

	/**
	 * @var callable
	 */
	protected $setup_callback;


	public function __construct( callable $setup = null ) {

		$this->setup_callback = $setup;
	}

	/**
	 * Setup test environment.
	 *
	 * @param callable|null $setup
	 *
	 * @since 1.0.0
	 * @throws \Exception
	 */
	public static function setup( callable $setup = null ): void {

		require __DIR__ . '/functions.php';

		$instance = new self( $setup );

		$instance->define();
		$instance->hooks();
		$instance->fireup_wp();
	}

	/**
	 * Load essentials constants.
	 *
	 * @since 1.0.0
	 * @throws \Exception
	 */
	public function define(): void {

		if ( ! $root = getenv( 'PLUGIN_ROOT' ) ) {

			preg_match( '#^(.+)/vendor/#', __DIR__, $match );

			$root = $match[1] ?? '';
		}

		if ( ! $all_plugins = getenv( 'ALL_PLUGINS_ROOT' ) ) {

			$all_plugins = dirname( $root );
		}

		define( 'PLUGIN_ROOT', $root );
		define( 'ALL_PLUGINS_DIR_ABS', $all_plugins );
		define( 'TEST_DIR', dirname( debug_backtrace( ~DEBUG_BACKTRACE_PROVIDE_OBJECT )[1]['file'] ) );
	}


	/**
	 * Apply required hooks.
	 *
	 * @since 1.0.0
	 * @throws \Exception
	 */
	public function hooks(): void {

		require_once _tests_dir() . '/includes/functions.php';


		tests_add_filter( 'muplugins_loaded', [ $this, 'activate_plugins' ], 1 );
		tests_add_filter( 'muplugins_loaded', [ $this, 'mu_plugins_loaded' ] );
		tests_add_filter( 'plugins_url', [ $this, 'plugin_url' ], 20, 3 );
		//
		tests_add_filter( 'WPDev/Exit', [ $this, 'bs_exist' ] );
	}

	/**
	 * Fix Wrong Plugin URL.
	 *
	 * @hooked plugins_url
	 *
	 * @param string $url
	 *
	 * @since  1.0.0
	 * @return string
	 */
	public function plugin_url( string $url ): string {

		if ( preg_match( '/\/' . basename( PLUGIN_ROOT ) . '(.*?)$/', $url, $match ) ) {

			return site_url( $match[1] );
		}

		return $url;
	}

	/**
	 * Load the plugin.
	 *
	 * @hooked muplugins_loaded
	 *
	 * @since  1.0.0
	 */
	public function mu_plugins_loaded(): void {

		if ( $path = getenv( 'BOOTSTRAP_FILE' ) ) {

			require $path;
		}

		// load WPML plugin
		if ( getenv( 'WPML_ENABLED' ) ) {

			WPML::init();
		}

		$this->setup_callback && call_user_func( $this->setup_callback );
	}

	/**
	 * Prevent halt running scripts.
	 *
	 * @hooked WPDev/Exit
	 *
	 * @since  1.0.0
	 * @return bool
	 */
	public function bs_exist(): bool {

		$GLOBALS['bs_exit_status'] = true;

		return false;
	}

	/**
	 * Load the WordPress tests library.
	 *
	 * @since 1.0.0
	 * @throws \Exception
	 */
	public function fireup_wp(): void {
		global $config_file_path;

		require __DIR__ . '/wp-functions.php';

		require _tests_dir() . '/includes/bootstrap.php';

		require __DIR__ . '/plugins-compat.php';
	}


	public function activate_plugins() {

		global $config_file_path;

		if ( ! $plugins = getenv( 'ACTIVE_PLUGINS' ) ) {

			return;
		}

		if ( ! $plugins = realpath( $plugins ) ) {

			return;
		}

		if ( empty( $config_file_path ) ) {

			throw new \RuntimeException( '$config_file_path var not defined @ ' . _tests_dir() . '/includes/bootstrap.php' );
		}

		system( WP_PHP_BINARY . ' ' . escapeshellarg( __DIR__ . '/plugins-activate.php' ) . ' ' . escapeshellarg( $config_file_path ) . ' ' . escapeshellarg( _tests_dir() ) . ' ' . escapeshellarg( $plugins ), $retval );

		if ( 0 !== $retval ) {
			exit( $retval );
		}

		wp_cache_flush();
	}
}
