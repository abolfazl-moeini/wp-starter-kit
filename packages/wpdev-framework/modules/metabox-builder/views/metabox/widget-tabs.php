<?php
/**
 * Tabs widget view.
 *
 * @since 2.0.0
 */
?>
<div
    class="wpdev-m-0"
    data-wpdev-app="<?php echo esc_attr($html_attr['data-wpdev-app']); ?>"
    data-state="<?php echo htmlspecialchars(json_encode(($html_attr['data-state']))); ?>"
    <?php echo wpdev_get_isset($html_attr, 'data-on-load') ? 'data-on-load="'.esc_attr($html_attr['data-on-load']).'"' : ''; ?>
>

    <div
        class="wpdev-widget-inside md:wpdev-flex wpdev-flex-none md:wpdev--mx-3 md:wpdev--mb-3 wpdev--m-2"
        v-bind:class="display_all ? 'wpdev-display-all' : ''"
    >

        <div
            class="wpdev-block md:wpdev-px-3 wpdev-w-full md:wpdev-w-1/4 wpdev-bg-gray-100 md:wpdev-border-solid wpdev-border-gray-400 wpdev-border-t-0 wpdev-border-l-0 wpdev-border-b-0 wpdev-border-r"
        >

            <ul class="wpdev-text-sm">

                <ul>

                    <!-- Menu Item -->
                    <li v-show="display_all" v-cloak>

                        <!-- Menu Link -->
                        <a class="wpdev-cursor-pointer wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-rounded wpdev-bg-gray-300 wpdev-text-gray-800">

                            <span class="wpdev-text-base wpdev-w-4 wpdev-h-4 wpdev-pt-2px wpdev-mr-1 dashicons dashicons-wpdev-chevron-with-circle-down">&nbsp;</span>

                            <?php _e('All Options', 'wpdev'); ?>

                        </a>
                        <!-- End Menu Link -->

                    </li>
                    <!-- End Menu Item -->

                    <?php foreach ($sections as $section_id => $section) : ?>

                        <!-- Menu Item -->
                        <li v-show="!display_all && <?php echo esc_attr($section['v-show']); ?>">

                            <!-- Menu Link -->
                            <a
                                class="wpdev-cursor-pointer wpdev-block md:wpdev-py-2 md:wpdev-px-4 wpdev-p-4 wpdev-no-underline wpdev-rounded wpdev-text-gray-600"
                                v-bind:class="section == '<?php echo esc_attr($section_id); ?>' ? 'wpdev-bg-gray-300 wpdev-text-gray-800' : ''"
                                v-on:click.prevent="section = '<?php echo esc_attr($section_id); ?>'"
                            >

						<?php if ($section['icon']) : ?>

                                    <span class="wpdev-text-base wpdev-w-4 wpdev-h-4 wpdev-pt-2px wpdev-mr-1 dashicons <?php echo esc_attr($section['icon']); ?>">&nbsp;</span>

                                <?php else : ?>

                                    <span class="wpdev-text-base wpdev-w-4 wpdev-h-4 wpdev-pt-2px wpdev-mr-1 dashicons dashicons-wpdev-sound-mix">&nbsp;</span>

                                <?php endif; ?>

						<?php echo $section['title']; ?>

                            </a>
                            <!-- End Menu Link -->

                        </li>
                        <!-- End Menu Item -->

                    <?php endforeach; ?>

                </ul>

                <a v-on:click="display_all = !display_all;" class="wpdev-cursor-pointer wpdev-block wpdev-py-2 wpdev-px-4 wpdev-pt-10 wpdev-no-underline wpdev-text-xs wpdev-rounded">

                    <span v-show="!display_all">

                        <?php _e('Display all fields', 'wpdev'); ?>

                    </span>

                    <span v-cloak v-show="display_all">

                        <?php _e('Hide other fields', 'wpdev'); ?>

                    </span>

                </a>

            </ul>

        </div>

        <div class="md:wpdev-w-3/4 wpdev-w-full">

            <div v-show="false" class="wpdev-text-center wpdev-rounded wpdev-flex wpdev-items-center wpdev-justify-center wpdev-uppercase wpdev-font-semibold wpdev-text-xs wpdev-h-full wpdev-text-gray-700">

                <span class="wpdev-blinking-animation">

                    <?php _e('Loading...', 'wpdev'); ?>

                </span>

            </div>

            <?php foreach ($sections as $section_id => $section) : ?>

                <div
                    class="wpdev-tab-content"
                    v-cloak
                    id="<?php echo esc_attr("wpdev_tab_$section_id"); ?>"
                >

				<?php

				/**
				 * Render Form
				 */
				$section['form']->render();

				?>

                </div>

            <?php endforeach; ?>

        </div>

    </div>

    <?php echo $after; ?>

</div>
