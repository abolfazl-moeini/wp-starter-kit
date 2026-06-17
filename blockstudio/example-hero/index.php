<section <?php echo wp_kses_data( get_block_wrapper_attributes( [ 'class' => 'example-hero' ] ) ); ?>>
	<h2><?php echo esc_html( $a['heading'] ?? '' ); ?></h2>
	<?php if ( ! empty( $a['intro'] ) ) : ?>
		<p><?php echo esc_html( $a['intro'] ); ?></p>
	<?php endif; ?>
	<?php if ( ! empty( $a['showCta'] ) ) : ?>
		<p class="example-hero__cta"><?php esc_html_e( 'Call to action', 'wpdev-starter' ); ?></p>
	<?php endif; ?>
</section>