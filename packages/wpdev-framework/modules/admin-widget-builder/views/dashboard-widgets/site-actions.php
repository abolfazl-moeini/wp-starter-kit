<?php
/**
 * Site Actions
 *
 * @since 2.0.0
 */
?>
<div class="wpdev-styling <?php echo esc_attr($className); ?>">

  <div class="<?php echo wpdev_env_picker('', 'wpdev-widget-inset'); ?>">

    <!-- Title Element -->
    <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100'); ?>">

      <?php if (true) : ?>

        <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

          <?php echo __('Actions', 'wpdev'); ?>

        </h3>

      <?php endif; ?>

    </div>
    <!-- Title Element - End -->

    <ul class="wpdev-list-none wpdev-m-0 wpdev-p-0">

      <?php foreach ($actions as $action) : ?>

        <li class="wpdev-border-0 wpdev-border-solid wpdev-border-t wpdev-border-gray-200 wpdev-m-0">

          <a
            title="<?php echo esc_attr($action['label']); ?>"
            href="<?php echo esc_attr($action['href']); ?>"
            class="<?php if (isset($action['classes']) && $action['classes']) { echo esc_attr($action['classes']); } // end if; ?> wpdev-px-4 wpdev-py-3 wpdev-inline-block wpdev-no-underline"
          >

            <?php echo $action['label']; ?>

          </a>

        </li>

      <?php endforeach; ?>

    </ul>

    <?php if (!empty($danger_zone_actions)) : ?>

      <!-- Title Element -->
      <div class="wpdev-p-4 wpdev-flex wpdev-items-center <?php echo wpdev_env_picker('', 'wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-200'); ?>">

        <?php if (true) : ?>

          <h3 class="wpdev-m-0 <?php echo wpdev_env_picker('', 'wpdev-widget-title'); ?>">

            <?php echo __('Danger Zone', 'wpdev'); ?>

          </h3>

        <?php endif; ?>

      </div>
      <!-- Title Element - End -->

      <ul class="wpdev-list-none wpdev-m-0 wpdev-p-0">

        <?php foreach ($danger_zone_actions as $action) : ?>

          <li class="wpdev-border-0 wpdev-border-solid wpdev-border-t wpdev-border-gray-200 wpdev-m-0">

            <a
              title="<?php echo esc_attr($action['label']); ?>"
              href="<?php echo esc_attr($action['href']); ?>"
              class="<?php echo esc_attr($action['classes']); ?> wpdev-px-4 wpdev-py-3 wpdev-inline-block wpdev-no-underline"
            >

              <?php echo $action['label']; ?>

            </a>

          </li>

        <?php endforeach; ?>

      </ul>

    <?php endif; ?>

  </div>

</div>
