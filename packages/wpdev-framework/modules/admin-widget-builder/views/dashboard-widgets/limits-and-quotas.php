<?php
/**
 * Limits and quotas view.
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <!-- Title Element -->
    <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-b wpdev-border-gray-200'); ?>">

      <?php if ($title) : ?>

        <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

          <?php echo $title; ?>

        </h3>

      <?php endif; ?>

    </div>
    <!-- Title Element - End -->

    <ul class="wpdev-list-none wpdev-m-0 wpdev-p-4 wpdev-grid wpdev-gap-2 wpdev-row-gap-0 lg:wpdev-grid-cols-<?php echo esc_attr((int) $columns); ?> <?php echo wpdev_env_picker('', 'wpdev-p-4'); ?>">

      <?php if ($post_type_limits->is_enabled()) : ?>

        <?php switch_to_blog($site->get_id()); ?>

          <?php $index = 0; foreach ($post_types as $post_type_slug => $post_type) : ?>

            <?php

            if (is_array($items_to_display) && !in_array($post_type_slug, $items_to_display, true)) {

              continue;

            } // end if;

            if ($post_type_limits->{$post_type_slug}->enabled) :

                $post_count = $post_type_limits->get_post_count($post_type_slug);

                // Calculate width
                if (empty($post_type_limits->{$post_type_slug}->number)) { // unlimited posts.

                  $width = 5;

                } else {

                  $width = ($post_count / $post_type_limits->{$post_type_slug}->number * 100);

                } // end if;

                if ($width > 100) {

                  $width = 100;

                } // end if;

              ?>

              <li class="wpdev-py-2 wpdev-m-0">

                <span class="">

                  <?php echo $post_type->label; ?>

                </span>

                <span class="wpdev-w-full wpdev-bg-gray-200 wpdev-rounded-full wpdev-h-1 wpdev-block wpdev-my-2">

                  <span class="<?php echo esc_attr(wpdev_get_random_color($index)); ?> wpdev-rounded-full wpdev-h-1 wpdev-block wpdev-my-1" style="width: <?php echo $width; ?>%;"></span>

                </span>

                <div class="wpdev-text-xs wpdev-text-gray-600 wpdev-align-middle">

                  <?php echo $post_count; ?>
                  /
                  <?php echo empty($post_type_limits->{$post_type_slug}->number) ? __('Unlimited', 'wpdev') : $post_type_limits->{$post_type_slug}->number; ?>

                </div>

              </li>

<?php endif; ?>

          <?php $index++; endforeach; ?>

        <?php restore_current_blog(); ?>

      <?php endif; ?>

      <?php if ($site->get_limitations()->visits->is_enabled()) : ?>

        <?php

          $visit_limitations = $site->get_limitations()->visits;

          /*
            * Get the visits count.
            */
          $visits_count = (int) $site->get_visits_count();

          /*
            * Calculates the width of the bar
            */
          $visits_width = empty($visit_limitations->get_limit()) ? 1 : $visits_count / $visit_limitations->get_limit() * 100;

        ?>

        <li class="quota wpdev-py-2 wpdev-m-0">

          <div class="">

            <?php _e('Unique Visits', 'wpdev'); ?>

            <?php echo wpdev_tooltip(sprintf(__('Next Reset: %s', 'wpdev'), date_i18n(get_option('date_format', 'd/m/Y'), strtotime('last day of this month')))); ?>

          </div>

          <span class="wpdev-w-full wpdev-bg-gray-200 wpdev-rounded-full wpdev-h-1 wpdev-block wpdev-my-3">

            <span class="wpdev-bg-orange-500 wpdev-rounded-full wpdev-h-1 wpdev-block wpdev-my-1" style="width: <?php echo $visits_width; ?>%;"></span>

          </span>

          <div class="wpdev-text-xs wpdev-text-gray-600 wpdev-align-middle">

            <?php echo number_format($visits_count); ?>
            /
            <?php echo $visit_limitations->get_limit() == 0 ? __('Unlimited', 'wpdev') : number_format((int) $visit_limitations->get_limit()); ?>

          </div>

        </li>

      <?php endif; ?>

    </ul>

  </div>

</div>
