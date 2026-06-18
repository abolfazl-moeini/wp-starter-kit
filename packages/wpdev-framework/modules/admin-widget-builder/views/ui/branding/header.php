<?php
/**
 * Branding header view.
 *
 * @since 2.0.0
 */
?>
<div id="wpdev-header" class="wpdev-px-4 wpdev--ml-5 wpdev-bg-white wpdev-border-0 wpdev-border-gray-300 wpdev-border-b wpdev-border-solid wpdev-pb-3 sm:wpdev-py-3 sm:wpdev-pt-3 wpdev-hidden sm:wpdev-flex">

  <div class="wpdev-w-7/12 wpdev-self-center">

    <span class="dashicons-before dashicons-wpdev-wpdev"></span>

    <div class="wpdev-text-gray-600 wpdev-uppercase wpdev-text-xs wpdev-font-bold wpdev-align-middle wpdev-ml-2 wpdev-hidden md:wpdev-inline-block">

      <?php if (wpdev()->is_loaded()) : ?>

        <div class="wpdev-hidden md:wpdev-inline-block">

          <?php

          /**
           * Allow plugin developers to add more elements on left header container.
           *
           * @since 2.0.0
           *
           * @param \WPDevFramework\Admin_Pages\Base_Admin_Page $page WPDev admin page instance.
           */
          do_action('wpdev_header_left', $page);

          ?>

        </div>

      <?php endif; ?>

    </div>

  </div>

  <div class="wpdev-w-5/12 wpdev-text-right wpdev-self-center">

    <?php if (wpdev()->is_loaded()) : ?>

      <?php

      /**
       * Allow plugin developers to add more elements on right header container.
       *
       * @since 2.0.0
       *
       * @param \WPDevFramework\Admin_Pages\Base_Admin_Page $page WPDev admin page instance.
       */
      do_action('wpdev_header_right', $page);

      ?>

      <small class="wpdev-ticker-container wpdev-hidden md:wpdev-inline-block">
        <strong>
          <span class="wpdev-inline-block wpdev-bg-gray-200 wpdev-rounded-full wpdev-py-1 wpdev-pl-2 wpdev-pr-3 wpdev-uppercase">
            <span title="<?php esc_attr_e('Server Clock', 'wpdev'); ?>" class="dashicons dashicons-wpdev-clock wpdev-text-sm wpdev-w-auto wpdev-h-auto wpdev-align-text-top wpdev-mr-1 wpdev-relative"></span>
            <span id="wpdev-ticker" class="wpdev-font-mono wpdev-font-normal">
              <?php echo gmdate('Y-m-d H:i:s', wpdev_get_current_time('timestamp')); ?>
            </span>
          </span>
        </strong>
      </small>

    <?php endif; ?>

  </div>

</div>
