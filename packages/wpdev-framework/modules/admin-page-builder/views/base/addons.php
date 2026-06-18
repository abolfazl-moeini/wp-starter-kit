<?php
/**
 * Add-ons list page.
 *
 * @since 2.0.0
 */
?>

<style>
body .theme-browser .theme .theme-name {
  height: auto;
}
</style>

<div id="wpdev-wrap" class="<?php wpdev_wrap_use_container() ?> wrap wpdev-wrap <?php echo esc_attr($classes); ?>">

  <h1 class="wp-heading-inline">

    <?php echo esc_html( $page->get_title() ); ?> <span v-cloak v-if="count > 0" class="title-count theme-count" v-text="count"></span>

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
    do_action('wpdev_page_addon_after_title', $page);
    ?>

  </h1>

  <?php if (wpdev_request('updated')) : ?>

    <div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2">
      <p><?php _e('Settings successfully saved.', 'wpdev') ?></p>
    </div>

  <?php endif; ?>

  <hr class="wp-header-end">

  <form method="post">

    <div id="poststuff" class="md:wpdev-flex">

      <div class="wpdev-w-full md:wpdev-w-4/12 lg:wpdev-w-2/12">

        <div class="wpdev-py-4 wpdev-relative" id="search-addons">

          <input
            type="text"
            placeholder="<?php esc_attr_e('Search Add-ons', 'wpdev'); ?>"
            class="wpdev-w-full"
            v-model="search"
          >

        </div>

        <!-- Navigator -->
        <ul id="addons-menu">

          <li class="md:wpdev-hidden wpdev-p-4 wpdev-font-bold wpdev-uppercase wpdev-text-xs wpdev-text-gray-700">
            <?php _e('Menu', 'wpdev'); ?>
          </li>

          <?php

          /**
           * We need to set a couple of flags in here to control clickable navigation elements.
           * This flag makes sure only steps the user already went through are clickable.
           */
          $is_pre_current_section = true;

          ?>

          <?php foreach ($sections as $section_name => $section) : ?>

            <?php

            /**
             * Updates the flag after the current section is looped.
             */
            if ($current_section === $section_name) {

              $is_pre_current_section = false;

            } // end if;

            ?>

            <?php if (wpdev_get_isset($section, 'separator')) : ?>

              <!-- Separator Item -->
              <li class="wpdev-sticky wpdev-py-2 wpdev-px-4">&nbsp;</li>

            <?php else : ?>

              <!-- Menu Item -->
              <li class="wpdev-sticky">

                <!-- Menu Link -->
                <a
                  href="<?php echo esc_url($page->get_section_link($section_name)); ?>"
                  class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-sm wpdev-rounded wpdev-text-gray-600 hover:wpdev-text-gray-700"
                  :class="category === '<?php echo esc_attr($section_name); ?>' ? 'wpdev-bg-gray-300 wpdev-text-gray-800' : 'wpdev-text-gray-600 hover:wpdev-text-gray-700'"
                  @click.prevent="set_category('<?php echo esc_attr($section_name); ?>')"
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

            <?php endif; ?>

<?php endforeach; ?>

        </ul>
        <!-- End Navigator -->

        <div class="wpdev-mt-10 wpdev-p-4">

          <div>

            <span class="wpdev-bg-orange-600 wpdev-text-gray-100 wpdev-text-xs wpdev-inline-block wpdev-rounded wpdev-py-1 wpdev-px-2 wpdev-font-bold wpdev-uppercase wpdev-opacity-50">
              <?php _e('Beta', 'wpdev'); ?>
            </span>

            <span class="wpdev-block wpdev-mt-2 wpdev-text-xs wpdev-text-gray-600"><?php _e('Ready for testing, but not necessarily production-ready.', 'wpdev'); ?></span>


          </div>

          <div class="wpdev-mt-4">

            <span class="wpdev-bg-gray-800 wpdev-text-gray-200 wpdev-text-xs wpdev-inline-block wpdev-rounded wpdev-py-1 wpdev-px-2 wpdev-font-bold wpdev-uppercase wpdev-opacity-50">
              <?php _e('Coming Soon', 'wpdev'); ?>
            </span>

            <span class="wpdev-block wpdev-mt-2 wpdev-text-xs wpdev-text-gray-600"><?php _e('In active development, but not yet available.', 'wpdev'); ?></span>

          </div>

          <div class="wpdev-mt-4">

            <span class="wpdev-bg-purple-800 wpdev-text-gray-200 wpdev-text-xs wpdev-inline-block wpdev-rounded wpdev-py-1 wpdev-px-2 wpdev-font-bold wpdev-uppercase wpdev-opacity-50">
              <?php _e('Legacy', 'wpdev'); ?>
            </span>

            <span class="wpdev-block wpdev-mt-2 wpdev-text-xs wpdev-text-gray-600"><?php _e('Developed for 1.X, but compatible with 2.X.', 'wpdev'); ?></span>

          </div>

        </div>


      </div>

      <?php
      $ajax_tabs_template = class_exists( 'WPDev\\Modules\\AdminPageBuilder\\Page_Template_Registry' )
        ? \WPDevFramework\Modules\AdminPageBuilder\Page_Template_Registry::resolve( 'addons-ajax-tabs', 'base/addons-ajax-tabs' )
        : 'base/addons-ajax-tabs';

      wpdev_get_template(
        $ajax_tabs_template,
        array(
          'more_info_url'   => $more_info_url,
          'tab_loader_url'  => isset( $tab_loader_url ) ? $tab_loader_url : '',
          'use_ajax_tabs'   => ! empty( $use_ajax_tabs ),
        )
      );
      ?>

    </div>

    <?php
    /**
     * Allow plugin developers to add scripts to the bottom of the page
     *
     * @since 1.8.2
     * @param wpdev_Page WPDev Page instance
     */
    do_action('wpdev_page_addon_footer', $page);
    ?>

  </form>

</div>
