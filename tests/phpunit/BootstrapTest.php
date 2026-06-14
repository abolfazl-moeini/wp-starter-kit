<?php

use PHPUnit\Framework\TestCase;

class BootstrapTest extends TestCase
{
    public function test_wordpress_function_stubs_are_available(): void
    {
        $functions = [
            'add_action',
            'add_filter',
            'do_action',
            'wp_enqueue_script',
            'wp_register_script',
            'wp_localize_script',
            'get_template_directory',
            'get_template_directory_uri',
            'plugins_url',
            'wp_create_nonce',
            'rest_url',
            'sanitize_url',
            'untrailingslashit',
        ];

        foreach ($functions as $function) {
            $this->assertTrue(function_exists($function), "Expected stub for {$function}");
        }
    }
}