<?php
declare(strict_types=1);

namespace WPDev\Tests\TestCases;

abstract class RestTestCase extends PluginBaseTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        global $wp_rest_server, $wp_actions;
        $wp_rest_server = null;
        unset($wp_actions['rest_api_init']);
        rest_get_server();
    }
}