<?php
/**
 * Empty List Table View
 *
 * @since 2.0.0
 */
?>
<div
  class="wpdev-row wpdev-justify-center wpdev-items-center wpdev-type-center wpdev-surface-contain wpdev-surface-no-repeat wpdev--mb-12 wpdev-pad-b-12"
  style="background-image: url(<?php echo $display_background_image ? wpdev_get_asset('empty-state-bg.png', 'img') : ''; ?>); <?php echo $display_background_image ? "height: calc(100vh - 300px); background-position: center -30px;" : ''; ?>"
>

  <div class="wpdev-block wpdev-pad-4 md:wpdev-pad-t-12 wpdev-self-center">

    <span class="wpdev-block wpdev-type-2xl wpdev-type-gray-600">

      <?php echo $message; ?>

    </span>

    <?php if (!empty($link_url)) : ?>

      <div class="wpdev-block wpdev-type-base wpdev-type-gray-500 wpdev-pad-y-6">

        <?php echo $sub_message; ?>

      </div>

      <div>

        <a
          href="<?php echo esc_attr($link_url); ?>"
          title="<?php echo esc_attr($link_label); ?>"
          class="button button-primary button-hero <?php echo esc_attr($link_classes); ?>"
        >

          <?php if (!empty($link_icon)) : ?>

            <span class="<?php echo esc_attr($link_icon); ?> wpdev-align-middle"></span>

          <?php endif; ?>

          <?php echo $link_label; ?>

        </a>

      </div>

    <?php else : ?>

      <div class="wpdev-block wpdev-type-base wpdev-type-gray-500 wpdev-pad-y-6">

        <?php echo $sub_message; ?>

      </div>

    <?php endif; ?>

  </div>

</div>
