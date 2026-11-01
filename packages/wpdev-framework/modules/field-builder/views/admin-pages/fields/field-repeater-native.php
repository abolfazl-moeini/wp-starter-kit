<?php
/**
 * Vanilla repeater metabox body.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @var string               $field_key
 * @var array<string, mixed> $schema
 * @var array<int, array<string, mixed>> $rows
 * @var string               $json
 */

defined( 'ABSPATH' ) || exit;

$fields = isset( $schema['fields'] ) && is_array( $schema['fields'] ) ? $schema['fields'] : array();
?>
<div class="wpdev-advanced-field" data-wpdev-advanced="repeater" data-wpdev-max="100">
	<input type="hidden" data-wpdev-advanced-store name="wpdev_advanced_fields[<?php echo esc_attr( $field_key ); ?>]" value="<?php echo esc_attr( $json ); ?>">
	<div data-wpdev-advanced-list>
		<?php foreach ( $rows as $row ) : ?>
			<div class="wpdev-advanced-row" data-wpdev-advanced-row>
				<?php foreach ( $fields as $sub_key => $field ) : ?>
					<?php
					$value = isset( $row[ $sub_key ] ) ? $row[ $sub_key ] : '';
					$type  = isset( $field['type'] ) ? $field['type'] : 'text';
					$label = isset( $field['label'] ) ? $field['label'] : $sub_key;
					?>
					<label class="wpdev-advanced-cell">
						<span><?php echo esc_html( $label ); ?></span>
						<?php if ( 'textarea' === $type || 'wysiwyg' === $type ) : ?>
							<textarea data-wpdev-sub="<?php echo esc_attr( $sub_key ); ?>" rows="3"><?php echo esc_textarea( (string) $value ); ?></textarea>
						<?php elseif ( 'image' === $type || 'file' === $type ) : ?>
							<input data-wpdev-sub="<?php echo esc_attr( $sub_key ); ?>" type="number" min="0" step="1" value="<?php echo esc_attr( (string) $value ); ?>">
							<button type="button" class="button" data-wpdev-advanced-media><?php echo esc_html__( 'Select file', 'wpdev' ); ?></button>
						<?php else : ?>
							<input data-wpdev-sub="<?php echo esc_attr( $sub_key ); ?>" type="text" value="<?php echo esc_attr( (string) $value ); ?>">
						<?php endif; ?>
					</label>
				<?php endforeach; ?>
				<button type="button" class="button-link-delete" data-wpdev-advanced-remove><?php echo esc_html__( 'Remove row', 'wpdev' ); ?></button>
			</div>
		<?php endforeach; ?>
	</div>
	<template data-wpdev-advanced-prototype>
		<div class="wpdev-advanced-row" data-wpdev-advanced-row>
			<?php foreach ( $fields as $sub_key => $field ) : ?>
				<?php
				$type  = isset( $field['type'] ) ? $field['type'] : 'text';
				$label = isset( $field['label'] ) ? $field['label'] : $sub_key;
				?>
				<label class="wpdev-advanced-cell">
					<span><?php echo esc_html( $label ); ?></span>
					<?php if ( 'textarea' === $type || 'wysiwyg' === $type ) : ?>
						<textarea data-wpdev-sub="<?php echo esc_attr( $sub_key ); ?>" rows="3"></textarea>
					<?php elseif ( 'image' === $type || 'file' === $type ) : ?>
						<input data-wpdev-sub="<?php echo esc_attr( $sub_key ); ?>" type="number" min="0" step="1" value="0">
						<button type="button" class="button" data-wpdev-advanced-media><?php echo esc_html__( 'Select file', 'wpdev' ); ?></button>
					<?php else : ?>
						<input data-wpdev-sub="<?php echo esc_attr( $sub_key ); ?>" type="text" value="">
					<?php endif; ?>
				</label>
			<?php endforeach; ?>
			<button type="button" class="button-link-delete" data-wpdev-advanced-remove><?php echo esc_html__( 'Remove row', 'wpdev' ); ?></button>
		</div>
	</template>
	<button type="button" class="button" data-wpdev-advanced-add><?php echo esc_html__( 'Add row', 'wpdev' ); ?></button>
</div>
