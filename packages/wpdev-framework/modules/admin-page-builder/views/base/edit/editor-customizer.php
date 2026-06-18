<?php
/**
 * Customizer editor view.
 *
 * @since 2.0.0
 */
?>
<div id="preview-stage">

  <div v-show="preview">

    <div class="wpdev-block wpdev-flex wpdev-justify-center wpdev-p-4 wpdev-py-8 wpdev-bg-white wpdev-text-center wpdev-border wpdev-border-solid wpdev-rounded wpdev-border-gray-400 wpdev-h-screen">

      <span class="wpdev-self-center wpdev-blinking-animation wpdev-text-gray-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold">

        <?php echo  _e('Loading Preview...', 'wpdev'); ?>

      </span>

    </div>

  </div>

  <div v-show="!preview" v-cloak>

    <div id="wpdev-list-table-add-new-1" class="postbox wpdev-mb-0">

      <div class="wpdev-bg-white wpdev-px-4 wpdev-py-3 wpdev-flex wpdev-items-center">

        <div class="wpdev-w-1/2">

          <span class="wpdev-text-gray-600 wpdev-my-1 wpdev-text-2xs wpdev-uppercase wpdev-font-semibold">

            <?php echo  __('Template Preview', 'wpdev'); ?>

          </span>

        </div>

      </div>

    </div>

    <div id="preview_content" class="wpdev-block wpdev-bg-gray wpdev-text-center wpdev-mb-5 wpdev-border wpdev-border-t-0 wpdev-border-solid wpdev-rounded wpdev-border-gray-400">

      <iframe id="preview-stage-iframe" class="preview-stage-iframe" width="100%" style="height: <?php echo absint( $preview_height ); ?>px;" frameborder="0" data-src="<?php echo esc_url($preview_iframe_url); ?>" src="<?php echo esc_url($preview_iframe_url); ?>"></iframe>

    </div>

  </div>

</div>
