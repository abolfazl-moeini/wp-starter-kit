<?php
/**
 * Settings view.
 *
 * @since 2.0.0
 */
?>
<div id="wpdev-wrap" class="<?php wpdev_wrap_use_container() ?> wrap wpdev-wrap <?php echo esc_attr($classes); ?>">

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
    do_action('wpdev_page_wizard_after_title', $page);
    ?>

  </h1>

  <?php if (wpdev_request('updated')) : ?>

    <div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2">
      <p><?php _e('Settings successfully saved.', 'wpdev') ?></p>
    </div>

  <?php endif; ?>

  <hr class="wp-header-end">

  <form method="post">

    <div id="poststuff" class="sm:wpdev-grid sm:wpdev-grid-cols-12 wpdev-gap-4">

      <div class="sm:wpdev-col-span-4 lg:wpdev-col-span-2">

        <div class="wpdev-py-4 wpdev-relative">

          <input
            data-model='setting'
            data-value-field="setting_id"
            data-label-field="title"
            data-search-field="setting_id"
            data-max-items="1"
            selected type="text"
            placeholder="Search Setting"
            class="wpdev-w-full"
          >

        </div>

        <div data-wpdev-app="settings_menu" data-state="{}">

          <!-- Navigator -->
          <ul>

            <li class="md:wpdev-hidden wpdev-p-4 wpdev-font-bold wpdev-uppercase wpdev-text-xs wpdev-text-gray-700">

              <?php _e('Menu', 'wpdev'); ?>

            </li>

            <?php

            /**
             * We need to set a couple of flags in here to control clickable navigation elements.
             * This flag makes sure only steps the user already went through are clickable.
             */
            $is_pre_current_section = true;

            /**
             * Holds add-on menus
             */
            $addons = array();

            ?>

            <?php foreach ($sections as $section_name => $section) : ?>

              <?php

              if (wpdev_get_isset($section, 'invisible')) {

                continue; // skip add-ons for now.

              } // end if;

              if (wpdev_get_isset($section, 'addon')) {

                $addons[$section_name] = $section;

                continue; // skip add-ons for now.

              } // end if;

              /**
               * Updates the flag after the current section is looped.
               */
              if ($current_section === $section_name) {

                $is_pre_current_section = false;

              } // end if;

              ?>

              <!-- Menu Item -->
              <li id="tab-selector-<?php echo esc_attr($section_name); ?>" class="wpdev-sticky">

                <!-- Menu Link -->
                <a
                  id="tab-selector-<?php echo esc_attr($section_name); ?>-link"
                  href="<?php echo esc_url($page->get_section_link($section_name)); ?>"
                  class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-sm wpdev-rounded <?php echo ! $clickable_navigation && ! $is_pre_current_section ? 'wpdev-pointer-events-none' : ''; ?> <?php echo $current_section === $section_name ? 'wpdev-bg-gray-300 wpdev-text-gray-800' : 'wpdev-text-gray-600 hover:wpdev-text-gray-700'; ?>"
                >

                  <span class="<?php echo esc_attr($section['icon']); ?> wpdev-align-text-bottom wpdev-mr-1"></span>

                  <?php echo esc_html( $section['title'] ); ?>

                </a>
                <!-- End Menu Link -->

                <?php if (!empty($section['sub-sections'])) : ?>

                  <!-- Sub-menu -->
                  <ul class="classes" v-show="false" v-cloak>

                    <?php foreach ($section['sub-sections'] as $sub_section_name => $sub_section) : ?>

                      <li class="classes">
                        <a href="<?php echo esc_url($page->get_section_link($section_name)."#".$sub_section_name); ?>" class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-gray-500 hover:wpdev-text-gray-600 wpdev-text-sm">
                          &rarr; <?php echo esc_html( $sub_section['title'] ); ?>
                        </a>
                      </li>

                    <?php endforeach; ?>

                  </ul>
                  <!-- End Sub-menu -->

                <?php endif; ?>

              </li>
              <!-- End Menu Item -->

            <?php endforeach; ?>

          </ul>
          <!-- End Navigator -->

          <?php if (!empty($addons)) : ?>

            <!-- Addon Navigator -->
            <ul class="wpdev-pt-4">

              <li class="wpdev-px-4 wpdev-font-bold wpdev-uppercase wpdev-text-xs wpdev-text-gray-700">
                <?php _e('Add-ons', 'wpdev'); ?>
              </li>

              <?php foreach ($addons as $section_name => $section) : ?>

                <?php

                /**
                 * Updates the flag after the current section is looped.
                 */
                if ($current_section === $section_name) {

                  $is_pre_current_section = false;

                } // end if;

                ?>

                <!-- Menu Item -->
                <li class="wpdev-sticky">

                  <!-- Menu Link -->
                  <a href="<?php echo esc_url($page->get_section_link($section_name)); ?>" class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-sm wpdev-rounded <?php echo ! $clickable_navigation && ! $is_pre_current_section ? 'wpdev-pointer-events-none' : ''; ?> <?php echo $current_section === $section_name ? 'wpdev-bg-gray-300 wpdev-text-gray-800' : 'wpdev-text-gray-600 hover:wpdev-text-gray-700'; ?>">

                    <span class="<?php echo esc_attr($section['icon']); ?> wpdev-align-text-bottom wpdev-mr-1"></span>

                    <?php echo esc_html( $section['title'] ); ?>

                  </a>
                  <!-- End Menu Link -->

                  <?php if (!empty($section['sub-sections'])) : ?>

                    <!-- Sub-menu -->
                    <ul class="classes" v-show="false" v-cloak>

                      <?php foreach ($section['sub-sections'] as $sub_section_name => $sub_section) : ?>

                        <li class="classes">
                          <a href="<?php echo esc_url($page->get_section_link($section_name)."#".$sub_section_name); ?>" class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-gray-500 hover:wpdev-text-gray-600 wpdev-text-sm">
                            &rarr; <?php echo esc_html( $sub_section['title'] ); ?>
                          </a>
                        </li>

                      <?php endforeach; ?>

                    </ul>
                    <!-- End Sub-menu -->

                  <?php endif; ?>

                </li>
                <!-- End Menu Item -->

              <?php endforeach; ?>

            </ul>
            <!-- End Addon Navigator -->

          <?php endif; ?>

        </div>

      </div>

      <div class="sm:wpdev-col-span-8 lg:wpdev-col-span-6 metabox-holder">

        <div class="wpdev-relative">

          <?php
          /**
           * Print Side Metaboxes
           *
           * Allow plugin developers to add new metaboxes
           *
           * @since 1.8.2
           * @param object Object being edited right now
           */
          do_meta_boxes($screen->id, 'normal', false);
          ?>

        </div>

      </div>

      <div class="sm:wpdev-col-span-8 sm:wpdev-col-start-5 lg:wpdev-col-span-3 lg:wpdev-col-start-10 metabox-holder">

        <?php
        /**
         * Print Normal Metaboxes
         *
         * Allow plugin developers to add new metaboxes
         *
         * @since 1.8.2
         * @param object Object being edited right now
         */
        do_meta_boxes('wpdev_settings_admin_page', 'side', false);
        ?>

      </div>

    </div>

    <?php
    /**
     * Allow plugin developers to add scripts to the bottom of the page
     *
     * @since 1.8.2
     * @param wpdev_Page WPDev Page instance
     */
    do_action('wpdev_page_wizard_footer', $page);
    ?>

    <?php wp_nonce_field(sprintf('saving_%s', $current_section), sprintf('saving_%s', $current_section), false); ?>

    <?php wp_nonce_field(sprintf('saving_%s', $current_section), '_wpdev_nonce'); ?>

  </form>

</div>

<script type="text/javascript">

/** Not a huge fan of having this here, but it's better than having
a file for this alone. */
settings_loader = wpdev_block_ui('#wpdev-wizard-body');

/**
 * Remove the block ui after the settings loaded.
 *
 * @since 2.0.0
 * @return void
 */
function remove_block_ui() {

  settings_loader.unblock();

} // end remove_block_ui;

</script>
