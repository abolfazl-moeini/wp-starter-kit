<?php

namespace WPDevTest;

class WPML {


	public static function init() {
		global $sitepress;

		require __DIR__ . '/SitePress.php';

		$sitepress = new \SitePress();
	}
}
