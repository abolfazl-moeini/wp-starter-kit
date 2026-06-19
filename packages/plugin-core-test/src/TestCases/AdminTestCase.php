<?php

namespace WPDevTest\TestCases;

abstract class AdminTestCase extends TestCase {


	function setUp(): void {

		parent::setUp();

		// Go to admin panel
		set_current_screen( 'edit' );

		$this->init();
	}

	abstract public function init();
}