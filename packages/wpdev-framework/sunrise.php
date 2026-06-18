<?php
// WPDev Starts #
/**
 * WPDev Sunrise
 * Plugin URI: https://wpdev.ir
 * Version: 2.0.0.6
 * Author: Arindo Duque
 * Author URI: https://wpdev.ir
 * License: GPLv2
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 *
 * WordPress Core has a few ways of allowing plugin developers to run things earlier in the app lifecycle.
 * One of this ways is to place a sunrise.php file inside the wp-content directory while setting
 * The SUNRISE constant to true.
 *
 * This tells WordPress that it should load our sunrise file before plugins get loaded and
 * the request is processed. We use this great power to handle domain mapping logic and more.
 *
 * @since 2.0.0.5 Adds a network admin notice warning that sunrise is still active when wpdev is deactivated.
 * @since 2.0.0.5 Change return statement to a continue statement to prevent an early exit from the file.
 *
 * @author      Arindo Duque
 * @category    WPDev
 * @package     WPDev/Sunrise
 * @version     2.0.0.5
 */

defined('ABSPATH') || exit;

define('WPDEV_SUNRISE_VERSION', '2.5.0');

$wpdev_sunrise = defined('WP_PLUGIN_DIR')
	? WP_PLUGIN_DIR . '/wpdev/modules/wizard/src/class-sunrise.php'
	: WP_CONTENT_DIR . '/plugins/wpdev/modules/wizard/src/class-sunrise.php';

$wpdev_mu_sunrise = defined('WPMU_PLUGIN_DIR')
	? WPMU_PLUGIN_DIR . '/wpdev/modules/wizard/src/class-sunrise.php'
	: WP_CONTENT_DIR . '/mu-plugins/wpdev/modules/wizard/src/class-sunrise.php';

$possible_sunrises = array(
	$wpdev_sunrise,
	$wpdev_mu_sunrise,
);

foreach ($possible_sunrises as $sunrise) {

	if (file_exists($sunrise)) {

		if ($sunrise === $wpdev_mu_sunrise) {

		 /**
		  * Use a particular function that is defined
		  * after mu-plugins are loaded but before regular plugins
		  * to check if we are being loaded in a must-use context.
		  */
			define('WPDEV_IS_MUST_USE', true);

		} // end if;

		require_once $sunrise;

		define('WPDEV_SUNRISE_FILE', $sunrise);

		WPDevFramework\Sunrise::init();

		add_action('network_admin_notices', 'wpdev_remove_sunrise_warning', 0);

		continue; // Exit the loop;

	} // end if;

} // end if;

/**
 * Include Mercator.
 *
 * This is here purely for backwards compatibility reasons.
 * The file included here is a dumb file in version 2.0.7+.
 *
 * @since 2.0.7
 */
$wpdev_mercator = '';

if ( defined( 'WP_PLUGIN_DIR' ) ) {
	$examples_paths = WP_PLUGIN_DIR . '/wpdev-examples/includes/examples-paths.php';

	if ( is_readable( $examples_paths ) ) {
		require_once $examples_paths;
		$wpdev_mercator = wpdev_examples_file( 'domains/src/mercator/mercator.php' );
	}
}

if ( '' === $wpdev_mercator && defined( 'WP_PLUGIN_DIR' ) ) {
	$wpdev_mercator = WP_PLUGIN_DIR . '/wpdev-examples/domains/src/mercator/mercator.php';
}

if ( '' === $wpdev_mercator ) {
	$wpdev_mercator = WP_CONTENT_DIR . '/plugins/wpdev-examples/domains/src/mercator/mercator.php';
}

if ( '' !== $wpdev_mercator && is_readable( $wpdev_mercator ) ) {
	require $wpdev_mercator;
} // end if;

/**
 * Adds a warning when WPDev is not present but the sunrise file is.
 *
 * @since 2.0.0
 * @return void
 */
function wpdev_remove_sunrise_warning() {

	if ( function_exists( 'wpdev' ) === false) {

	?>

	<div class="notice notice-warning">
		<p>
			WPDev is deactivated, yet its <strong>sunrise.php</strong> file is still being loaded. If you have no intentions of continuing to use WPDev and this was not a temporary deactivation, we recommend removing the <code>define('SUNRISE', true);</code> line from your <strong>wp-config.php</strong> file. Keeping WPDev <strong>sunrise.php</strong> file active without WPDev can lead to unexpected behaviors and it is not advised.
		</p>
	</div>

	<?php

	} // end if;

} // end wpdev_remove_sunrise_warning;

// WPDev Ends #
