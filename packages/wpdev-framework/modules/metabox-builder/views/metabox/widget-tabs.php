<?php
/**
 * Tabs widget view.
 *
 * @since 2.0.0
 */
?>
<?php echo $before; ?>
<div class="wpdev-styling">
<div
    class="wpdev-mar-0"
    data-wpdev-app="<?php echo esc_attr($html_attr['data-wpdev-app']); ?>"
    data-state="<?php echo htmlspecialchars(json_encode(($html_attr['data-state']))); ?>"
    <?php echo wpdev_get_isset($html_attr, 'data-on-load') ? 'data-on-load="'.esc_attr($html_attr['data-on-load']).'"' : ''; ?>
>

    <div
        class="wpdev-widget-inside md:wpdev-row wpdev-row-none md:wpdev--mx-3 md:wpdev--mb-3 wpdev--m-2"
        v-bind:class="display_all ? 'wpdev-display-all' : ''"
    >

        <div
            class="wpdev-block md:wpdev-pad-x-3 wpdev-full md:wpdev-w-1/4 wpdev-surface-gray-100 md:wpdev-border-solid wpdev-border-gray-400 wpdev-border-t-0 wpdev-border-l-0 wpdev-border-b-0 wpdev-border-r"
        >

            <ul class="wpdev-type-sm">

                <ul>

                    <!-- Menu Item -->
                    <li v-show="display_all" v-cloak>

                        <!-- Menu Link -->
                        <a class="wpdev-cursor-pointer wpdev-block wpdev-pad-y-2 wpdev-pad-x-4 wpdev-no-underline wpdev-radius wpdev-surface-gray-300 wpdev-type-gray-800">

                            <span class="wpdev-type-base wpdev-w-4 wpdev-h-4 wpdev-pad-t-2px wpdev-mar-r-1 dashicons dashicons-wpdev-chevron-with-circle-down">&nbsp;</span>

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
                                class="wpdev-cursor-pointer wpdev-block md:wpdev-pad-y-2 md:wpdev-pad-x-4 wpdev-pad-4 wpdev-no-underline wpdev-radius wpdev-type-gray-600"
                                v-bind:class="section == '<?php echo esc_attr($section_id); ?>' ? 'wpdev-surface-gray-300 wpdev-type-gray-800' : ''"
                                v-on:click.prevent="section = '<?php echo esc_attr($section_id); ?>'"
                            >

						<?php if ($section['icon']) : ?>

                                    <span class="wpdev-type-base wpdev-w-4 wpdev-h-4 wpdev-pad-t-2px wpdev-mar-r-1 dashicons <?php echo esc_attr($section['icon']); ?>">&nbsp;</span>

                                <?php else : ?>

                                    <span class="wpdev-type-base wpdev-w-4 wpdev-h-4 wpdev-pad-t-2px wpdev-mar-r-1 dashicons dashicons-wpdev-sound-mix">&nbsp;</span>

                                <?php endif; ?>

						<?php echo $section['title']; ?>

                            </a>
                            <!-- End Menu Link -->

                        </li>
                        <!-- End Menu Item -->

                    <?php endforeach; ?>

                </ul>

                <a v-on:click="display_all = !display_all;" class="wpdev-cursor-pointer wpdev-block wpdev-pad-y-2 wpdev-pad-x-4 wpdev-pad-t-10 wpdev-no-underline wpdev-type-xs wpdev-radius">

                    <span v-show="!display_all">

                        <?php _e('Display all fields', 'wpdev'); ?>

                    </span>

                    <span v-cloak v-show="display_all">

                        <?php _e('Hide other fields', 'wpdev'); ?>

                    </span>

                </a>

            </ul>

        </div>

        <div class="md:wpdev-w-3/4 wpdev-full wpdev-box-border wpdev-p-6">

            <div v-show="false" class="wpdev-type-center wpdev-radius wpdev-inline wpdev-justify-center wpdev-uppercase wpdev-font-semibold wpdev-type-xs wpdev-h-full wpdev-type-gray-700">

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
</div>
