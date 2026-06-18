<?php
/**
 * Simple KPI widget for playground demos.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.7.0
 */
?>
<div class="wpdev-styling wpdev-text-center wpdev-p-4">
	<p style="font-size:28px;font-weight:bold;margin:0;"><?php echo esc_html( (string) ( $value ?? '—' ) ); ?></p>
	<p class="description" style="margin:8px 0 0;"><?php echo esc_html( (string) ( $label ?? '' ) ); ?></p>
</div>
