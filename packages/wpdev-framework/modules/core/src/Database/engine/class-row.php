<?php
/**
 * Base Custom Database Row Class.
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
class Row extends \WPDevFramework\Dependencies\BerlinDB\Database\Row {

	protected $prefix = 'wu';

} // end class Row;
