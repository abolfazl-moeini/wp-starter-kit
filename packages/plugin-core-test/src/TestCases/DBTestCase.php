<?php

namespace WPDevTest\TestCases;

abstract class DBTestCase extends TestCase {

	/**
	 * @var \wpdb
	 */
	public $db;

	function setUp(): void {
		global $wpdb;

		parent::setUp();

		$this->db = $wpdb;
	}


	public function __call( $name, $arguments ) {
		global $wpdb;

		$callback = [ $wpdb, $name ];

		if ( ! is_callable( $callback ) ) {

			return;
		}

		$error                 = $wpdb->suppress_errors;
		$wpdb->suppress_errors = true;

		$results = call_user_func_array( $callback, $arguments );

		$wpdb->suppress_errors = $error;

		return $results;
	}


	public function table_columns( $table_name ) {
		global $wpdb;

		$error                 = $wpdb->suppress_errors;
		$wpdb->suppress_errors = true;
		$describe = $wpdb->get_results( "DESCRIBE `{$table_name}`;" );
		$wpdb->suppress_errors = $error;

		return array_map( function ( $row ) {

			return $row->Field;

		}, $describe );
	}
}
