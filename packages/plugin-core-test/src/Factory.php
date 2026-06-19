<?php

namespace WPDevTest;

#[\AllowDynamicProperties]
class Factory extends \WP_UnitTest_Factory {

	public function __construct() {

		parent::__construct();

		do_action( 'WPDevTest/Factory', $this );
	}
}
