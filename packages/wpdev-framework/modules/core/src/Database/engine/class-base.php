<?php
/**
 * BerlinDB Base Class Wrapper
 */

namespace WPDevFramework\Database\Engine;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * The base class that all other database base classes extend.
 *
 * This class attempts to provide some universal immutability to all other
 * classes that extend it, starting with a magic getter, but likely expanding
 * into a magic call handler and others.
 *
 * @since 1.0.0
 */
class Base extends \WPDevFramework\Dependencies\BerlinDB\Database\Base {

	protected $prefix = 'wu';

} // end class Base;
