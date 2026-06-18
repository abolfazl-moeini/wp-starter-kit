<?php
/**
 * Canonical module file loader (Phase 2.9 — bypass inc/ shims at runtime).
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve a canonical public-function path from the function map entry.
 *
 * Example-owned paths use the `@examples/` logical prefix resolved by
 * `wpdev_examples_file()` / `WPDEV_EXAMPLES_DIR`.
 *
 * @since 2.8.3
 *
 * @param string $relative Path from wpdev_public_function_map().
 * @return string Absolute path, or empty when unavailable.
 */
function wpdev_resolve_public_function_path( $relative ) {

	$relative = (string) $relative;

	if ( 0 === strpos( $relative, '@examples/' ) || 0 === strpos( $relative, '/../wpdev-examples/' ) ) {
		if ( ! function_exists( 'wpdev_examples_file' ) ) {
			return '';
		}
	}

	if ( 0 === strpos( $relative, '@examples/' ) ) {
		return wpdev_examples_file( substr( $relative, strlen( '@examples/' ) ) );
	}

	// BC: older map entries used this prefix before @examples/ (2.8.4).
	if ( 0 === strpos( $relative, '/../wpdev-examples/' ) ) {
		return wpdev_examples_file( substr( $relative, strlen( '/../wpdev-examples/' ) ) );
	}

	return wpdev_path( ltrim( $relative, '/' ) );

} // end wpdev_resolve_public_function_path;

/**
 * Map of legacy inc/functions basenames to canonical module paths (relative to plugin root).
 *
 * @return array<string, string>
 */
function wpdev_public_function_map() {

	static $map = null;

	if ( null !== $map ) {
		return $map;
	}

	$map = array(
		'admin.php'           => '/modules/admin-page-builder/src/functions/admin.php',
		'ajax.php'            => '/modules/core/src/functions/ajax.php',
		'array-helpers.php'   => '/modules/core/src/functions/array-helpers.php',
		'assets.php'          => '/modules/core/src/functions/assets.php',
		'broadcast.php'       => '@examples/broadcasts/src/functions/broadcast.php',
		'checkout-form.php'   => '@examples/checkout/src/functions/checkout-form.php',
		'checkout.php'        => '@examples/checkout/src/functions/checkout.php',
		'context.php'         => '/modules/core/src/functions/context.php',
		'color.php'           => '/modules/core/src/functions/color.php',
		'countries.php'       => '/modules/core/src/functions/countries.php',
		'currency.php'        => '/modules/core/src/functions/currency.php',
		'customer.php'        => '@examples/customers/src/functions/customer.php',
		'danger.php'          => '/modules/core/src/functions/danger.php',
		'date.php'            => '/modules/core/src/functions/date.php',
		'debug.php'           => '/modules/core/src/functions/debug.php',
		'discount-code.php'   => '@examples/discount-codes/src/functions/discount-code.php',
		'documentation.php'   => '/modules/core/src/functions/documentation.php',
		'domain.php'          => '@examples/domains/src/functions/domain.php',
		'element.php'         => '/modules/admin-widget-builder/src/functions/element.php',
		'email.php'           => '@examples/emails/src/functions/email.php',
		'env.php'             => '/modules/core/src/functions/env.php',
		'event-bus.php'       => '/modules/core/src/functions/event-bus.php',
		'event.php'           => '@examples/events/src/functions/event.php',
		'financial.php'       => '@examples/payments/src/functions/financial.php',
		'form.php'            => '/modules/form-builder/src/functions/form.php',
		'fs.php'              => '/modules/core/src/functions/fs.php',
		'gateway.php'         => '@examples/gateways/src/functions/gateway.php',
		'generator.php'       => '/modules/core/src/functions/generator.php',
		'geolocation.php'     => '/modules/core/src/functions/geolocation.php',
		'helper.php'          => '/modules/core/src/functions/helper.php',
		'http.php'            => '/modules/core/src/functions/http.php',
		'invoice.php'         => '@examples/payments/src/functions/invoice.php',
		'legacy.php'          => '/modules/core/src/functions/legacy.php',
		'licensing.php'       => '/modules/core/src/functions/licensing.php',
		'limitations.php'     => '@examples/platform/src/functions/limitations.php',
		'markup-helpers.php'  => '/modules/core/src/functions/markup-helpers.php',
		'membership.php'      => '@examples/memberships/src/functions/membership.php',
		'mock.php'            => '@examples/wpdev-dev-mock/src/functions/mock.php',
		'model.php'           => '/modules/core/src/functions/model.php',
		'number-helpers.php'  => '/modules/core/src/functions/number-helpers.php',
		'options.php'         => '/modules/settings-panel-builder/src/functions/options.php',
		'pages.php'           => '/modules/admin-page-builder/src/functions/pages.php',
		'payment.php'         => '@examples/payments/src/functions/payment.php',
		'product.php'         => '@examples/products/src/functions/product.php',
		'reflection.php'      => '/modules/core/src/functions/reflection.php',
		'rest.php'            => '/modules/core/src/functions/rest.php',
		'scheduler.php'       => '/modules/core/src/functions/scheduler.php',
		'session.php'         => '/modules/core/src/functions/session.php',
		'settings.php'        => '/modules/settings-panel-builder/src/functions/settings.php',
		'site-context.php'    => '/modules/core/src/functions/site-context.php',
		'site.php'            => '@examples/sites/src/functions/site.php',
		'sort.php'            => '/modules/core/src/functions/sort.php',
		'string-helpers.php'  => '/modules/core/src/functions/string-helpers.php',
		'sunrise.php'         => '/modules/core/src/functions/sunrise.php',
		'tab-navigation.php'  => '/modules/tab-navigation/src/functions/tab-navigation.php',
		'tax.php'             => '@examples/taxes/src/functions/tax.php',
		'template.php'        => '/modules/core/src/view/template-functions.php',
		'tour.php'            => '/modules/core/src/functions/tour.php',
		'translation.php'     => '/modules/core/src/functions/translation.php',
		'url.php'             => '/modules/core/src/functions/url.php',
		'user.php'            => '@examples/customers/src/functions/user.php',
		'webhook.php'         => '@examples/webhooks/src/functions/webhook.php',
	);

	return $map;

} // end wpdev_public_function_map;

