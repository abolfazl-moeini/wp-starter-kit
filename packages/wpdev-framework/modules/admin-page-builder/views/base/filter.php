<?php
/**
 * Filter view.
 *
 * @since 2.0.0
 */
?>
<div
    id="<?php echo esc_attr($filters_el_id); ?>"
    class="wp-filter wpdev-filter <?php echo !$table->has_items() ? 'wpdev-opacity-50 wpdev-pointer-events-none' : ''; ?>"
>

    <?php if (!empty($views)) : ?>

    <ul class="filter-links">

        <?php foreach ($views as $view_slug => $view) : ?>

            <li
                class="<?php echo wpdev_request($view['field'], 'all') == $view_slug ? esc_attr('current') : ''; ?>"
                :class="view && view === '<?php echo esc_attr($view_slug); ?>' ? 'current wpdev-font-medium' : ''"
            >
                <a
                    v-on:click.prevent="set_view('<?php echo esc_attr($view['field']); ?>', '<?php echo esc_attr($view_slug); ?>')"
                    href="<?php echo esc_attr($view['url']); ?>"
                    class="<?php echo wpdev_request($view['field'], 'all') == $view_slug ? esc_attr('current wpdev-font-medium') : ''; ?>"
                    :class="view && view === '<?php echo esc_attr($view_slug); ?>' ? 'current wpdev-font-medium' : ''"
                >

                    <?php echo esc_attr($view['label']); ?>

                </a>
            </li>

        <?php endforeach; ?>

    </ul>

    <?php endif; ?>

    <?php if (false) : ?>

        <button
            v-show="!open"
            v-on:click.prevent="open_filters"
            type="button"
            class="button drawer-toggle"
            v-bind:aria-expanded="open ? 'true' : 'false'"
        >
            <?php _e('Advanced Filters', 'wpdev'); ?>
        </button>

        <div class="wpdev-py-3 wpdev-px-2 wpdev-inline-block wpdev-uppercase wpdev-font-semibold wpdev-text-gray-600 wpdev-text-xs" v-show="open" v-cloak>
            <?php _e('Advanced Filters', 'wpdev'); ?>
        </div>

        <button
            v-show="open"
            v-on:click.prevent="close_filters"
            type="button"
            class="button drawer-toggle"
        >
            <?php _e('Close', 'wpdev'); ?>
        </button>

    <?php endif; ?>

    <form class="search-form">

        <?php if (isset($has_search) && $has_search) : ?>

            <label class="screen-reader-text" for="wp-filter-search-input">
                <?php echo esc_html($search_label); ?>
            </label>

            <input
                name='s' id="s"
                value="<?php echo esc_attr(isset($_REQUEST['s']) ? $_REQUEST['s'] : ''); ?>"
                placeholder="<?php echo esc_attr($search_label); ?>"
                type="search"
                aria-describedby="live-search-desc"
                id="wp-filter-search-input"
                class="wp-filter-search"
            >

        <?php endif; ?>

    </form>

    <?php if (isset($has_view_switch) && $has_view_switch) : ?>

        <?php $table->view_switcher($table->current_mode); ?>

    <?php endif; ?>

    <div v-cloak v-show="false" class="wpdev-hidden">

        <div class="wpdev-clear-both"></div>

        <div class="wpdev-mb-3">

            <div
                v-for="(filter, index) in filters"
                class="wpdev-row wpdev-flex wpdev-p-4 wpdev-mt-0 wpdev-my-3 wpdev-bg-gray-100 wpdev-rounded wpdev-border wpdev-border-solid wpdev-border-gray-200"
            >

                <div class="wpdev-w-1/12 wpdev-mx-2 wpdev-text-right wpdev-self-center">

                    <span
                        class="wpdev-uppercase wpdev-font-semibold wpdev-text-gray-600 wpdev-text-xs"
                        v-if="index === 0"
                    >
                        <?php _e('Where', 'wpdev'); ?>
                    </span>

                    <select
                        class="form-control wpdev-w-full"
                        v-if="index === 1"
                        v-model="relation"
                    >
                        <option value="and"><?php _e('and', 'wpdev'); ?></option>
                        <option value="or"><?php _e('or', 'wpdev'); ?></option>
                    </select>

                    <span
                        class="wpdev-uppercase wpdev-font-semibold wpdev-text-gray-600 wpdev-text-xs"
                        v-if="index > 1"
                    >
                        <span v-show="relation === 'and'"><?php _e('and', 'wpdev'); ?></span>
                        <span v-show="relation === 'or'"><?php _e('or', 'wpdev'); ?></span>
                    </span>

                </div>

                <div class="wpdev-w-2/12">

                    <select class="form-control wpdev-w-full" v-model="filter.field">

                         <option
                            v-for="available_filter in available_filters"
                            :value="available_filter.field"
                            v-html="available_filter.label"
                        >
                            &nbsp;
                        </option>

                    </select>

                </div>

                <div class="wpdev-w-2/12 wpdev-mx-2">

                    <select class="form-control wpdev-w-full" v-if="get_filter_type(filter.field) == 'bool'" v-model="filter.value">
                        <option value="1"><?php _e('is true.', 'wpdev'); ?></option>
                        <option value="0"><?php _e('is false.', 'wpdev'); ?></option>
                    </select>

                    <select class="form-control wpdev-w-full" v-if="get_filter_type(filter.field) == 'text'" v-bind:value="get_filter_rule(filter.field)">
                        <option value="is"><?php _e('is', 'wpdev'); ?></option>
                        <option value="is_not"><?php _e('is not', 'wpdev'); ?></option>
                        <option value="contains"><?php _e('contains', 'wpdev'); ?></option>
                        <option value="does_not_contain"><?php _e('does not contain', 'wpdev'); ?></option>
                        <option value="starts_with"><?php _e('starts with', 'wpdev'); ?></option>
                        <option value="ends_with"><?php _e('ends with', 'wpdev'); ?></option>
                        <option value="is_empty"><?php _e('is empty.', 'wpdev'); ?></option>
                        <option value="is_not_empty"><?php _e('is not empty.', 'wpdev'); ?></option>
                    </select>

                    <select class="form-control wpdev-w-full" v-if="get_filter_type(filter.field) == 'date'" v-bind:value="get_filter_rule(filter.field)">
                        <option value="before"><?php _e('is before', 'wpdev'); ?></option>
                        <option value="after"><?php _e('is after', 'wpdev'); ?></option>
                    </select>

                </div>

                <div class="wpdev-w-2/12">

                    <input
                        type="text"
                        class="form-control wpdev-w-full"
                        placeholder="<?php esc_attr_e('Value', 'wpdev'); ?>"
                        v-if="_.contains(['text', 'date'], get_filter_type(filter.field)) && !_.contains(['is_empty', 'is_not_empty'], filter.rule)"
                        v-model="filter.value"
                    />

                </div>

                <div class="wpdev-w-2/12 wpdev-self-center wpdev-mx-3">

                    <a
                        href="#"
                        v-on:click.prevent="remove_filter(index)"
                        class="button"
                        v-show="index > 0"
                    >
                        <?php _e('Remove Filter', 'wpdev'); ?>
                    </a>

                </div>

                <div class="wpdev-w-3/12 wpdev-self-center">

                    <a
                        href="#"
                        v-on:click.prevent="add_new_filter"
                        class="button button-primary wpdev-float-right"
                        v-show="index === filters.length - 1"
                    >
                        <?php _e('Add new Filter', 'wpdev'); ?>
                    </a>

                </div>

            </div>

        </div>

    </div>
</div>
