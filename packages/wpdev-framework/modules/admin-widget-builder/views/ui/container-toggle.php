<?php
/**
 * Jumper trigger view.
 *
 * @since 2.0.0
 */
?>
<small>
  <strong>
    <a id="wpdev-container-toggle" role="tooltip" aria-label='<?php _e('Toggle container', 'wpdev'); ?>' href="#" class="wpdev-tooltip wpdev-inline-block wpdev-py-1 wpdev-pl-2 md:wpdev-pr-3 wpdev-uppercase wpdev-text-gray-600 wpdev-no-underline">

      <span title="<?php esc_attr_e('Boxed', 'wpdev'); ?>" class="wpdev-use-container dashicons dashicons-wpdev-arrow-with-circle-left wpdev-text-sm wpdev-w-auto wpdev-h-auto wpdev-align-text-bottom wpdev-relative"></span>
      <span class="wpdev-font-bold wpdev-use-container">
        <?php esc_attr_e('Boxed', 'wpdev'); ?>
      </span>

      <span title="<?php esc_attr_e('Boxed', 'wpdev'); ?>" class="wpdev-no-container dashicons dashicons-wpdev-arrow-with-circle-right wpdev-text-sm wpdev-w-auto wpdev-h-auto wpdev-align-text-bottom wpdev-relative"></span>
      <span class="wpdev-font-bold wpdev-no-container">
        <?php esc_attr_e('Wide', 'wpdev'); ?>
      </span>

    </a>
  </strong>
</small>

<style>
body.has-wpdev-container .wpdev-no-container {
  display: none;
}
body:not(.has-wpdev-container) .wpdev-use-container {
  display: none;
}
</style>

<script>
(function($) {

  $(document).ready(function() {

    $('#wpdev-container-toggle').on('click', function(e) {

      e.preventDefault();

      wpdev_block_ui('#wpcontent');

      $.ajax(ajaxurl + '?action=wpdev_toggle_container&nonce=<?php echo wp_create_nonce('wpdev_toggle_container'); ?>').done(function() {

        $('.wrap').toggleClass('admin-lg:wpdev-container admin-lg:wpdev-mx-auto');

        $('body').toggleClass('has-wpdev-container');

        wpdev_block_ui('#wpcontent').unblock();

      });;

    });

  });

}(jQuery));
</script>
