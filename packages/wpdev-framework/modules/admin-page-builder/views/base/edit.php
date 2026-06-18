<?php
/**
 * Edit view.
 *
 * @since 2.0.0
 */
?>
<div id="wpdev-wrap" class="<?php wpdev_wrap_use_container() ?> wrap">

  <h1 class="wp-heading-inline">

    <?php echo esc_html( $page->is_editing() ? $labels['edit_label'] : $labels['add_new_label'] ); ?>

    <?php
    /**
     * You can filter the get_title_link using wpdev_page_list_get_title_link, see class-wpdev-page-list.php
     *
     * @since 1.8.2
     */
    foreach ($page->get_title_links() as $action_link) :

      $action_classes = isset($action_link['classes']) ? $action_link['classes'] : '';

      $attrs = isset($action_link['attrs']) ? $action_link['attrs'] : '';

    ?>

      <a title="<?php echo esc_attr($action_link['label']); ?>" href="<?php echo esc_url($action_link['url']); ?>" class="page-title-action <?php echo esc_attr($action_classes); ?>" <?php echo $attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-sanitized HTML attributes from the page builder. ?>>

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
     * Allow plugin developers to add additional buttons to edit pages
     *
     * @since 1.8.2
     * @param object  Object holding the information
     * @param wpdev_Page WPDev Page instance
     */
    do_action('wpdev_page_edit_after_title', $object, $page);
    ?>

  </h1>

  <?php if (isset($_GET['updated'])) : ?>

    <div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2">
      <p><?php echo esc_html( $labels['updated_message'] ); ?></p>
    </div>

  <?php endif; ?>

  <?php if (isset($_GET['notice'])) : ?>

    <div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2">
      <p><?php echo esc_html( $labels['updated_message'] ); ?></p>
    </div>

  <?php endif; ?>

  <?php
  /**
   * Allow plugin developers to add additional handlers to URL query redirects
   *
   * @since 2.0.0
   *
   * @param WPDevFramework\Admin_Pages\Base_Admin_Page $page The page object.
   */
  do_action('wpdev_page_edit_redirect_handlers', $page);
  ?>

  <hr class="wp-header-end">

  <form id="form-<?php echo esc_attr($page->get_id()); ?>" name="post" method="post" autocomplete="off">

    <div id="poststuff">

      <div id="post-body" class="metabox-holder columns-2">

        <?php if ($page->has_title()) : ?>

          <div id="post-body-content">

            <div id="titlediv">

              <div id="titlewrap">

                <input placeholder="<?php echo esc_attr( $labels['title_placeholder'] ); ?>" type="text" name="name" size="30" value="<?php echo method_exists($object, 'get_name') ? esc_attr($object->get_name()) : ''; ?>" id="title" spellcheck="true" autocomplete="off">

                <?php if (!empty($labels['title_description'])) : ?>

                  <span class="wpdev-block wpdev-bg-gray-100 wpdev-rounded wpdev-border-solid wpdev-border-gray-400 wpdev-border-t-0 wpdev-border-l wpdev-border-b wpdev-border-r wpdev-text-xs wpdev-py-2 wpdev-p-2 wpdev-pt-3 wpdev--mt-2">
                    <?php echo esc_html( $labels['title_description'] ); ?>
                  </span>

                <?php endif; ?>

                <?php
                /**
                 * Allow plugin developers to add additional information below the text input
                 *
                 * @since 1.8.2
                 * @param object  Object holding the information
                 * @param wpdev_Page WPDev Page instance
                 */
                do_action('wpdev_edit_page_after_title_input', $object, $page);
                ?>

              </div>

            </div>
            <!-- /titlediv -->

            <?php if ($page->has_editor()) : ?>

            <div class="wpdev-mt-5">

              <?php remove_editor_styles(); ?>

              <?php $content = method_exists($object, 'get_content') ? esc_attr($object->get_content()) : ''; ?>
              <?php wp_editor( html_entity_decode($content) , 'content', array(
                'height' => 500,
              )); ?>

            </div>

            <?php endif; ?>

          </div>
          <!-- /post-body-content -->

        <?php endif; ?>

        <div id="postbox-container-1" class="postbox-container">

            <?php
            /**
             * Print Side Metaboxes
             *
             * Allow plugin developers to add new metaboxes
             *
             * @since 1.8.2
             * @param object Object being edited right now
             */
            do_meta_boxes($screen->id, 'side', $object);
            ?>

            <?php
            /**
             * Print Side Metaboxes
             *
             * Allow plugin developers to add new metaboxes
             *
             * @since 1.8.2
             * @param object Object being edited right now
             */
            do_meta_boxes($screen->id, 'side-bottom', $object);
            ?>

        </div>

        <div id="postbox-container-2" class="postbox-container">

          <?php

          /**
           * Print Normal Metaboxes
           *
           * Allow plugin developers to add new metaboxes
           *
           * @since 1.8.2
           * @param object Object being edited right now
           */
          do_meta_boxes($screen->id, 'normal', $object);

          /**
           * Allow developers to add additional elements after the modals are printed.
           *
           * @since 2.0.0
           * @param object Object being edited right now
           */
          do_action("wpdev_edit_{$screen->id}_after_normal", $object);

          /**
           * Print Advanced Metaboxes
           *
           * Allow plugin developers to add new metaboxes
           *
           * @since 1.8.2
           * @param object Object being edited right now
           */
          do_meta_boxes($screen->id, 'advanced', $object);

          ?>

        </div>
        <!-- /normal-sortables -->

      </div>
      <!-- /post-body -->

      <br class="clear">

      <?php wp_nonce_field('meta-box-order', 'meta-box-order-nonce', false); ?>

      <?php wp_nonce_field('closedpostboxes', 'closedpostboxesnonce', false); ?>

      <?php wp_nonce_field(sprintf('saving_%s', $page->object_id), sprintf('saving_%s', $page->object_id), false); ?>

      <?php wp_nonce_field(sprintf('saving_%s', $page->object_id), '_wpdev_nonce'); ?>

      <?php if ( $page->is_editing() ) : ?>
        <?php wp_nonce_field(sprintf('deleting_%s', $page->object_id), sprintf('deleting_%s', $page->object_id), false); ?>

        <?php wp_nonce_field(sprintf('deleting_%s', $page->object_id), 'delete_wpdev_nonce'); ?>

        <input type="hidden" name="id" value="<?php echo esc_attr( $object->get_id() ); ?>">

      <?php endif; ?>

    </div>
    <!-- /poststuff -->

  </form>

  <?php
  /**
   * Allow plugin developers to add scripts to the bottom of the page
   *
   * @since 1.8.2
   * @param object  Object holding the information
   * @param wpdev_Page WPDev Page instance
   */
  do_action('wpdev_page_edit_footer', $object, $page);
  ?>

</div>
