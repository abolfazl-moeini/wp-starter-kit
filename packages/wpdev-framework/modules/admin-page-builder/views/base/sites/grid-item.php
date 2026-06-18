<?php
/**
 * grid item view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-border-transparent" tabindex="0">

  <div class="wpdev-grid-item wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-pb-8 wpdev-bg-white">

    <div class="wpdev-relative wpdev-bg-gray-100" style="max-height: 220px; overflow: hidden;">

      <img
        style="opacity: 0.6;"
        class="wpdev-w-full wpdev-h-auto wpdev-image-preview"
        data-image="<?php echo esc_attr( $item->get_featured_image('large') ); ?>"
        src="<?php echo esc_url( $item->get_featured_image('wpdev-thumb-medium') ); ?>"
      />

      <?php if (current_user_can('wpdev_read_sites')) : ?>

        <div class="wpdev-my-4 wpdev-mx-3 wpdev-inline-block wpdev-absolute wpdev-bottom-0 wpdev-right-0 wpdev-rounded wpdev-px-2 wpdev-py-1 wpdev-uppercase wpdev-text-xs wpdev-font-bold <?php echo esc_attr($item->get_type_class()); ?>">
          <?php echo esc_html( $item->get_type_label() ); ?>
        </div>

      <?php endif; ?>

    </div>

    <div class="wpdev-text-base wpdev-px-3 wpdev-my-3">

      <div>
        <span class="wpdev-font-semibold"><?php echo esc_html( $item->get_title() ); ?></span>
        <small><?php echo $item->get_id() ? esc_html( '#' . $item->get_id() ) : ''; ?></small>
      </div>

      <div class="wpdev-text-xs wpdev-my-1">
        <a class="wpdev-no-underline" href="<?php echo esc_url( $item->get_active_site_url() ); ?>"><?php echo esc_html( $item->get_active_site_url() ); ?></a>
      </div>

    </div>

    <div class="wpdev-flex wpdev-justify-between wpdev-items-center wpdev--mb-8 wpdev-p-4 wpdev-bg-gray-100 wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0">

        <?php if ($item->get_type() !== 'main') : ?>

          <?php if ($item->get_type() === 'pending') : ?>

            <label>
              <input class="wpdev-rounded-none" type="checkbox" name="bulk-delete[]" value="<?php echo esc_attr( $item->get_membership_id() ); ?>" />
              <?php _e( 'Select Site', 'wpdev' ); ?>
            </label>

            <a title="<?php echo esc_attr(__('Publish pending site', 'wpdev')); ?>" href="<?php echo wpdev_get_form_url('publish_pending_site', array('membership_id' => $item->get_membership_id())); ?>" class="wubox button button-primary">
              <?php _e('Publish Site', 'wpdev'); ?>
            </a>

          <?php else : ?>

            <label>
              <input class="wpdev-rounded-none" type="checkbox" name="bulk-delete[]" value="<?php echo esc_attr( $item->get_id() ); ?>" />
              <?php _e( 'Select Site', 'wpdev' ); ?>
            </label>

            <a href="<?php echo wpdev_network_admin_url('wpdev-edit-site', array('id' => $item->get_id())); ?>" class="button button-primary">
              <?php _e('Manage', 'wpdev'); ?>
            </a>

          <?php endif; ?>

        <?php else : ?>

          <span>&nbsp;</span>

          <a href="<?php echo wpdev_network_admin_url('wpdev-edit-site', array('id' => $item->get_id())); ?>" class="button button-primary">
            <?php _e('See Main Site', 'wpdev'); ?>
          </a>

        <?php endif; ?>

    </div>
  </div>
</div>
