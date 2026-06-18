<?php
/**
 * Empty List Table View
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-block">

  <div class="wpdev-p-2 wpdev-flex">

    <?php if ($args['image']) : ?>

      <div class="wpdev-flex-shrink wpdev-mr-4 wpdev-items-center wpdev-justify-between wpdev-flex">

        <?php echo $args['image']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-built image HTML passed in by the list table. ?>

      </div>

    <?php endif; ?>

    <div class="wpdev-flex-grow">

      <div class="wpdev-flex wpdev-items-center wpdev-justify-between">

        <span class="wpdev-font-semibold wpdev-truncate wpdev-text-gray-700">

          <?php echo esc_html( $args['title'] ); ?>

          <?php if ($args['id']) : ?>

            <span class="wpdev-font-normal wpdev-text-xs">(#<?php echo esc_html( $args['id'] ); ?>)</span>

          <?php endif; ?>

        </span>

        <div class="wpdev-ml-2 wpdev-flex-shrink-0 wpdev-flex">

          <?php echo $args['status']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-built status badge HTML. ?>

        </div>

      </div>

      <div class="sm:wpdev-flex sm:wpdev-justify-between wpdev-mt-1">

        <div class="sm:wpdev-flex">

          <?php $first = true; foreach ($first_row as $slug => $item) : $w_classes = wpdev_get_isset($item, 'wrapper_classes', ''); ?>

            <?php if (wpdev_get_isset($item, 'url')) : ?>

              <a title="<?php echo esc_attr( wpdev_get_isset($item, 'value', '') ); ?>" href="<?php echo esc_url( $item['url'] ); ?>" class="wpdev-no-underline wpdev-flex wpdev-items-center wpdev-text-xs wp-ui-text-highlight <?php echo $first ? '' : 'sm:wpdev-mt-0 sm:wpdev-ml-6'; ?> <?php echo esc_attr( $w_classes ); ?>" <?php echo $item['label'] ? wpdev_tooltip_text( wpdev_get_isset( $item, 'label' ) ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- tooltip helper returns sanitized markup. ?>>

                <span class="<?php echo esc_attr( wpdev_get_isset( $item, 'icon' ) ); ?>"></span>

                <?php echo esc_html( $item['value'] ); ?>

              </a>

            <?php else : ?>

              <span class="wpdev-flex wpdev-items-center wpdev-text-xs wpdev-text-gray-600 <?php echo $first ? '' : 'sm:wpdev-mt-0 sm:wpdev-ml-6'; ?> <?php echo esc_attr( $w_classes ); ?>" <?php echo wpdev_get_isset($item, 'label') ? wpdev_tooltip_text($item['label']) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- tooltip helper returns sanitized markup. ?>>

                <span class="<?php echo esc_attr( wpdev_get_isset( $item, 'icon' ) ); ?>"></span>

                <?php echo esc_html( $item['value'] ); ?>

              </span>

            <?php endif; ?>

          <?php $first = false; endforeach; ?>

        </div>

        <div class="sm:wpdev-flex wpdev-items-center wpdev-text-xs wpdev-text-gray-600 sm:wpdev-mt-0">

          <?php $first = true; foreach ($second_row as $slug => $item) : $w_classes = wpdev_get_isset($item, 'wrapper_classes', ''); ?>

            <?php if (wpdev_get_isset($item, 'url')) : ?>

              <a title="<?php echo esc_attr( wpdev_get_isset($item, 'value', '') ); ?>" href="<?php echo esc_url( $item['url'] ); ?>" class="wpdev-no-underline wpdev-flex wpdev-items-center wpdev-text-xs wp-ui-text-highlight <?php echo $first ? '' : 'sm:wpdev-mt-0 sm:wpdev-ml-6'; ?> <?php echo esc_attr( $w_classes ); ?>" <?php echo $item['label'] ? wpdev_tooltip_text( wpdev_get_isset( $item, 'label' ) ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- tooltip helper returns sanitized markup. ?>>

                <span class="<?php echo esc_attr( wpdev_get_isset( $item, 'icon' ) ); ?>"></span>

                <?php echo esc_html( $item['value'] ); ?>

              </a>

            <?php else : ?>

              <span class="wpdev-flex wpdev-items-center wpdev-text-xs wpdev-text-gray-600 <?php echo $first ? '' : 'sm:wpdev-mt-0 sm:wpdev-ml-6'; ?> <?php echo esc_attr( $w_classes ); ?> " <?php echo wpdev_get_isset($item, 'label') ? wpdev_tooltip_text($item['label']) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- tooltip helper returns sanitized markup. ?>>

                <span class="<?php echo esc_attr( wpdev_get_isset( $item, 'icon' ) ); ?>"></span>

                <?php echo esc_html( $item['value'] ); ?>

              </span>

            <?php endif; ?>

          <?php $first = false; endforeach; ?>

        </div>

      </div>

    </div>

    <?php if ($args['url']) : ?>

      <div class="wpdev-flex wpdev-ml-5 wpdev-flex-shrink-0 wpdev-items-center wpdev-justify-between">

        <a href="<?php echo esc_url( $args['url'] ); ?>" title="<?php esc_attr_e('View', 'wpdev'); ?>">
          <svg class="wpdev-h-5 wpdev-w-5 wpdev-text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </a>

      </div>

    <?php endif; ?>

  </div>

</div>