/**
 * Require a public function file from its canonical module path.
 *
 * @since 2.5.0
 *
 * @param string $basename Basename under inc/functions (e.g. customer or customer.php).
 * @return void
 */
function wpdev_require_public_function( $basename ) {

	static $loaded = array();

	$file = basename( (string) $basename, '.php' ) . '.php';

	if ( isset( $loaded[ $file ] ) ) {
		return;
	}

	$map = wpdev_public_function_map();

	if ( ! isset( $map[ $file ] ) ) {
		if ( function_exists( '_doing_it_wrong' ) ) {
			_doing_it_wrong(
				__FUNCTION__,
				sprintf( 'Unknown public function file: %s', $file ),
				'2.5.0'
			);
		}
		return;
	}

	$path = wpdev_resolve_public_function_path( $map[ $file ] );

	if ( ! is_readable( $path ) ) {
		if ( function_exists( '_doing_it_wrong' ) ) {
			_doing_it_wrong(
				__FUNCTION__,
				sprintf( 'Canonical module path is not readable: %s', $path ),
				'2.5.0'
			);
		}
		return;
	}

	wpdev_maybe_boot_examples_autoloader_for_path( $path );

	require_once $path;
	$loaded[ $file ] = true;

} // end wpdev_require_public_function;

/**
 * Ensure example-owned classes can autoload before requiring example public functions.
 *
 * Public example functions call canonical classes such as
 * `WPDevFramework\Models\Site` and `WPDevFramework\Models\Customer`.
 * If the examples class map was built before `WPDEV_EXAMPLES_DIR` was
 * defined, those calls can fatal unless the map is refreshed.
 *
 * @since 2.8.1
 *
 * @param string $path Absolute path about to be required.
 * @return void
 */
function wpdev_maybe_boot_examples_autoloader_for_path( $path ) {

	$path = (string) $path;

	if ( false === strpos( $path, 'wpdev-examples' ) ) {
		return;
	}

	if ( ! class_exists( '\WPDevFramework\Core\Examples_Shim_Autoloader' ) ) {
		return;
	}

	static $synced_dir = null;

	$examples_dir = defined( 'WPDEV_EXAMPLES_DIR' ) ? (string) WPDEV_EXAMPLES_DIR : '';

	if ( '' === $examples_dir && preg_match( '#^(.*?/wpdev-examples)(?:/|$)#', str_replace( '\\', '/', $path ), $matches ) ) {
		$examples_dir = $matches[1];
	}

	\WPDevFramework\Core\Examples_Shim_Autoloader::init();

	if ( '' !== $examples_dir ) {
		\WPDevFramework\Core\Examples_Shim_Autoloader::set_runtime_examples_dir( $examples_dir );
		$synced_dir = $examples_dir;
	} elseif ( $synced_dir !== $examples_dir ) {
		\WPDevFramework\Core\Examples_Shim_Autoloader::reset_map();
		$synced_dir = $examples_dir;
	}

} // end wpdev_maybe_boot_examples_autoloader_for_path;

/**
 * Call a function only if it is defined, with an explicit fallback.
 *
 * Framework code in modules/ may need to call into WaaS Examples functions
 * (products, sites, gateways, etc.) that are not loaded in a framework-only
 * install. Use this helper instead of inlining `function_exists()` everywhere
 * so the safe-call pattern is consistent and easy to grep.
 *
 * @since 2.8.0
 *
 * @param string         $function Fully qualified function name.
 * @param callable|null  $fallback Callable invoked when the function is missing.
 *                               Pass `null` to receive `null` on missing.
 * @param mixed          ...$args  Arguments forwarded to the function.
 * @return mixed
 */
function wpdev_call_if_function_exists( $function, $fallback = null, ...$args ) {

	if ( function_exists( $function ) ) {
		return $function( ...$args );
	}

	return is_callable( $fallback ) ? $fallback( ...$args ) : null;

} // end wpdev_call_if_function_exists;

/**
 * Call a static method only if the class (and method) exists, with fallback.
 *
 * @since 2.8.0
 *
 * @param string         $class    Fully qualified class name.
 * @param string         $method   Static method name.
 * @param callable|null  $fallback Callable invoked when the class or method is missing.
 * @param mixed          ...$args  Arguments forwarded to the method.
 * @return mixed
 */
function wpdev_call_if_static_method_exists( $class, $method, $fallback = null, ...$args ) {

	if ( class_exists( $class ) && method_exists( $class, $method ) ) {
		return $class::$method( ...$args );
	}

	return is_callable( $fallback ) ? $fallback( ...$args ) : null;

} // end wpdev_call_if_static_method_exists;
