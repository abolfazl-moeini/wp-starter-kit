<?php
/**
 * ExampleFeature sample partial — reads vars via Template APIs.
 *
 * Set vars before load:
 *   Template::set_variable('notice', ['message' => '...', 'type' => 'info']);
 * or namespaced functions:
 *   set_template_variable('notice', ...);
 *
 * @package WPDev\Modules\ExampleFeature
 */

use function WPDev\Support\Templates\get_template_variable;

$notice = get_template_variable('notice');
if (!is_array($notice)) {
    return;
}

$message = isset($notice['message']) ? (string) $notice['message'] : '';
$type = isset($notice['type']) ? (string) $notice['type'] : 'info';
$type_class = preg_replace('/[^a-z0-9_-]/i', '', $type) ?: 'info';
?>
<div class="wpdev-example-notice wpdev-example-notice--<?php echo esc_attr($type_class); ?>" role="status">
	<p><?php echo esc_html($message); ?></p>
</div>
