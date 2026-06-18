<?php
/**
 * Class used for querying posts' meta data.
 *
 * @package WPDev
 * @subpackage Database\Posts
 * @since 2.0.0
 */

namespace WPDevFramework\Database\Posts;

use WPDevFramework\Database\Engine\Table;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Setup the "wpdev_postmeta" database table
 *
 * @since 2.0.0
 */
final class Posts_Meta_Table extends Table {

	/**
     * Table name
     *
     * @since 2.0.0
     * @var string
     */
	protected $name = 'postmeta';

	/**
	 * Is this table global?
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $global = true;

	/**
	 * Table current version
	 *
	 * @since 2.0.0
	 * @var string
	 */
	protected $version = '2.0.0';

	/**
	 * Posts constructor.
	 *
	 * @access public
	 * @since  2.0.0
	 * @return void
	 */
	public function __construct() {

		parent::__construct();

	} // end __construct;

	/**
	 * Setup the database schema
	 *
	 * @access protected
	 * @since  2.0.0
	 * @return void
	 */
	protected function set_schema() {

		$max_index_length = 191;

		$this->schema = "meta_id bigint(20) unsigned NOT NULL auto_increment,
		wpdev_post_id bigint(20) unsigned NOT NULL default '0',
		meta_key varchar(255) DEFAULT NULL,
		meta_value longtext DEFAULT NULL,
		PRIMARY KEY (meta_id),
		KEY wpdev_post_id (wpdev_post_id),
		KEY meta_key (meta_key({$max_index_length}))";

	} // end set_schema;

} // end class Posts_Meta_Table;
