<?php
/**
 * Relationship metabox body.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @var string               $field_key
 * @var array<string, mixed> $schema
 * @var array<int, int>      $ids
 * @var string               $json
 * @var array<int, object>   $candidates
 */

defined( 'ABSPATH' ) || exit;

$limit    = isset( $schema['limit'] ) ? (int) $schema['limit'] : 20;
$selected = array_map( 'intval', $ids );
?>
<div class="wpdev-advanced-field" data-wpdev-advanced="relationship" data-wpdev-limit="<?php echo esc_attr( (string) $limit ); ?>">
	<input type="hidden" data-wpdev-advanced-store name="wpdev_advanced_fields[<?php echo esc_attr( $field_key ); ?>]" value="<?php echo esc_attr( $json ); ?>">
	<div class="wpdev-advanced-rel">
		<?php if ( array() === $candidates ) : ?>
			<p><?php echo esc_html__( 'No published items are available.', 'wpdev' ); ?></p>
		<?php else : ?>
			<?php foreach ( $candidates as $candidate ) : ?>
				<?php
				if ( ! is_object( $candidate ) || empty( $candidate->ID ) ) {
					continue;
				}
				$candidate_id = (int) $candidate->ID;
				$title        = isset( $candidate->post_title ) && '' !== $candidate->post_title ? $candidate->post_title : '#' . $candidate_id;
				?>
				<label>
					<input type="checkbox" data-wpdev-rel-id="<?php echo esc_attr( (string) $candidate_id ); ?>" <?php checked( in_array( $candidate_id, $selected, true ) ); ?>>
					<?php echo esc_html( $title ); ?>
				</label>
			<?php endforeach; ?>
		<?php endif; ?>
	</div>
</div>
