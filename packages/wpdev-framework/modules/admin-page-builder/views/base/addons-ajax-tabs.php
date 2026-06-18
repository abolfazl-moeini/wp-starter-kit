<?php
/**
 * Add-ons AJAX tab grid (Vue-loaded catalog).
 *
 * @since 2.5.0
 *
 * @var string $more_info_url Thickbox URL pattern for add-on details.
 */
defined( 'ABSPATH' ) || exit;
?>

      <div
        class="wpdev-w-full md:wpdev-w-8/12 lg:wpdev-w-10/12 md:wpdev-pl-4 metabox-holder"
        data-tab-group="wpdev-addons"
        <?php if ( ! empty( $tab_loader_url ) ) : ?>
        data-tab-loader-url="<?php echo esc_url( $tab_loader_url ); ?>"
        data-use-ajax-tabs="<?php echo ! empty( $use_ajax_tabs ) ? '1' : '0'; ?>"
        <?php endif; ?>
      >

        <div id="wpdev-addon" class="wpdev-relative">

          <div class="theme-browser rendered">

              <div v-if="loading"
                class="">

                  <?php echo wpdev_render_empty_state(array(
                    'message'      => __("Loading...", 'wpdev'),
                    'sub_message'  => __('We are fetching the list of WPDev add-ons.', 'wpdev'),
                    'link_url'     => false,
                  )); ?>

              </div>

              <div class="themes wp-clearfix wpdev-grid wpdev-gap-6 wpdev-grid-cols-1 sm:wpdev-grid-cols-2 lg:wpdev-grid-cols-3">

                  <div
                    class="theme wpdev-col-span-1"
                    style="width: 100% !important; margin: 0 !important;"
                    tabindex="0"
                    v-cloak
                    v-for="addon in addons_list"
                    :data-slug="addon.slug"
                  >

                      <div class="theme-screenshot wpdev-bg-gray-100">

                          <img :class="addon.available ? '' : 'wpdev-opacity-50'" :src="addon.image_url" :alt="addon.name" />

                      </div>

                      <span class="wpdev-absolute wpdev-m-6 wpdev-bg-gray-800 wpdev-text-gray-200 wpdev-text-xs wpdev-inline-block wpdev-rounded wpdev-top-0 wpdev-right-0 wpdev-py-1 wpdev-px-2 wpdev-font-bold wpdev-uppercase" v-cloak v-if="!addon.available">
                        <?php _e('Coming Soon', 'wpdev'); ?>
                      </span>

                      <span class="wpdev-absolute wpdev-m-6 wpdev-bg-purple-800 wpdev-text-gray-200 wpdev-text-xs wpdev-inline-block wpdev-rounded wpdev-top-0 wpdev-right-0 wpdev-py-1 wpdev-px-2 wpdev-font-bold wpdev-uppercase" v-cloak v-show="addon.legacy">
                        <?php _e('Legacy', 'wpdev'); ?>
                      </span>

                      <span class="wpdev-absolute wpdev-m-6 wpdev-bg-orange-600 wpdev-text-gray-100 wpdev-text-xs wpdev-inline-block wpdev-rounded wpdev-top-0 wpdev-right-0 wpdev-py-1 wpdev-px-2 wpdev-font-bold wpdev-uppercase" v-cloak v-show="addon.beta">
                        <?php _e('Beta', 'wpdev'); ?>
                      </span>

                      <a
                        class="more-details wubox wpdev-no-underline"
                        :title="addon.name"
                        :href="'<?php echo esc_attr( $more_info_url ); ?>'.replace('ADDON_SLUG', addon.slug)"
                      >

                        <?php _e('Add-on Details', 'wpdev'); ?>

                      </a>

                      <div class="theme-author">

                          <?php _e('By WPDev', 'wpdev'); ?>

                      </div>

                      <h2 class="theme-name" :id="addon.slug" :class="addon.available ? '' : 'wpdev-opacity-50'" >
                        {{ addon.name }}

                        <div class="wpdev-pt-1 wpdev-block">
                          <span
                            v-cloak
                            class="wpdev-text-gray-600 wpdev-font-normal wpdev-text-xs"
                            v-if="addon.free"
                          >
                            <?php _e('Free Add-on', 'wpdev'); ?>
                          </span>
                          <span
                            v-cloak
                            class="wpdev-text-gray-600 wpdev-font-normal wpdev-text-xs"
                            v-else
                          >
                            <?php _e('Premium Add-on', 'wpdev'); ?>
                          </span>

                          <span
                            v-cloak
                            class="wpdev-ml-2 wpdev-text-green-600 wpdev-font-normal wpdev-text-xs"
                            v-if="addon.installed"
                          >
                            <span class="dashicons-wpdev-check"></span>
                            <?php _e('Installed', 'wpdev'); ?>
                          </span>

                        </div>
                      </h2>

                  </div>

              </div>

          </div>

          <div class="theme-overlay"></div>

          <div
            v-cloak
            v-if="! loading && addons_list.length == 0"
          >
            <?php echo wpdev_render_empty_state(array(
              'message'      => __("No add-ons found...", 'wpdev'),
              'sub_message'  => __('Check the search terms or navigate between categories to see what add-ons we have available.', 'wpdev'),
              'link_label'   => __('See all add-ons', 'wpdev'),
              'link_url'     => remove_query_arg('tab'),
              'link_classes' => '',
              'link_icon'    => 'dashicons-wpdev-reply',
            )); ?>
          </div>

        </div>

      </div>
