<?php
/**
 * Dash view.
 *
 * @since 2.0.0
 */
?>
<div id="wpdev-wrap" class="wrap wpdev-styling">

  <div class="sm:wpdev-container sm:wpdev-mx-auto">

    <h1 class="wp-heading-inline">

      <?php echo esc_html( $page_title ); ?>

      <?php
      /**
       * You can filter the get_title_link using wpdev_page_list_get_title_link, see class-wpdev-page-list.php
       *
       * @since 1.8.2
       */
      foreach ($page->get_title_links() as $action_link) :

        $action_classes = isset($action_link['classes']) ? $action_link['classes'] : '';

      ?>

        <a title="<?php echo esc_attr($action_link['label']); ?>" href="<?php echo esc_url($action_link['url']); ?>" class="page-title-action <?php echo esc_attr($action_classes); ?>">

          <?php if ($action_link['icon']) : ?>

            <span class="dashicons dashicons-<?php echo esc_attr($action_link['icon']); ?> wpdev-text-sm wpdev-align-middle wpdev-h-4 wpdev-w-4">
              &nbsp;
            </span>

          <?php endif; ?>

          <?php echo esc_html( $action_link['label'] ); ?>

        </a>

      <?php endforeach; ?>

      <?php
      /**
       * Allow plugin developers to add additional buttons to list pages
       *
       * @since 1.8.2
       * @param wpdev_Page WPDev Page instance
       */
      do_action('wpdev_page_centered_after_title', $page);
      ?>

    </h1>

    <?php if (isset($_GET['updated'])) : ?>

      <div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2">
        <p><?php echo esc_html( $labels['updated_message'] ); ?></p>
      </div>

    <?php endif; ?>

    <hr class="wp-header-end">

    <?php do_action('wpdev_centered_before_metaboxes', $page); ?>

    <?php if (apply_filters('wpdev_dashboard_display_widgets', true)) : ?>

      <div id="dashboard-widgets-wrap">

          <div id="dashboard-widgets" class="metabox-holder">

            <div class="wpdev-grid wpdev-grid-cols-1 md:wpdev-grid-cols-3 lg:wpdev-grid-cols-4">

              <div id="postbox-container" class="wpdev-order-2 md:wpdev-order-1">
                  <?php
                  /**
                   * Print Advanced Metaboxes
                   *
                   * Allow plugin developers to add new metaboxes
                   *
                   * @since 1.8.2
                   * @param object Object being edited right now
                   */
                  do_meta_boxes($screen->id, 'left', null);
                  ?>
              </div>

              <div id="postbox-container" class="md:wpdev-col-span-2 wpdev-order-1 md:wpdev-order-2">

              <?php if ($content) : ?>

                <div class="wpdev-mx-2">

                  <div id="wpdev-checkout-element" class="postbox">

                      <div class="wpdev-p-4 wpdev-flex wpdev-items-center wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-200 wpdev-leading-snug">

                        <h3 class="wpdev-m-0 wpdev-widget-title">

                          <?php _e('Change Membership', 'wpdev'); ?>

                        </h3>

                      </div>

                      <div class="wpdev-mx-2 wpdev-mt-2 wpdev-p-2">

                        <div class="inside">

                          <?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-built HTML rendered by metaboxes. ?>

                        </div>

                      </div>

                    </div>

                  </div>

                <?php endif; ?>

                <?php

                /**
                 * Print Advanced Metaboxes
                 *
                 * Allow plugin developers to add new metaboxes
                 *
                 * @since 1.8.2
                 * @param object Object being edited right now
                 */
                do_meta_boxes($screen->id, 'normal', null);

                ?>

                <div class="wpdev-px-2">

                  <?php

                  /**
                   * Allow plugin developers to add additional buttons to list pages
                   *
                   * @since 1.8.2
                   * @param wpdev_Page WPDev Page instance
                   */
                  do_action('wpdev_centered_content', $page);

                  ?>

                </div>

              </div>

              <div id="postbox-container" class="wpdev--mt-3 sm:wpdev-ml-2 wpdev-order-3 md:wpdev-order-3">
                  <?php

                  /**
                   * Allow plugin developers to add additional buttons to list pages
                   *
                   * @since 1.8.2
                   * @param wpdev_Page WPDev Page instance
                   */
                  do_action('wpdev_centered_right', $page);

                  /**
                   * Print Advanced Metaboxes
                   *
                   * Allow plugin developers to add new metaboxes
                   *
                   * @since 1.8.2
                   * @param object Object being edited right now
                   */
                  do_meta_boxes($screen->id, 'right', null);

                  ?>
              </div>

            </div>

          </div>

        <?php wp_nonce_field('meta-box-order', 'meta-box-order-nonce', false); ?>

        <?php wp_nonce_field('closedpostboxes', 'closedpostboxesnonce', false); ?>

      </div>

      <!-- dashboard-widgets-wrap -->

      <?php endif; ?>

  </div>

</div>
