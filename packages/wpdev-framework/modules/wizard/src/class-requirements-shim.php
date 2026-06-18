<?php
/**
 * Deprecated requirements stub.
 *
 * @deprecated 2.4.0 Use WPDevFramework\Requirements from inc/class-requirements.php instead.
 * @package WPDevFramework\Modules\Wizard
 */

namespace WPDevFramework\Modules\Wizard;

defined( 'ABSPATH' ) || exit;

/**
 * Alias of WPDevFramework\Requirements for backward compatibility.
 */
class Requirements extends \WPDevFramework\Requirements {
}

// Global alias for legacy code that referenced unnamespaced Requirements.
if ( ! class_exists( 'Requirements', false ) ) {
	class_alias( \WPDevFramework\Requirements::class, 'Requirements' );
}
