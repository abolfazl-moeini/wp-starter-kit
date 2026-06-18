<?php
/**
 * Submit box view.
 *
 * @since 2.0.0
 */
?>
<!-- Submit Box -->
<div class="wpdev-flex wpdev-justify-between wpdev-bg-gray-100 wpdev--m-in wpdev-mt-4 wpdev-p-4 wpdev-overflow-hidden wpdev-border-t wpdev-border-solid wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300">

  <a href="<?php echo esc_url($page->get_prev_section_link()); ?>" class="wpdev-self-center button button-large wpdev-float-left">
    <?php _e('&larr; Go Back', 'wpdev'); ?>
  </a>

  <span class="wpdev-self-center wpdev-content-center wpdev-flex">

    <button name="submit" value="1" class="button button-primary button-large">
      <?php _e('Continue', 'wpdev'); ?>
    </button>

  </span>

</div>
<!-- End Submit Box -->
