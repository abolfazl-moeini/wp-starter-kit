<?php
/**
 * Ready view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-bg-white wpdev-p-4 wpdev--mx-6 wpdev-flex wpdev-content-center" style="height: 400px;">

  <div class="wpdev-self-center wpdev-text-center wpdev-w-full">

    <span class="dashicons dashicons-warning wpdev-w-auto wpdev-h-auto wpdev-text-5xl wpdev-mb-2"></span>

    <h1 class="wpdev-text-gray-800">
      <?php _e('Caution!', 'wpdev'); ?>
    </h1>

    <p class="wpdev-text-lg wpdev-text-gray-600 wpdev-my-4">
      <?php _e('This action is irreversible and may cause unexpected behavior in your data, be sure of what you are doing and have a backup in case of some trouble!', 'wpdev'); ?>
    </p>

    <p class="wpdev-text-lg wpdev-text-gray-600 wpdev-my-4">
      <?php _e('This will forcely rerun our Migration Wizard on your installation. If you tried to migrate after install but your v1 data is missing, this can resolve.', 'wpdev'); ?>
    </p>

  </div>

</div>

<!-- Submit Box -->
<div class="wpdev-bg-gray-100 wpdev--m-in wpdev-mt-4 wpdev-p-4 wpdev-overflow-hidden wpdev-border-t wpdev-border-solid wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300">

  <span class="wpdev-float-right">

    <button name="next" value="1" class="wpdev-next-button button button-primary button-large wpdev-ml-2">
      <?php _e('Proceed', 'wpdev'); ?>
    </button>

  </span>

</div>
<!-- End Submit Box -->

