<?php
/**
 * Dash view.
 *
 * @since 2.0.0
 */

?>
<div id="wpdev-wrap" class="<?php wpdev_wrap_use_container() ?> wrap wpdev-styling">

  <h1 class="wp-heading-inline">

    <?php echo esc_html( $page->get_title() ); ?>

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
    do_action('wpdev_page_dash_after_title', $page);
    ?>

  </h1>

  <hr class="wp-header-end">

  <?php do_action('wpdev_dash_before_metaboxes', $page); ?>

  <?php if (apply_filters('wpdev_dashboard_display_widgets', true)) : ?>

    <?php
    // Default true for dash pages: MRR and tax widgets use the `full` context.
    if ( ! isset( $has_full_position ) ) {
      $has_full_position = true;
    }
    ?>

    <div id="dashboard-widgets-wrap">

        <div id="dashboard-widgets" class="metabox-holder">

            <?php if ($has_full_position) : ?>

                <div id="postbox-container" class="postbox-container wpdev-w-full wpdev--mb-5" style="width: 100% !important;">
                    <?php
                    /**
                     * Print Advanced Metaboxes
                     *
                     * Allow plugin developers to add new metaboxes
                     *
                     * @since 1.8.2
                     * @param object Object being edited right now
                     */
                    do_meta_boxes($screen->id, 'full', null);
                    ?>
                </div>

                <div class="wpdev-mx-2">

                    <?php do_action('wpdev_dash_after_full_metaboxes', $page); ?>

                </div>

            <?php endif; ?>

            <div class="sm:wpdev-grid md:wpdev-grid-cols-2 xl:wpdev-grid-cols-3">

              <div id="postbox-container" class="wpdev-postbox-container">
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
              </div>

              <div id="postbox-container" class="wpdev-postbox-container">
                  <?php
                  /**
                   * Print Advanced Metaboxes
                   *
                   * Allow plugin developers to add new metaboxes
                   *
                   * @since 1.8.2
                   * @param object Object being edited right now
                   */
                  do_meta_boxes($screen->id, 'side', null);
                  ?>
              </div>

              <div id="postbox-container" class="wpdev-postbox-container">
                  <?php
                  /**
                   * Print Advanced Metaboxes
                   *
                   * Allow plugin developers to add new metaboxes
                   *
                   * @since 1.8.2
                   * @param object Object being edited right now
                   */
                  do_meta_boxes($screen->id, 'column3', null);
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
