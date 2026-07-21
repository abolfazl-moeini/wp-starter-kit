<?php
/**
 * Test fixture partial — fires callback stored in template vars.
 */

use function WPDev\Support\Templates\get_template_variable;

$callback = get_template_variable('mock_callback');
if (is_callable($callback)) {
    $callback();
}
