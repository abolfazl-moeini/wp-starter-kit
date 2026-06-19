<?php

namespace WPDevTest\TestCases;

abstract class LibraryTestCase extends TestCase {

	protected $status = [
		'production'  => false,
		'development' => true,
	];

	/**
	 * @param string $file
	 *
	 * @return string
	 */
	abstract protected function version_parser( $file );

	/**
	 * @return string
	 */
	abstract protected function handle_name();



	public function tearDown() {

		parent::tearDown();

		wp_deregister_script( $this->handle_name() );
	}
}
