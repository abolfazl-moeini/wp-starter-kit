<?php
/**
 * Displays the Toolbox UI.
 *
 * @package WPDev/Views
 * @subpackage Toolbox
 * @since 2.0.0
 */

?>

<div id="wpdev-toolbox" class="wpdev-styling">

  <div
    class="wpdev-fixed wpdev-bottom-0 wpdev-right-0 wpdev-mr-4 wpdev-mb-4 wpdev-bg-white wpdev-px-4 wpdev-py-2 wpdev-pl-2 wpdev-shadow-md wpdev-rounded-full wpdev-uppercase wpdev-text-xs wpdev-text-gray-700">

    <ul class="wpdev-inline-block wpdev-m-0 wpdev-p-0 wpdev-align-middle wpdev-mx-1">
      <li class="wpdev-inline-block wpdev-m-0 wpdev-p-0">
        <span id="wpdev-toolbox-toggle" class="dashicons-before dashicons-wpdev-wpdev" <?php echo wpdev_tooltip_text(__('Toggle Toolbox', 'wpdev')); ?>></span>
      </li>
    </ul>

    <ul id="wpdev-toolbox-links" class="wpdev-inline-block wpdev-m-0 wpdev-p-0 wpdev-align-middle wpdev-mx-1">

      <?php if ( $current_site ) : ?>

      <li class="wpdev-inline-block wpdev-m-0 wpdev-p-0 wpdev-px-2">

        <a href="<?php echo esc_url( wpdev_network_admin_url( 'wpdev-edit-site', array( 'id' => $current_site->get_id() ) ) ); ?>"
          class="wpdev-inline-block wpdev-uppercase wpdev-text-gray-600 wpdev-no-underline">
          <span title="<?php esc_attr_e('Current Site', 'wpdev'); ?>"
            class="dashicons-wpdev-browser wpdev-text-sm wpdev-w-auto wpdev-h-auto wpdev-align-text-bottom wpdev-relative"></span>
          <span class="">
            <?php echo esc_html( $current_site->get_title() ); ?>
          </span>
        </a>

      </li>

      <?php endif; ?>

      <?php if ($customer) : ?>

        <li class="wpdev-inline-block wpdev-m-0 wpdev-p-0 wpdev-px-2">

          <a href="<?php echo esc_url( wpdev_network_admin_url( 'wpdev-edit-customer', array( 'id' => $customer->get_id() ) ) ); ?>"
            class="wpdev-inline-block wpdev-uppercase wpdev-text-gray-600 wpdev-no-underline">
            <span title="<?php esc_attr_e('Current Customer', 'wpdev'); ?>"
              class="dashicons-wpdev-user wpdev-text-sm wpdev-w-auto wpdev-h-auto wpdev-align-text-bottom wpdev-relative"></span>
            <span class="">
              <?php echo esc_html( $customer->get_display_name() ); ?>
            </span>
          </a>

        </li>

      <?php endif; ?>

      <?php if ($membership) : ?>

        <li class="wpdev-inline-block wpdev-m-0 wpdev-p-0 wpdev-px-2">

          <a href="<?php echo esc_url( wpdev_network_admin_url( 'wpdev-edit-membership', array( 'id' => $membership->get_id() ) ) ); ?>"
            class="wpdev-inline-block wpdev-uppercase wpdev-text-gray-600 wpdev-no-underline">
            <span title="<?php esc_attr_e('Current Membership', 'wpdev'); ?>"
              class="dashicons-wpdev-circular-graph wpdev-text-sm wpdev-w-auto wpdev-h-auto wpdev-align-text-bottom wpdev-relative"></span>
            <span class="">
              <?php
              printf(
                /* translators: %s: membership hash */
                esc_html__( 'Membership %s', 'wpdev' ),
                esc_html( $membership->get_hash() )
              );
              ?>
            </span>
            <span id="wpdev-toolbox-membership-status" class="wpdev-inline-block wpdev-w-3 wpdev-h-3 wpdev-rounded-full wpdev-align-text-top <?php echo esc_attr($membership->get_status_class()); ?>" <?php echo wpdev_tooltip_text($membership->get_status_label()); ?>>
              &nbsp;
            </span>
          </a>

        </li>

      <?php endif; ?>

    </ul>

    <ul class="wpdev-inline-block wpdev-m-0 wpdev-p-0 wpdev-align-middle wpdev-mx-1">
      <li class="wpdev-inline-block wpdev-m-0 wpdev-p-0">

        <a id="wpdev-jumper-button-trigger" href="#"
          class="wpdev-inline-block wpdev-uppercase wpdev-text-gray-600 wpdev-no-underline">
          <span title="<?php esc_attr_e('Jumper', 'wpdev'); ?>"
            class="dashicons dashicons-wpdev-flash wpdev-text-sm wpdev-w-auto wpdev-h-auto wpdev-align-text-top wpdev-relative wpdev--mr-1"></span>
          <span class="wpdev-font-bold">
            <?php esc_attr_e('Jumper', 'wpdev'); ?>
          </span>
        </a>

      </li>
    </ul>

  </div>

</div>

<script>
if (typeof jQuery !== 'undefined') {
  (function($) {
    $(document).ready(function() {
      $('body').on('click', '#wpdev-toolbox-toggle', function() {
        $(this).parents('#wpdev-toolbox').toggleClass('wpdev-toolbox-closed');
      });
    });
  })(jQuery);
} // end if;
</script>

<style>
#wpdev-toolbox-links {
  transition: width 2s;
}
.wpdev-toolbox-closed #wpdev-toolbox-links {
  transition: width 2s;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
#wpdev-toolbox-membership-status {
  margin-top: 2px;
}
</style>
