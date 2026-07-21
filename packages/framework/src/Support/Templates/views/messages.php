<?php
/**
 * Default messages partial for Template::render_messages().
 *
 * Expects template var "messages": list of { code, message, type }.
 *
 * @package WPDev\Support\Templates
 */

use function WPDev\Support\Templates\get_template_variable;

$messages = get_template_variable('messages');
?>
<div class="wpdev-messages">
	<?php if (is_array($messages) && $messages !== []) : ?>
		<?php foreach ($messages as $message) : ?>
			<?php
			if (!is_array($message)) {
				continue;
			}
			$type = empty($message['type']) ? 'error' : (string) $message['type'];
			$code = isset($message['code']) ? (string) $message['code'] : '';
			$text = isset($message['message']) ? (string) $message['message'] : '';
			$type_class = preg_replace('/[^a-z0-9_-]/i', '', $type) ?: 'error';
			?>
			<div class="wpdev-<?php echo esc_attr($type_class); ?>-item wpdev-<?php echo esc_attr($type_class); ?>-<?php echo esc_attr($code); ?>">
				<?php echo esc_html($text); ?>
			</div>
		<?php endforeach; ?>
	<?php endif; ?>
</div>
