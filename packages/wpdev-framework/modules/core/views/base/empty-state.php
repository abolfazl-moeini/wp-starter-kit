<?php
/**
 * Empty List Table View
 *
 * @since 2.0.0
 */
?>
<div
  class="wpdev-flex wpdev-justify-center wpdev-items-center wpdev-text-center wpdev-bg-contain wpdev-bg-no-repeat wpdev--mb-12 wpdev-pb-12"
  style="background-image: url(<?php echo $display_background_image ? wpdev_get_asset('empty-state-bg.png', 'img') : ''; ?>); <?php echo $display_background_image ? "height: calc(100vh - 300px); background-position: center -30px;" : ''; ?>"
>

  <div class="wpdev-block wpdev-p-4 md:wpdev-pt-12 wpdev-self-center">

    <span class="wpdev-block wpdev-text-2xl wpdev-text-gray-600">

      <?php echo $message; ?>

    </span>

    <?php if (!empty($link_url)) : ?>

      <div class="wpdev-block wpdev-text-base wpdev-text-gray-500 wpdev-py-6">

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

      <div class="wpdev-block wpdev-text-base wpdev-text-gray-500 wpdev-py-6">

        <?php echo $sub_message; ?>

      </div>

    <?php endif; ?>

  </div>

</div>
