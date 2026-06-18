<?php
/**
 * Grid item view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-border-transparent wpdev-flex wpdev-flex-col wpdev-justify-end" tabindex="0">

  <div class="wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-pb-8 wpdev-bg-white wpdev-flex wpdev-flex-col wpdev-h-full" >

    <div class="wpdev-relative wpdev-flex-grow">

			<?php
			$featured_image = $item->get_featured_image('wpdev-thumb-medium');

			if ($featured_image) {
			?>
				<img
					style="opacity: 0.6; height: 16rem;"
					class="wpdev-w-full"
					src="<?php echo esc_url( $featured_image ); ?>"
				/>

				<div class="wpdev-my-4 wpdev-mx-3 wpdev-inline-block wpdev-absolute wpdev-bottom-0 wpdev-right-0 wpdev-rounded wpdev-px-2 wpdev-py-1 wpdev-uppercase wpdev-text-xs wpdev-font-bold <?php echo esc_attr($item->get_type_class()); ?>">
					<?php echo esc_html( $item->get_type_label() ); ?>
				</div>
			<?php
			} else {
			?>
				<div class="wpdev-w-full wpdev-bg-gray-200 wpdev-rounded wpdev-text-gray-600 wpdev-flex wpdev-items-center wpdev-justify-center wpdev-mr-3" style="height: 16rem;">
					<span class="dashicons-wpdev-image wpdev-text-6xl"></span>
				</div>

				<div class="wpdev-my-4 wpdev-mx-3 wpdev-inline-block wpdev-absolute wpdev-bottom-0 wpdev-right-0 wpdev-rounded wpdev-px-2 wpdev-py-1 wpdev-uppercase wpdev-text-xs wpdev-font-bold <?php echo esc_attr($item->get_type_class()); ?>">
					<?php echo esc_html( $item->get_type_label() ); ?>
				</div>
			<?php
			}
			?>


    </div>

    <div class="wpdev-text-base wpdev-mt-1 wpdev-px-3 wpdev-mt-3">

      <div>
        <span class="wpdev-font-semibold"><?php echo esc_html( $item->get_name() ); ?></span>
        <!-- <small><?php echo esc_html( $item->get_price_description() ); ?></small> -->
      </div>

      <div class="wpdev-text-xs wpdev-my-1">
        <?php echo esc_html( $item->get_price_description() ); ?>
      </div>

    </div>

    <div class="site-secondary-info wpdev-mt-3"></div>

    <div class="wpdev-flex wpdev-justify-between wpdev-items-center wpdev--mb-8 wpdev-p-4 wpdev-bg-gray-100 wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0">

        <!-- <label>
          <input class="wpdev-rounded-none" type="checkbox" name="bulk-delete[]" value="<?php echo esc_attr( $item->get_id() ); ?>" />
          <?php _e( 'Select Site', 'wpdev' ); ?>
        </label> -->

        <a href="<?php echo wpdev_network_admin_url('wpdev-edit-product', array('id' => $item->get_id())); ?>" class="button button-primary">
          <?php _e('Read More', 'wpdev'); ?>
        </a>

    </div>
  </div>
</div>
