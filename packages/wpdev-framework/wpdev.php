<?php

/**
 * Plugin Name: WPDev Framework
 * Description: WPDev Framework — modular WordPress admin framework with optional WaaS Examples.
 * Plugin URI: https://wpdev.ir
 * Text Domain: wpdev
 * Version: 2.5.0
 * Author: Arindo Duque & WPDev
 * Author URI: https://wpdev.ir/
 * License: GPL2
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Domain Path: /lang
 * Requires at least: 5.3
 * Requires PHP: 7.4.30
 *
 * WPDev is distributed under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * any later version.
 *
 * WPDev is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with WPDev. If not, see <http://www.gnu.org/licenses/>.
 *
 * @author   Arindo Duque and WPDev
 * @category Core
 * @package  WPDev
 * @version  2.5.0
 */

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;


if ( ! defined( 'WPDEV_PLUGIN_FILE' ) ) {

	define( 'WPDEV_PLUGIN_FILE', __FILE__ );

} // end if;


/**
 * Require core file dependencies
 */
require_once __DIR__ . '/constants.php';

require_once __DIR__ . '/autoload.php';

require_once __DIR__ . '/modules/core/src/functions/dependency-bootstrap.php';

wpdev_bootstrap_dependency_manager( __DIR__ );

require_once __DIR__ . '/modules/core/src/class-autoloader.php';

require_once __DIR__ . '/modules/core/src/class-module-autoloader.php';

require_once __DIR__ . '/modules/core/src/class-legacy-shim-autoloader.php';

require_once __DIR__ . '/modules/core/dependencies/woocommerce/action-scheduler/action-scheduler.php';

require_once __DIR__ . '/modules/core/src/traits/trait-singleton.php';

require_once __DIR__ . '/modules/core/src/class-wpdev.php';

/**
 * Module autoloaders first (canonical paths), then legacy inc/ fallback.
 */
\WPDevFramework\Core\Module_Autoloader::init();

\WPDevFramework\Core\Legacy_Shim_Autoloader::init();

/**
 * Setup autoloader
 */
WPDevFramework\Autoloader::init();

/**
 * Setup activation/deactivation hooks
 */
WPDevFramework\Hooks::init();

/**
 * Initializes the WPDev class
 *
 * This function returns the WPDev class singleton, and
 * should be used to avoid declaring globals.
 *
 * @return WPDev
 * @since 2.0.0
 */
function wpdev() { // phpcs:ignore

	return WPDev::get_instance();

} // end WPDev;

add_action( 'plugins_loaded', function () {

	// Initialize and set to global for back-compat
	$GLOBALS['WPDev'] = wpdev();
} );

/**
 * Bootstrap modular WPDev core and module loader.
 *
 * @since 2.4.0
 */
require __DIR__ . '/modules/core/setup.php';
